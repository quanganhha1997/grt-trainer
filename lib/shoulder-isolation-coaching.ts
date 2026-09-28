import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { PressAngles } from "./pose-geometry";
import type {
  ShoulderIsolationPhase,
} from "./shoulder-isolation-repetition";

type ActiveShoulderIsolationRep = {
  startedAt: number;
  minimumShoulderAngle: number;
  maximumShoulderAngle: number;
  maximumShoulderAngleAt: number;
  minimumElbowAngle: number;
  maximumElbowAngle: number;
  elbowDriftAt: number;
  sampleCount: number;
};

export type ShoulderIsolationCoachState = {
  activeRep: ActiveShoulderIsolationRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: ShoulderIsolationPhase;
  previousRepetitionCount: number;
};

function scoreRange(activeRep: ActiveShoulderIsolationRep) {
  const shoulderAngleRange = Math.max(
    0,
    activeRep.maximumShoulderAngle - activeRep.minimumShoulderAngle,
  );
  const good = shoulderAngleRange >= 55;
  const usable = shoulderAngleRange >= 35;

  return {
    points: good ? 45 : usable ? 34 : 17,
    shoulderAngleRange,
    signal: {
      area: "Range",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? `A ${Math.round(shoulderAngleRange)}° shoulder-angle change was detected.`
        : "Raise the arm through a slightly larger comfortable range before returning.",
      timestampSeconds: activeRep.maximumShoulderAngleAt,
    },
  };
}

function scoreElbowStability(activeRep: ActiveShoulderIsolationRep) {
  const elbowAngleRange = Math.max(
    0,
    activeRep.maximumElbowAngle - activeRep.minimumElbowAngle,
  );
  const good = elbowAngleRange <= 15;

  return {
    points: good ? 30 : elbowAngleRange <= 25 ? 22 : 10,
    elbowAngleRange,
    signal: {
      area: "Elbow stability",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? "The elbow position stayed consistent through the raise and return."
        : "Keep the elbow bend more consistent while the arm rises and lowers.",
      timestampSeconds: activeRep.elbowDriftAt,
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
          ? "Slow the raise and return so both phases stay controlled."
          : "Keep the raise and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveShoulderIsolationRep,
  angles: PressAngles,
  timestampSeconds: number,
): ActiveShoulderIsolationRep {
  const reachedHigherShoulder = angles.shoulder > activeRep.maximumShoulderAngle;
  const reachedNewElbowExtreme =
    angles.elbow < activeRep.minimumElbowAngle ||
    angles.elbow > activeRep.maximumElbowAngle;

  return {
    ...activeRep,
    minimumShoulderAngle: Math.min(activeRep.minimumShoulderAngle, angles.shoulder),
    maximumShoulderAngle: Math.max(activeRep.maximumShoulderAngle, angles.shoulder),
    maximumShoulderAngleAt: reachedHigherShoulder
      ? timestampSeconds
      : activeRep.maximumShoulderAngleAt,
    minimumElbowAngle: Math.min(activeRep.minimumElbowAngle, angles.elbow),
    maximumElbowAngle: Math.max(activeRep.maximumElbowAngle, angles.elbow),
    elbowDriftAt: reachedNewElbowExtreme
      ? timestampSeconds
      : activeRep.elbowDriftAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateShoulderIsolationRep(
  activeRep: ActiveShoulderIsolationRep,
  repetition: number,
  completedAt: number,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const range = scoreRange(activeRep);
  const stability = scoreElbowStability(activeRep);
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
    maximumTorsoLean: 0,
    minimumElbowAngle: activeRep.minimumElbowAngle,
    maximumElbowAngle: activeRep.maximumElbowAngle,
    minimumShoulderAngle: activeRep.minimumShoulderAngle,
    shoulderAngleRange: range.shoulderAngleRange,
    bodyPositionRange: stability.elbowAngleRange,
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

export function createShoulderIsolationCoach(): ShoulderIsolationCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateShoulderIsolationCoach(
  state: ShoulderIsolationCoachState,
  phase: ShoulderIsolationPhase,
  repetitionCount: number,
  angles: PressAngles,
  timestampSeconds: number,
): ShoulderIsolationCoachState {
  const beganRep = state.previousPhase === "start" && phase === "working";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumShoulderAngle: angles.shoulder,
      maximumShoulderAngle: angles.shoulder,
      maximumShoulderAngleAt: timestampSeconds,
      minimumElbowAngle: angles.elbow,
      maximumElbowAngle: angles.elbow,
      elbowDriftAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateShoulderIsolationRep(
        activeRep,
        repetitionCount,
        timestampSeconds,
      ),
    ];
    activeRep = null;
  } else if (activeRep && phase === "start" && state.previousPhase !== "start") {
    activeRep = null;
  }

  return {
    activeRep,
    completedReps,
    previousPhase: phase,
    previousRepetitionCount: repetitionCount,
  };
}

export function getLiveShoulderIsolationCue(phase: ShoulderIsolationPhase) {
  switch (phase) {
    case "find-start":
      return "Begin with the working arm lowered so tracking can establish the start.";
    case "start":
      return "Ready—raise the arm while keeping the elbow position consistent.";
    case "working":
      return "Keep the elbow steady as the arm rises through the working range.";
    case "peak":
      return "Top range detected—lower the arm to the start with control.";
    case "returning":
      return "Finish with the arm lowered to complete the repetition.";
  }
}
