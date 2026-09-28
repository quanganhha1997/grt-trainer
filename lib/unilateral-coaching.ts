import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { FormCheckExerciseId } from "./form-check-exercises";
import type { SquatAngles } from "./pose-geometry";
import type { UnilateralPhase } from "./unilateral-repetition";

type UnilateralExerciseId = Extract<
  FormCheckExerciseId,
  "bulgarian_split_squat" | "lunge"
>;

type ActiveUnilateralRep = {
  startedAt: number;
  minimumKneeAngle: number;
  minimumKneeAngleAt: number;
  minimumHipAngle: number;
  maximumTorsoLean: number;
  maximumTorsoLeanAt: number;
  sampleCount: number;
};

export type UnilateralCoachState = {
  activeRep: ActiveUnilateralRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: UnilateralPhase;
  previousRepetitionCount: number;
};

function scoreRange(
  minimumKneeAngle: number,
  timestampSeconds: number,
  exerciseId: UnilateralExerciseId,
): { points: number; signal: FormCoachingSignal } {
  const target = exerciseId === "bulgarian_split_squat" ? 105 : 110;

  if (minimumKneeAngle <= target) {
    return {
      points: 40,
      signal: {
        area: "Range",
        status: "good",
        message: `A clear single-leg range was detected at ${Math.round(minimumKneeAngle)}° knee flexion.`,
        timestampSeconds,
      },
    };
  }

  return {
    points: minimumKneeAngle <= 112 ? 30 : 15,
    signal: {
      area: "Range",
      status: "adjust",
      message: "Use a slightly larger comfortable range before returning to the start.",
      timestampSeconds,
    },
  };
}

function scoreTorso(maximumTorsoLean: number, timestampSeconds: number) {
  if (maximumTorsoLean <= 32) {
    return {
      points: 35,
      signal: {
        area: "Torso",
        status: "good" as const,
        message: "Torso position stayed controlled through the repetition.",
        timestampSeconds,
      },
    };
  }

  return {
    points: maximumTorsoLean <= 42 ? 25 : 12,
    signal: {
      area: "Torso",
      status: "adjust" as const,
      message: "Brace before descending and reduce the forward torso drift.",
      timestampSeconds,
    },
  };
}

function scoreTempo(durationSeconds: number, timestampSeconds: number) {
  const good = durationSeconds >= 1.5 && durationSeconds <= 5;
  return {
    points: good ? 25 : durationSeconds >= 1 && durationSeconds <= 6.5 ? 18 : 10,
    signal: {
      area: "Tempo",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? `Controlled ${durationSeconds.toFixed(1)}-second repetition.`
        : durationSeconds < 1.5
          ? "Slow the repetition so the descent and return stay controlled."
          : "Keep the descent and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveUnilateralRep,
  angles: SquatAngles,
  timestampSeconds: number,
): ActiveUnilateralRep {
  return {
    ...activeRep,
    minimumKneeAngle: Math.min(activeRep.minimumKneeAngle, angles.knee),
    minimumKneeAngleAt:
      angles.knee < activeRep.minimumKneeAngle
        ? timestampSeconds
        : activeRep.minimumKneeAngleAt,
    minimumHipAngle: Math.min(activeRep.minimumHipAngle, angles.hip),
    maximumTorsoLean: Math.max(activeRep.maximumTorsoLean, angles.torsoLean),
    maximumTorsoLeanAt:
      angles.torsoLean > activeRep.maximumTorsoLean
        ? timestampSeconds
        : activeRep.maximumTorsoLeanAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateUnilateralRep(
  activeRep: ActiveUnilateralRep,
  repetition: number,
  completedAt: number,
  exerciseId: UnilateralExerciseId,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const range = scoreRange(
    activeRep.minimumKneeAngle,
    activeRep.minimumKneeAngleAt,
    exerciseId,
  );
  const torso = scoreTorso(
    activeRep.maximumTorsoLean,
    activeRep.maximumTorsoLeanAt,
  );
  const tempo = scoreTempo(durationSeconds, midpoint);
  const signals = [range.signal, torso.signal, tempo.signal];
  const score = range.points + torso.points + tempo.points;

  return {
    repetition,
    score,
    rating: score >= 85 ? "Strong" : score >= 70 ? "Good" : "Needs attention",
    minimumKneeAngle: activeRep.minimumKneeAngle,
    minimumHipAngle: activeRep.minimumHipAngle,
    maximumTorsoLean: activeRep.maximumTorsoLean,
    durationSeconds,
    sampleCount: activeRep.sampleCount,
    startedAtSeconds: activeRep.startedAt,
    completedAtSeconds: completedAt,
    reviewAtSeconds:
      signals.find((signal) => signal.status === "adjust")?.timestampSeconds ??
      activeRep.minimumKneeAngleAt,
    signals,
  };
}

export function createUnilateralCoach(): UnilateralCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateUnilateralCoach(
  state: UnilateralCoachState,
  phase: UnilateralPhase,
  repetitionCount: number,
  angles: SquatAngles,
  timestampSeconds: number,
  exerciseId: UnilateralExerciseId,
): UnilateralCoachState {
  const beganRep = state.previousPhase === "standing" && phase === "descending";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumKneeAngle: angles.knee,
      minimumKneeAngleAt: timestampSeconds,
      minimumHipAngle: angles.hip,
      maximumTorsoLean: angles.torsoLean,
      maximumTorsoLeanAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateUnilateralRep(activeRep, repetitionCount, timestampSeconds, exerciseId),
    ];
    activeRep = null;
  } else if (activeRep && phase === "standing" && state.previousPhase !== "standing") {
    activeRep = null;
  }

  return {
    activeRep,
    completedReps,
    previousPhase: phase,
    previousRepetitionCount: repetitionCount,
  };
}

export function getLiveUnilateralCue(
  phase: UnilateralPhase,
  angles: SquatAngles,
) {
  if (angles.torsoLean > 42) return "Brace before descending and reduce forward drift.";

  switch (phase) {
    case "find-start":
      return "Set your stance and hold tall so tracking can begin.";
    case "standing":
      return "Ready—lower with control through the working leg.";
    case "descending":
      return "Keep the front foot planted as you lower.";
    case "bottom":
      return "Range detected—drive through the front foot.";
    case "ascending":
      return "Return to the tall start position to complete the rep.";
  }
}
