import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { PressAngles } from "./pose-geometry";
import type {
  ArmIsolationExerciseId,
  ArmIsolationPhase,
} from "./arm-isolation-repetition";

type ActiveArmIsolationRep = {
  startedAt: number;
  minimumElbowAngle: number;
  minimumElbowAngleAt: number;
  maximumElbowAngle: number;
  maximumElbowAngleAt: number;
  minimumShoulderAngle: number;
  maximumShoulderAngle: number;
  maximumTorsoLean: number;
  upperArmDriftAt: number;
  sampleCount: number;
};

export type ArmIsolationCoachState = {
  activeRep: ActiveArmIsolationRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: ArmIsolationPhase;
  previousRepetitionCount: number;
};

function scoreRange(
  activeRep: ActiveArmIsolationRep,
  exerciseId: ArmIsolationExerciseId,
) {
  const isPushdown = exerciseId === "triceps_pushdown";
  const goodMinimum = exerciseId === "biceps_curl" ? 65 : 95;
  const usableMinimum = exerciseId === "biceps_curl" ? 80 : 110;
  const achievedFullRange = isPushdown
    ? activeRep.maximumElbowAngle >= 155
    : activeRep.minimumElbowAngle <= goodMinimum;
  const achievedUsableRange = isPushdown
    ? activeRep.maximumElbowAngle >= 145
    : activeRep.minimumElbowAngle <= usableMinimum;
  const measuredAngle = isPushdown
    ? activeRep.maximumElbowAngle
    : activeRep.minimumElbowAngle;
  const timestampSeconds = isPushdown
    ? activeRep.maximumElbowAngleAt
    : activeRep.minimumElbowAngleAt;

  if (achievedFullRange) {
    return {
      points: 40,
      signal: {
        area: "Range",
        status: "good" as const,
        message: `A complete working range was detected at ${Math.round(measuredAngle)}° elbow angle.`,
        timestampSeconds,
      },
    };
  }

  return {
    points: achievedUsableRange ? 30 : 15,
    signal: {
      area: "Range",
      status: "adjust" as const,
      message: exerciseId === "biceps_curl"
        ? "Curl through a slightly larger comfortable range before returning."
        : "Extend through a slightly larger comfortable range before returning.",
      timestampSeconds,
    },
  };
}

function scoreUpperArmStability(
  shoulderAngleRange: number,
  timestampSeconds: number,
) {
  if (shoulderAngleRange <= 12) {
    return {
      points: 35,
      signal: {
        area: "Upper-arm stability",
        status: "good" as const,
        message: "The upper arm stayed stable through the working range and return.",
        timestampSeconds,
      },
    };
  }

  return {
    points: shoulderAngleRange <= 20 ? 25 : 12,
    signal: {
      area: "Upper-arm stability",
      status: "adjust" as const,
      message: "Keep the upper arm steadier as the forearm moves through the repetition.",
      timestampSeconds,
    },
  };
}

function scoreTempo(durationSeconds: number, timestampSeconds: number) {
  const good = durationSeconds >= 1.5 && durationSeconds <= 5.5;
  return {
    points: good ? 25 : durationSeconds >= 1 && durationSeconds <= 7 ? 18 : 10,
    signal: {
      area: "Tempo",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? `Controlled ${durationSeconds.toFixed(1)}-second repetition.`
        : durationSeconds < 1.5
          ? "Slow the repetition so the working phase and return stay controlled."
          : "Keep the working phase and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveArmIsolationRep,
  angles: PressAngles,
  timestampSeconds: number,
): ActiveArmIsolationRep {
  const reachedLowerElbow = angles.elbow < activeRep.minimumElbowAngle;
  const reachedHigherElbow = angles.elbow > activeRep.maximumElbowAngle;
  const reachedNewShoulderExtreme =
    angles.shoulder < activeRep.minimumShoulderAngle ||
    angles.shoulder > activeRep.maximumShoulderAngle;

  return {
    ...activeRep,
    minimumElbowAngle: Math.min(activeRep.minimumElbowAngle, angles.elbow),
    minimumElbowAngleAt: reachedLowerElbow
      ? timestampSeconds
      : activeRep.minimumElbowAngleAt,
    maximumElbowAngle: Math.max(activeRep.maximumElbowAngle, angles.elbow),
    maximumElbowAngleAt: reachedHigherElbow
      ? timestampSeconds
      : activeRep.maximumElbowAngleAt,
    minimumShoulderAngle: Math.min(
      activeRep.minimumShoulderAngle,
      angles.shoulder,
    ),
    maximumShoulderAngle: Math.max(
      activeRep.maximumShoulderAngle,
      angles.shoulder,
    ),
    maximumTorsoLean: Math.max(activeRep.maximumTorsoLean, angles.torsoLean),
    upperArmDriftAt: reachedNewShoulderExtreme
      ? timestampSeconds
      : activeRep.upperArmDriftAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateArmIsolationRep(
  activeRep: ActiveArmIsolationRep,
  repetition: number,
  completedAt: number,
  exerciseId: ArmIsolationExerciseId,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const shoulderAngleRange = Math.max(
    0,
    activeRep.maximumShoulderAngle - activeRep.minimumShoulderAngle,
  );
  const range = scoreRange(activeRep, exerciseId);
  const stability = scoreUpperArmStability(
    shoulderAngleRange,
    activeRep.upperArmDriftAt,
  );
  const tempo = scoreTempo(durationSeconds, midpoint);
  const signals: FormCoachingSignal[] = [
    range.signal,
    stability.signal,
    tempo.signal,
  ];
  const score = range.points + stability.points + tempo.points;

  return {
    repetition,
    score,
    rating: score >= 85 ? "Strong" : score >= 70 ? "Good" : "Needs attention",
    minimumKneeAngle: 0,
    minimumHipAngle: 0,
    maximumTorsoLean: activeRep.maximumTorsoLean,
    minimumElbowAngle: activeRep.minimumElbowAngle,
    maximumElbowAngle: activeRep.maximumElbowAngle,
    minimumShoulderAngle: activeRep.minimumShoulderAngle,
    shoulderAngleRange,
    durationSeconds,
    sampleCount: activeRep.sampleCount,
    startedAtSeconds: activeRep.startedAt,
    completedAtSeconds: completedAt,
    reviewAtSeconds:
      signals.find((signal) => signal.status === "adjust")?.timestampSeconds ??
      range.signal.timestampSeconds,
    signals,
  };
}

export function createArmIsolationCoach(): ArmIsolationCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateArmIsolationCoach(
  state: ArmIsolationCoachState,
  phase: ArmIsolationPhase,
  repetitionCount: number,
  angles: PressAngles,
  timestampSeconds: number,
  exerciseId: ArmIsolationExerciseId,
): ArmIsolationCoachState {
  const beganRep = state.previousPhase === "start" && phase === "working";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumElbowAngle: angles.elbow,
      minimumElbowAngleAt: timestampSeconds,
      maximumElbowAngle: angles.elbow,
      maximumElbowAngleAt: timestampSeconds,
      minimumShoulderAngle: angles.shoulder,
      maximumShoulderAngle: angles.shoulder,
      maximumTorsoLean: angles.torsoLean,
      upperArmDriftAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateArmIsolationRep(
        activeRep,
        repetitionCount,
        timestampSeconds,
        exerciseId,
      ),
    ];
    activeRep = null;
  } else if (
    activeRep &&
    phase === "start" &&
    state.previousPhase !== "start"
  ) {
    activeRep = null;
  }

  return {
    activeRep,
    completedReps,
    previousPhase: phase,
    previousRepetitionCount: repetitionCount,
  };
}

export function getLiveArmIsolationCue(
  phase: ArmIsolationPhase,
  exerciseId: ArmIsolationExerciseId,
) {
  const isCurl = exerciseId === "biceps_curl";
  const isPushdown = exerciseId === "triceps_pushdown";

  switch (phase) {
    case "find-start":
      return isPushdown
        ? "Begin with the working elbow bent so tracking can establish the start."
        : "Begin with the working arm extended so tracking can establish the start.";
    case "start":
      return isCurl
        ? "Ready—curl the forearm while keeping the upper arm steady."
        : "Ready—extend the elbow while keeping the upper arm steady.";
    case "working":
      return "Keep the upper arm steady as the elbow moves through the working range.";
    case "peak":
      return "Working range detected—return to the start position with control.";
    case "returning":
      return isPushdown
        ? "Finish with the elbow bent at the start position to complete the rep."
        : "Finish with the arm extended to complete the rep.";
  }
}
