import type { FormCheckExerciseId } from "./form-check-exercises";

export type ArmIsolationExerciseId = Extract<
  FormCheckExerciseId,
  "biceps_curl" | "triceps_pushdown" | "triceps_extension"
>;

export type ArmIsolationPhase =
  | "find-start"
  | "start"
  | "working"
  | "peak"
  | "returning";

export type ArmIsolationTrackerState = {
  phase: ArmIsolationPhase;
  repetitions: number;
  lastElbowAngle: number | null;
  reachedPeak: boolean;
};

export const ARM_ISOLATION_PHASE_THRESHOLDS = {
  biceps_curl: {
    start: 150,
    workingStart: 140,
    peak: 65,
    peakExit: 80,
    movementDelta: 0.7,
  },
  triceps_pushdown: {
    start: 100,
    workingStart: 115,
    peak: 155,
    peakExit: 145,
    movementDelta: 0.7,
  },
  triceps_extension: {
    start: 150,
    workingStart: 140,
    peak: 95,
    peakExit: 110,
    movementDelta: 0.7,
  },
} as const;

export function createArmIsolationTracker(): ArmIsolationTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastElbowAngle: null,
    reachedPeak: false,
  };
}

export function updateArmIsolationTracker(
  state: ArmIsolationTrackerState,
  elbowAngle: number,
  exerciseId: ArmIsolationExerciseId,
): ArmIsolationTrackerState {
  if (!Number.isFinite(elbowAngle)) return state;

  const thresholds = ARM_ISOLATION_PHASE_THRESHOLDS[exerciseId];
  const startsExtended = exerciseId !== "triceps_pushdown";
  const startsReady = startsExtended
    ? elbowAngle >= thresholds.start
    : elbowAngle <= thresholds.start;

  if (state.lastElbowAngle === null) {
    return {
      ...state,
      phase: startsReady ? "start" : "find-start",
      lastElbowAngle: elbowAngle,
    };
  }

  const movement = elbowAngle - state.lastElbowAngle;
  const isOpening = movement >= thresholds.movementDelta;
  const isClosing = movement <= -thresholds.movementDelta;
  const movingIntoRep = startsExtended ? isClosing : isOpening;
  const movingTowardStart = startsExtended ? isOpening : isClosing;
  const reachedWorkingRange = startsExtended
    ? elbowAngle <= thresholds.workingStart
    : elbowAngle >= thresholds.workingStart;
  const reachedPeakRange = startsExtended
    ? elbowAngle <= thresholds.peak
    : elbowAngle >= thresholds.peak;
  const leftPeakRange = startsExtended
    ? elbowAngle >= thresholds.peakExit
    : elbowAngle <= thresholds.peakExit;

  let phase = state.phase;
  let repetitions = state.repetitions;
  let reachedPeak = state.reachedPeak;

  switch (state.phase) {
    case "find-start":
      if (startsReady) {
        phase = "start";
        reachedPeak = false;
      }
      break;
    case "start":
      if (reachedWorkingRange && movingIntoRep) {
        phase = "working";
        reachedPeak = false;
      }
      break;
    case "working":
      if (reachedPeakRange) {
        phase = "peak";
        reachedPeak = true;
      } else if (movingTowardStart) {
        phase = "returning";
      }
      break;
    case "peak":
      reachedPeak = true;
      if (leftPeakRange && movingTowardStart) {
        phase = "returning";
      }
      break;
    case "returning":
      if (reachedPeak && reachedPeakRange && movingIntoRep) {
        phase = "peak";
      } else if (!reachedPeak && reachedWorkingRange && movingIntoRep) {
        phase = "working";
      } else if (startsReady) {
        if (reachedPeak) repetitions += 1;
        phase = "start";
        reachedPeak = false;
      }
      break;
  }

  return {
    phase,
    repetitions,
    lastElbowAngle: elbowAngle,
    reachedPeak,
  };
}
