import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { SquatAngles } from "./pose-geometry";
import type {
  KneeIsolationExerciseId,
  KneeIsolationPhase,
} from "./knee-isolation-repetition";

type ActiveKneeIsolationRep = {
  startedAt: number;
  minimumKneeAngle: number;
  minimumKneeAngleAt: number;
  maximumKneeAngle: number;
  maximumKneeAngleAt: number;
  minimumHipAngle: number;
  maximumHipAngle: number;
  maximumTorsoLean: number;
  thighDriftAt: number;
  sampleCount: number;
};

export type KneeIsolationCoachState = {
  activeRep: ActiveKneeIsolationRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: KneeIsolationPhase;
  previousRepetitionCount: number;
};

function scoreRange(
  activeRep: ActiveKneeIsolationRep,
  exerciseId: KneeIsolationExerciseId,
) {
  const isExtension = exerciseId === "leg_extension";
  const achievedFullRange = isExtension
    ? activeRep.maximumKneeAngle >= 155
    : activeRep.minimumKneeAngle <= 105;
  const achievedUsableRange = isExtension
    ? activeRep.maximumKneeAngle >= 145
    : activeRep.minimumKneeAngle <= 120;
  const measuredAngle = isExtension
    ? activeRep.maximumKneeAngle
    : activeRep.minimumKneeAngle;
  const timestampSeconds = isExtension
    ? activeRep.maximumKneeAngleAt
    : activeRep.minimumKneeAngleAt;

  if (achievedFullRange) {
    return {
      points: 40,
      signal: {
        area: "Range",
        status: "good" as const,
        message: `A complete working range was detected at ${Math.round(measuredAngle)}° knee angle.`,
        timestampSeconds,
      },
    };
  }

  return {
    points: achievedUsableRange ? 30 : 15,
    signal: {
      area: "Range",
      status: "adjust" as const,
      message: isExtension
        ? "Extend through a slightly larger comfortable range before returning."
        : "Curl through a slightly larger comfortable range before returning.",
      timestampSeconds,
    },
  };
}

function scoreThighStability(
  hipAngleRange: number,
  timestampSeconds: number,
) {
  if (hipAngleRange <= 10) {
    return {
      points: 35,
      signal: {
        area: "Thigh stability",
        status: "good" as const,
        message: "The thigh stayed stable through the working range and return.",
        timestampSeconds,
      },
    };
  }

  return {
    points: hipAngleRange <= 17 ? 25 : 12,
    signal: {
      area: "Thigh stability",
      status: "adjust" as const,
      message: "Keep the thigh steadier as the lower leg moves through the repetition.",
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
  activeRep: ActiveKneeIsolationRep,
  angles: SquatAngles,
  timestampSeconds: number,
): ActiveKneeIsolationRep {
  const reachedLowerKnee = angles.knee < activeRep.minimumKneeAngle;
  const reachedHigherKnee = angles.knee > activeRep.maximumKneeAngle;
  const reachedNewHipExtreme =
    angles.hip < activeRep.minimumHipAngle ||
    angles.hip > activeRep.maximumHipAngle;

  return {
    ...activeRep,
    minimumKneeAngle: Math.min(activeRep.minimumKneeAngle, angles.knee),
    minimumKneeAngleAt: reachedLowerKnee
      ? timestampSeconds
      : activeRep.minimumKneeAngleAt,
    maximumKneeAngle: Math.max(activeRep.maximumKneeAngle, angles.knee),
    maximumKneeAngleAt: reachedHigherKnee
      ? timestampSeconds
      : activeRep.maximumKneeAngleAt,
    minimumHipAngle: Math.min(activeRep.minimumHipAngle, angles.hip),
    maximumHipAngle: Math.max(activeRep.maximumHipAngle, angles.hip),
    maximumTorsoLean: Math.max(activeRep.maximumTorsoLean, angles.torsoLean),
    thighDriftAt: reachedNewHipExtreme
      ? timestampSeconds
      : activeRep.thighDriftAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateKneeIsolationRep(
  activeRep: ActiveKneeIsolationRep,
  repetition: number,
  completedAt: number,
  exerciseId: KneeIsolationExerciseId,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const hipAngleRange = Math.max(
    0,
    activeRep.maximumHipAngle - activeRep.minimumHipAngle,
  );
  const range = scoreRange(activeRep, exerciseId);
  const stability = scoreThighStability(
    hipAngleRange,
    activeRep.thighDriftAt,
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
    minimumKneeAngle: activeRep.minimumKneeAngle,
    maximumKneeAngle: activeRep.maximumKneeAngle,
    minimumHipAngle: activeRep.minimumHipAngle,
    hipAngleRange,
    maximumTorsoLean: activeRep.maximumTorsoLean,
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

export function createKneeIsolationCoach(): KneeIsolationCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateKneeIsolationCoach(
  state: KneeIsolationCoachState,
  phase: KneeIsolationPhase,
  repetitionCount: number,
  angles: SquatAngles,
  timestampSeconds: number,
  exerciseId: KneeIsolationExerciseId,
): KneeIsolationCoachState {
  const beganRep = state.previousPhase === "start" && phase === "working";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumKneeAngle: angles.knee,
      minimumKneeAngleAt: timestampSeconds,
      maximumKneeAngle: angles.knee,
      maximumKneeAngleAt: timestampSeconds,
      minimumHipAngle: angles.hip,
      maximumHipAngle: angles.hip,
      maximumTorsoLean: angles.torsoLean,
      thighDriftAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateKneeIsolationRep(
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

export function getLiveKneeIsolationCue(
  phase: KneeIsolationPhase,
  exerciseId: KneeIsolationExerciseId,
) {
  const isExtension = exerciseId === "leg_extension";

  switch (phase) {
    case "find-start":
      return isExtension
        ? "Begin with the working knee bent so tracking can establish the start."
        : "Begin with the working leg extended so tracking can establish the start.";
    case "start":
      return isExtension
        ? "Ready—extend the knee while keeping the thigh steady."
        : "Ready—curl the lower leg while keeping the thigh steady.";
    case "working":
      return "Keep the thigh steady as the knee moves through the working range.";
    case "peak":
      return isExtension
        ? "Extension detected—return to the bent-knee start with control."
        : "Curl detected—return to the extended start with control.";
    case "returning":
      return isExtension
        ? "Finish at the bent-knee start to complete the rep."
        : "Finish with the leg extended to complete the rep.";
  }
}
