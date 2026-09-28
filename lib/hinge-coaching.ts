import type { FormRepAnalysis, FormCoachingSignal } from "./form-analysis";
import type { FormCheckExerciseId } from "./form-check-exercises";
import type { SquatAngles } from "./pose-geometry";
import type { HingePhase } from "./hinge-repetition";

type HingeExerciseId = Extract<FormCheckExerciseId, "deadlift" | "romanian_deadlift">;

type ActiveHingeRep = {
  startedAt: number;
  minimumKneeAngle: number;
  minimumKneeAngleAt: number;
  minimumHipAngle: number;
  minimumHipAngleAt: number;
  maximumTorsoLean: number;
  sampleCount: number;
};

export type HingeCoachState = {
  activeRep: ActiveHingeRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: HingePhase;
  previousRepetitionCount: number;
};

function scoreRange(
  minimumHipAngle: number,
  timestampSeconds: number,
  exerciseId: HingeExerciseId,
): { points: number; signal: FormCoachingSignal } {
  const target = exerciseId === "romanian_deadlift" ? 115 : 105;
  const acceptable = exerciseId === "romanian_deadlift" ? 125 : 115;

  if (minimumHipAngle <= target) {
    return {
      points: 40,
      signal: {
        area: "Range",
        status: "good",
        message: `A clear hip hinge was detected at ${Math.round(minimumHipAngle)}° hip flexion.`,
        timestampSeconds,
      },
    };
  }

  return {
    points: minimumHipAngle <= acceptable ? 30 : 15,
    signal: {
      area: "Range",
      status: "adjust",
      message: "Send the hips farther back while keeping the movement controlled.",
      timestampSeconds,
    },
  };
}

function scoreKneePattern(
  minimumKneeAngle: number,
  timestampSeconds: number,
  exerciseId: HingeExerciseId,
): { points: number; signal: FormCoachingSignal } {
  const isRdl = exerciseId === "romanian_deadlift";
  const isGood = isRdl
    ? minimumKneeAngle >= 125
    : minimumKneeAngle >= 85 && minimumKneeAngle <= 145;

  if (isGood) {
    return {
      points: 35,
      signal: {
        area: "Knee bend",
        status: "good",
        message: isRdl
          ? "Knees stayed softly bent while the hips moved back."
          : "Knee bend and hip movement stayed balanced.",
        timestampSeconds,
      },
    };
  }

  return {
    points: 18,
    signal: {
      area: "Knee bend",
      status: "adjust",
      message: isRdl
        ? "Keep only a soft knee bend so the movement stays hip-led."
        : minimumKneeAngle > 145
          ? "Let the knees bend as the hips travel back toward the weight."
          : "Use less knee bend so the hips remain part of the movement.",
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
          ? "Slow the repetition so the hinge and return stay controlled."
          : "Keep the hinge and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveHingeRep,
  angles: SquatAngles,
  timestampSeconds: number,
): ActiveHingeRep {
  return {
    ...activeRep,
    minimumKneeAngle: Math.min(activeRep.minimumKneeAngle, angles.knee),
    minimumKneeAngleAt:
      angles.knee < activeRep.minimumKneeAngle
        ? timestampSeconds
        : activeRep.minimumKneeAngleAt,
    minimumHipAngle: Math.min(activeRep.minimumHipAngle, angles.hip),
    minimumHipAngleAt:
      angles.hip < activeRep.minimumHipAngle
        ? timestampSeconds
        : activeRep.minimumHipAngleAt,
    maximumTorsoLean: Math.max(activeRep.maximumTorsoLean, angles.torsoLean),
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateHingeRep(
  activeRep: ActiveHingeRep,
  repetition: number,
  completedAt: number,
  exerciseId: HingeExerciseId,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const range = scoreRange(activeRep.minimumHipAngle, activeRep.minimumHipAngleAt, exerciseId);
  const knee = scoreKneePattern(activeRep.minimumKneeAngle, activeRep.minimumKneeAngleAt, exerciseId);
  const tempo = scoreTempo(durationSeconds, midpoint);
  const signals = [range.signal, knee.signal, tempo.signal];
  const score = range.points + knee.points + tempo.points;

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
      activeRep.minimumHipAngleAt,
    signals,
  };
}

export function createHingeCoach(): HingeCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateHingeCoach(
  state: HingeCoachState,
  phase: HingePhase,
  repetitionCount: number,
  angles: SquatAngles,
  timestampSeconds: number,
  exerciseId: HingeExerciseId,
): HingeCoachState {
  const beganRep = state.previousPhase === "standing" && phase === "hinging";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumKneeAngle: angles.knee,
      minimumKneeAngleAt: timestampSeconds,
      minimumHipAngle: angles.hip,
      minimumHipAngleAt: timestampSeconds,
      maximumTorsoLean: angles.torsoLean,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateHingeRep(activeRep, repetitionCount, timestampSeconds, exerciseId),
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

export function getLiveHingeCue(
  phase: HingePhase,
  angles: SquatAngles,
  exerciseId: HingeExerciseId,
) {
  if (exerciseId === "romanian_deadlift" && angles.knee < 115) {
    return "Keep a soft knee bend and send the hips back.";
  }

  switch (phase) {
    case "find-start":
      return "Stand tall and hold briefly so tracking can begin.";
    case "standing":
      return "Ready—begin the next repetition by sending the hips back.";
    case "hinging":
      return "Keep the weight close as the hips travel back.";
    case "bottom":
      return "Range detected—stand by driving the hips forward.";
    case "rising":
      return "Finish tall to complete the repetition.";
  }
}
