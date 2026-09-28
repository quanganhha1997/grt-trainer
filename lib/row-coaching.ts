import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { FormCheckExerciseId } from "./form-check-exercises";
import type { PressAngles } from "./pose-geometry";
import type { RowPhase } from "./row-repetition";

export type RowExerciseId = Extract<
  FormCheckExerciseId,
  "chest_supported_row" | "bent_over_row" | "single_arm_dumbbell_row"
>;

type ActiveRowRep = {
  startedAt: number;
  minimumElbowAngle: number;
  minimumElbowAngleAt: number;
  minimumShoulderAngle: number;
  minimumTorsoLean: number;
  maximumTorsoLean: number;
  torsoDriftAt: number;
  sampleCount: number;
};

export type RowCoachState = {
  activeRep: ActiveRowRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: RowPhase;
  previousRepetitionCount: number;
};

function scoreRange(minimumElbowAngle: number, timestampSeconds: number) {
  if (minimumElbowAngle <= 105) {
    return {
      points: 40,
      signal: {
        area: "Range",
        status: "good" as const,
        message: `A complete pulling range was detected at ${Math.round(minimumElbowAngle)}° elbow flexion.`,
        timestampSeconds,
      },
    };
  }

  return {
    points: minimumElbowAngle <= 120 ? 30 : 15,
    signal: {
      area: "Range",
      status: "adjust" as const,
      message: "Pull through a slightly larger comfortable range before returning.",
      timestampSeconds,
    },
  };
}

function scoreTorsoStability(
  torsoLeanRange: number,
  timestampSeconds: number,
  exerciseId: RowExerciseId,
) {
  const goodThreshold = exerciseId === "single_arm_dumbbell_row" ? 12 : 8;
  const usableThreshold = exerciseId === "single_arm_dumbbell_row" ? 18 : 14;

  if (torsoLeanRange <= goodThreshold) {
    return {
      points: 35,
      signal: {
        area: "Torso stability",
        status: "good" as const,
        message: "Torso position stayed stable through the pull and return.",
        timestampSeconds,
      },
    };
  }

  return {
    points: torsoLeanRange <= usableThreshold ? 25 : 12,
    signal: {
      area: "Torso stability",
      status: "adjust" as const,
      message: "Reduce torso movement as the weight is pulled and returned.",
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
          ? "Slow the repetition so the pull and return stay controlled."
          : "Keep the pull and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveRowRep,
  angles: PressAngles,
  timestampSeconds: number,
): ActiveRowRep {
  const reachedDeeperPosition = angles.elbow < activeRep.minimumElbowAngle;
  const reachedNewTorsoExtreme =
    angles.torsoLean < activeRep.minimumTorsoLean ||
    angles.torsoLean > activeRep.maximumTorsoLean;

  return {
    ...activeRep,
    minimumElbowAngle: Math.min(activeRep.minimumElbowAngle, angles.elbow),
    minimumElbowAngleAt: reachedDeeperPosition
      ? timestampSeconds
      : activeRep.minimumElbowAngleAt,
    minimumShoulderAngle: Math.min(activeRep.minimumShoulderAngle, angles.shoulder),
    minimumTorsoLean: Math.min(activeRep.minimumTorsoLean, angles.torsoLean),
    maximumTorsoLean: Math.max(activeRep.maximumTorsoLean, angles.torsoLean),
    torsoDriftAt: reachedNewTorsoExtreme
      ? timestampSeconds
      : activeRep.torsoDriftAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateRowRep(
  activeRep: ActiveRowRep,
  repetition: number,
  completedAt: number,
  exerciseId: RowExerciseId,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const torsoLeanRange = Math.max(
    0,
    activeRep.maximumTorsoLean - activeRep.minimumTorsoLean,
  );
  const range = scoreRange(
    activeRep.minimumElbowAngle,
    activeRep.minimumElbowAngleAt,
  );
  const torso = scoreTorsoStability(
    torsoLeanRange,
    activeRep.torsoDriftAt,
    exerciseId,
  );
  const tempo = scoreTempo(durationSeconds, midpoint);
  const signals: FormCoachingSignal[] = [range.signal, torso.signal, tempo.signal];
  const score = range.points + torso.points + tempo.points;

  return {
    repetition,
    score,
    rating: score >= 85 ? "Strong" : score >= 70 ? "Good" : "Needs attention",
    minimumKneeAngle: 0,
    minimumHipAngle: 0,
    maximumTorsoLean: activeRep.maximumTorsoLean,
    minimumElbowAngle: activeRep.minimumElbowAngle,
    minimumShoulderAngle: activeRep.minimumShoulderAngle,
    torsoLeanRange,
    durationSeconds,
    sampleCount: activeRep.sampleCount,
    startedAtSeconds: activeRep.startedAt,
    completedAtSeconds: completedAt,
    reviewAtSeconds:
      signals.find((signal) => signal.status === "adjust")?.timestampSeconds ??
      activeRep.minimumElbowAngleAt,
    signals,
  };
}

export function createRowCoach(): RowCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateRowCoach(
  state: RowCoachState,
  phase: RowPhase,
  repetitionCount: number,
  angles: PressAngles,
  timestampSeconds: number,
  exerciseId: RowExerciseId,
): RowCoachState {
  const beganRep = state.previousPhase === "extended" && phase === "pulling";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumElbowAngle: angles.elbow,
      minimumElbowAngleAt: timestampSeconds,
      minimumShoulderAngle: angles.shoulder,
      minimumTorsoLean: angles.torsoLean,
      maximumTorsoLean: angles.torsoLean,
      torsoDriftAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateRowRep(activeRep, repetitionCount, timestampSeconds, exerciseId),
    ];
    activeRep = null;
  } else if (
    activeRep &&
    phase === "extended" &&
    state.previousPhase !== "extended"
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

export function getLiveRowCue(phase: RowPhase) {
  switch (phase) {
    case "find-start":
      return "Begin with the working arm extended so tracking can establish the start.";
    case "extended":
      return "Ready—pull the weight with a steady torso.";
    case "pulling":
      return "Keep the torso steady as the elbow bends.";
    case "contracted":
      return "Pull detected—return the weight with control.";
    case "returning":
      return "Finish with the arm extended to complete the rep.";
  }
}
