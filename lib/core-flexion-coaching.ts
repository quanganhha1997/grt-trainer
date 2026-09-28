import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { SquatAngles } from "./pose-geometry";
import { CORE_FLEXION_PHASE_THRESHOLDS } from "./core-flexion-repetition";
import type {
  CoreFlexionExerciseId,
  CoreFlexionPhase,
} from "./core-flexion-repetition";

type ActiveCoreFlexionRep = {
  startedAt: number;
  minimumHipAngle: number;
  minimumHipAngleAt: number;
  maximumHipAngle: number;
  minimumKneeAngle: number;
  maximumKneeAngle: number;
  minimumTorsoLean: number;
  maximumTorsoLean: number;
  bodyPositionDriftAt: number;
  sampleCount: number;
};

export type CoreFlexionCoachState = {
  activeRep: ActiveCoreFlexionRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: CoreFlexionPhase;
  previousRepetitionCount: number;
};

function scoreRange(
  activeRep: ActiveCoreFlexionRep,
  exerciseId: CoreFlexionExerciseId,
) {
  const target = CORE_FLEXION_PHASE_THRESHOLDS[exerciseId].peak;
  const achievedFullRange = activeRep.minimumHipAngle <= target;
  const achievedUsableRange = activeRep.minimumHipAngle <= target + 15;

  if (achievedFullRange) {
    return {
      points: 45,
      signal: {
        area: "Range",
        status: "good" as const,
        message: `A complete working range was detected at ${Math.round(activeRep.minimumHipAngle)}° hip angle.`,
        timestampSeconds: activeRep.minimumHipAngleAt,
      },
    };
  }

  return {
    points: achievedUsableRange ? 34 : 17,
    signal: {
      area: "Range",
      status: "adjust" as const,
      message: "Move through a slightly larger comfortable range before returning.",
      timestampSeconds: activeRep.minimumHipAngleAt,
    },
  };
}

function scoreBodyStability(
  activeRep: ActiveCoreFlexionRep,
  exerciseId: CoreFlexionExerciseId,
) {
  const bodyPositionRange = exerciseId === "crunch"
    ? activeRep.maximumKneeAngle - activeRep.minimumKneeAngle
    : activeRep.maximumTorsoLean - activeRep.minimumTorsoLean;
  const goodLimit = exerciseId === "crunch" ? 15 : 12;
  const usableLimit = exerciseId === "crunch" ? 25 : 20;
  const good = bodyPositionRange <= goodLimit;

  return {
    points: good ? 30 : bodyPositionRange <= usableLimit ? 22 : 10,
    bodyPositionRange,
    signal: {
      area: "Body stability",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? exerciseId === "crunch"
          ? "The lower body stayed stable through the curl and return."
          : "The torso stayed stable through the working range and return."
        : exerciseId === "crunch"
          ? "Keep the lower body steadier as the torso curls and returns."
          : "Reduce torso movement as the hips move through the repetition.",
      timestampSeconds: activeRep.bodyPositionDriftAt,
    },
  };
}

function scoreTempo(durationSeconds: number, timestampSeconds: number) {
  const good = durationSeconds >= 1.5 && durationSeconds <= 6;

  return {
    points: good ? 25 : durationSeconds >= 1 && durationSeconds <= 8 ? 18 : 10,
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
  activeRep: ActiveCoreFlexionRep,
  angles: SquatAngles,
  timestampSeconds: number,
  exerciseId: CoreFlexionExerciseId,
): ActiveCoreFlexionRep {
  const reachedLowerHip = angles.hip < activeRep.minimumHipAngle;
  const reachedNewStabilityExtreme = exerciseId === "crunch"
    ? angles.knee < activeRep.minimumKneeAngle ||
      angles.knee > activeRep.maximumKneeAngle
    : angles.torsoLean < activeRep.minimumTorsoLean ||
      angles.torsoLean > activeRep.maximumTorsoLean;

  return {
    ...activeRep,
    minimumHipAngle: Math.min(activeRep.minimumHipAngle, angles.hip),
    minimumHipAngleAt: reachedLowerHip
      ? timestampSeconds
      : activeRep.minimumHipAngleAt,
    maximumHipAngle: Math.max(activeRep.maximumHipAngle, angles.hip),
    minimumKneeAngle: Math.min(activeRep.minimumKneeAngle, angles.knee),
    maximumKneeAngle: Math.max(activeRep.maximumKneeAngle, angles.knee),
    minimumTorsoLean: Math.min(activeRep.minimumTorsoLean, angles.torsoLean),
    maximumTorsoLean: Math.max(activeRep.maximumTorsoLean, angles.torsoLean),
    bodyPositionDriftAt: reachedNewStabilityExtreme
      ? timestampSeconds
      : activeRep.bodyPositionDriftAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateCoreFlexionRep(
  activeRep: ActiveCoreFlexionRep,
  repetition: number,
  completedAt: number,
  exerciseId: CoreFlexionExerciseId,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const range = scoreRange(activeRep, exerciseId);
  const stability = scoreBodyStability(activeRep, exerciseId);
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
    maximumHipAngle: activeRep.maximumHipAngle,
    hipAngleRange: Math.max(
      0,
      activeRep.maximumHipAngle - activeRep.minimumHipAngle,
    ),
    maximumTorsoLean: activeRep.maximumTorsoLean,
    torsoLeanRange: Math.max(
      0,
      activeRep.maximumTorsoLean - activeRep.minimumTorsoLean,
    ),
    bodyPositionRange: stability.bodyPositionRange,
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

export function createCoreFlexionCoach(): CoreFlexionCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateCoreFlexionCoach(
  state: CoreFlexionCoachState,
  phase: CoreFlexionPhase,
  repetitionCount: number,
  angles: SquatAngles,
  timestampSeconds: number,
  exerciseId: CoreFlexionExerciseId,
): CoreFlexionCoachState {
  const beganRep = state.previousPhase === "start" && phase === "working";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumHipAngle: angles.hip,
      minimumHipAngleAt: timestampSeconds,
      maximumHipAngle: angles.hip,
      minimumKneeAngle: angles.knee,
      maximumKneeAngle: angles.knee,
      minimumTorsoLean: angles.torsoLean,
      maximumTorsoLean: angles.torsoLean,
      bodyPositionDriftAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(
      activeRep,
      angles,
      timestampSeconds,
      exerciseId,
    );
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateCoreFlexionRep(
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

export function getLiveCoreFlexionCue(
  phase: CoreFlexionPhase,
  exerciseId: CoreFlexionExerciseId,
) {
  const movement = exerciseId === "crunch"
    ? "curl the torso"
    : exerciseId === "reverse_crunch"
      ? "draw the hips toward the torso"
      : "raise the legs";

  switch (phase) {
    case "find-start":
      return "Begin in the instructed extended position so tracking can establish the start.";
    case "start":
      return `Ready—${movement} through a comfortable range.`;
    case "working":
      return exerciseId === "crunch"
        ? "Keep the lower body steady as the torso curls."
        : "Keep the torso steady as the hips move through the working range.";
    case "peak":
      return "Working range detected—return to the start position with control.";
    case "returning":
      return "Finish at the extended start position to complete the rep.";
  }
}
