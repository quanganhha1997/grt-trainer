import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import {
  isDipExerciseId,
  isOverheadPressExerciseId,
  type FormCheckExerciseId,
} from "./form-check-exercises";
import type { PressAngles } from "./pose-geometry";
import type { PressPhase } from "./press-repetition";

type PressExerciseId = Extract<
  FormCheckExerciseId,
  | "flat_bench_press"
  | "incline_bench_press"
  | "barbell_overhead_press"
  | "dumbbell_shoulder_press"
  | "triceps_dip"
>;

type ActivePressRep = {
  startedAt: number;
  minimumElbowAngle: number;
  minimumElbowAngleAt: number;
  minimumShoulderAngle: number;
  wristOffsetAtBottom: number;
  wristOffsetAtBottomAt: number;
  minimumTorsoLean: number;
  maximumTorsoLean: number;
  torsoLeanDriftAt: number;
  sampleCount: number;
};

export type PressCoachState = {
  activeRep: ActivePressRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: PressPhase;
  previousRepetitionCount: number;
};

function scoreRange(
  minimumElbowAngle: number,
  timestampSeconds: number,
  exerciseId: PressExerciseId,
): { points: number; signal: FormCoachingSignal } {
  const target = isOverheadPressExerciseId(exerciseId)
    ? 110
    : isDipExerciseId(exerciseId)
      ? 105
    : exerciseId === "incline_bench_press"
      ? 105
      : 100;

  if (minimumElbowAngle <= target) {
    return {
      points: 40,
      signal: {
        area: "Range",
        status: "good",
        message: isDipExerciseId(exerciseId)
          ? `A controlled dip range was detected at ${Math.round(minimumElbowAngle)}° elbow flexion.`
          : `A controlled pressing range was detected at ${Math.round(minimumElbowAngle)}° elbow flexion.`,
        timestampSeconds,
      },
    };
  }

  return {
    points: minimumElbowAngle <= 115 ? 30 : 15,
    signal: {
      area: "Range",
      status: "adjust",
      message: isDipExerciseId(exerciseId)
        ? "Lower through a slightly larger comfortable elbow range before returning to the top."
        : "Use a slightly larger comfortable range before pressing back up.",
      timestampSeconds,
    },
  };
}

function scoreDipTorsoStability(activeRep: ActivePressRep) {
  const torsoLeanRange = Math.max(
    0,
    activeRep.maximumTorsoLean - activeRep.minimumTorsoLean,
  );
  const good = torsoLeanRange <= 12;

  return {
    points: good ? 35 : torsoLeanRange <= 20 ? 25 : 12,
    torsoLeanRange,
    signal: {
      area: "Torso stability",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? "The torso angle stayed consistent through the lowering and return."
        : "Keep the torso angle more consistent through the lowering and return.",
      timestampSeconds: activeRep.torsoLeanDriftAt,
    },
  };
}

function scoreTorso(
  maximumTorsoLean: number,
  timestampSeconds: number,
  exerciseId: PressExerciseId,
) {
  const goodThreshold = exerciseId === "dumbbell_shoulder_press" ? 18 : 15;
  const usableThreshold = exerciseId === "dumbbell_shoulder_press" ? 25 : 22;

  if (maximumTorsoLean <= goodThreshold) {
    return {
      points: 35,
      signal: {
        area: "Torso",
        status: "good" as const,
        message: "The torso stayed upright through the overhead press.",
        timestampSeconds,
      },
    };
  }

  return {
    points: maximumTorsoLean <= usableThreshold ? 25 : 12,
    signal: {
      area: "Torso",
      status: "adjust" as const,
      message: "Reduce the backward torso lean as the weight moves overhead.",
      timestampSeconds,
    },
  };
}

function scoreWristPosition(
  wristOffsetAtBottom: number,
  timestampSeconds: number,
) {
  if (wristOffsetAtBottom <= 22) {
    return {
      points: 35,
      signal: {
        area: "Wrist position",
        status: "good" as const,
        message: "The wrist stayed closely stacked over the elbow at the bottom.",
        timestampSeconds,
      },
    };
  }

  return {
    points: wristOffsetAtBottom <= 38 ? 25 : 12,
    signal: {
      area: "Wrist position",
      status: "adjust" as const,
      message: "At the bottom, bring the wrist closer over the elbow in the side view.",
      timestampSeconds,
    },
  };
}

function scoreTempo(
  durationSeconds: number,
  timestampSeconds: number,
  exerciseId: PressExerciseId,
) {
  const good = durationSeconds >= 1.5 && durationSeconds <= 5;
  const isDip = isDipExerciseId(exerciseId);
  return {
    points: good ? 25 : durationSeconds >= 1 && durationSeconds <= 6.5 ? 18 : 10,
    signal: {
      area: "Tempo",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? `Controlled ${durationSeconds.toFixed(1)}-second repetition.`
        : durationSeconds < 1.5
          ? isDip
            ? "Slow the repetition so the lowering and return stay controlled."
            : "Slow the repetition so the lowering and press stay controlled."
          : isDip
            ? "Keep the lowering and return moving at a steadier pace."
            : "Keep the lowering and press moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActivePressRep,
  angles: PressAngles,
  timestampSeconds: number,
): ActivePressRep {
  const reachedDeeperPosition = angles.elbow < activeRep.minimumElbowAngle;
  const previousTorsoRange =
    activeRep.maximumTorsoLean - activeRep.minimumTorsoLean;
  const nextMinimumTorsoLean = Math.min(
    activeRep.minimumTorsoLean,
    angles.torsoLean,
  );
  const nextMaximumTorsoLean = Math.max(
    activeRep.maximumTorsoLean,
    angles.torsoLean,
  );
  const nextTorsoRange = nextMaximumTorsoLean - nextMinimumTorsoLean;

  return {
    ...activeRep,
    minimumElbowAngle: Math.min(activeRep.minimumElbowAngle, angles.elbow),
    minimumElbowAngleAt: reachedDeeperPosition
      ? timestampSeconds
      : activeRep.minimumElbowAngleAt,
    minimumShoulderAngle: Math.min(activeRep.minimumShoulderAngle, angles.shoulder),
    wristOffsetAtBottom: reachedDeeperPosition
      ? angles.wristOffset
      : activeRep.wristOffsetAtBottom,
    wristOffsetAtBottomAt: reachedDeeperPosition
      ? timestampSeconds
      : activeRep.wristOffsetAtBottomAt,
    minimumTorsoLean: nextMinimumTorsoLean,
    maximumTorsoLean: nextMaximumTorsoLean,
    torsoLeanDriftAt:
      nextTorsoRange > previousTorsoRange
        ? timestampSeconds
        : activeRep.torsoLeanDriftAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluatePressRep(
  activeRep: ActivePressRep,
  repetition: number,
  completedAt: number,
  exerciseId: PressExerciseId,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const range = scoreRange(
    activeRep.minimumElbowAngle,
    activeRep.minimumElbowAngleAt,
    exerciseId,
  );
  const dipStability = isDipExerciseId(exerciseId)
    ? scoreDipTorsoStability(activeRep)
    : null;
  const alignment = dipStability ?? (isOverheadPressExerciseId(exerciseId)
    ? scoreTorso(
        activeRep.maximumTorsoLean,
        activeRep.torsoLeanDriftAt,
        exerciseId,
      )
    : scoreWristPosition(
        activeRep.wristOffsetAtBottom,
        activeRep.wristOffsetAtBottomAt,
      ));
  const tempo = scoreTempo(durationSeconds, midpoint, exerciseId);
  const signals = [range.signal, alignment.signal, tempo.signal];
  const score = range.points + alignment.points + tempo.points;

  return {
    repetition,
    score,
    rating: score >= 85 ? "Strong" : score >= 70 ? "Good" : "Needs attention",
    minimumKneeAngle: 0,
    minimumHipAngle: 0,
    maximumTorsoLean: activeRep.maximumTorsoLean,
    minimumElbowAngle: activeRep.minimumElbowAngle,
    minimumShoulderAngle: activeRep.minimumShoulderAngle,
    wristOffsetAtBottom: activeRep.wristOffsetAtBottom,
    torsoLeanRange: dipStability?.torsoLeanRange,
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

export function createPressCoach(): PressCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updatePressCoach(
  state: PressCoachState,
  phase: PressPhase,
  repetitionCount: number,
  angles: PressAngles,
  timestampSeconds: number,
  exerciseId: PressExerciseId,
): PressCoachState {
  const beganRep = state.previousPhase === "locked-out" && phase === "lowering";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumElbowAngle: angles.elbow,
      minimumElbowAngleAt: timestampSeconds,
      minimumShoulderAngle: angles.shoulder,
      wristOffsetAtBottom: angles.wristOffset,
      wristOffsetAtBottomAt: timestampSeconds,
      minimumTorsoLean: angles.torsoLean,
      maximumTorsoLean: angles.torsoLean,
      torsoLeanDriftAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluatePressRep(activeRep, repetitionCount, timestampSeconds, exerciseId),
    ];
    activeRep = null;
  } else if (
    activeRep &&
    phase === "locked-out" &&
    state.previousPhase !== "locked-out"
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

export function getLivePressCue(
  phase: PressPhase,
  angles: PressAngles,
  exerciseId: PressExerciseId,
) {
  if (isDipExerciseId(exerciseId)) {
    switch (phase) {
      case "find-start":
        return "Begin with the arms extended so tracking can establish the start.";
      case "locked-out":
        return "Ready—lower with control and keep the torso angle consistent.";
      case "lowering":
        return "Keep the shoulder, elbow, wrist, and hip visible as the elbows bend.";
      case "bottom":
        return "Range detected—return smoothly to the top.";
      case "pressing":
        return "Finish with the arms extended to complete the rep.";
    }
  }

  if (isOverheadPressExerciseId(exerciseId) && angles.torsoLean > 25) {
    return "Stay tall and reduce the backward torso lean.";
  }

  if (
    !isOverheadPressExerciseId(exerciseId) &&
    phase === "bottom" &&
    angles.wristOffset > 38
  ) {
    return "Bring the wrist closer over the elbow before pressing.";
  }

  switch (phase) {
    case "find-start":
      return "Begin with the arms extended so tracking can establish the start.";
    case "locked-out":
      return "Ready—lower the weight with control.";
    case "lowering":
      return "Keep the wrist stacked as the elbow bends.";
    case "bottom":
      return "Range detected—press smoothly to the top.";
    case "pressing":
      return "Finish with the arms extended to complete the rep.";
  }
}
