export type StraightArmPullPhase =
  | "find-start"
  | "start"
  | "working"
  | "peak"
  | "returning";

export type StraightArmPullTrackerState = {
  phase: StraightArmPullPhase;
  repetitions: number;
  lastShoulderAngle: number | null;
  reachedPeak: boolean;
};

export const STRAIGHT_ARM_PULL_PHASE_THRESHOLDS = {
  start: 150,
  workingStart: 125,
  peak: 75,
  peakExit: 100,
  movementDelta: 1.5,
} as const;

export function createStraightArmPullTracker(): StraightArmPullTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastShoulderAngle: null,
    reachedPeak: false,
  };
}

export function updateStraightArmPullTracker(
  state: StraightArmPullTrackerState,
  shoulderAngle: number,
): StraightArmPullTrackerState {
  if (!Number.isFinite(shoulderAngle)) return state;

  const startsReady = shoulderAngle >= STRAIGHT_ARM_PULL_PHASE_THRESHOLDS.start;
  if (state.lastShoulderAngle === null) {
    return {
      ...state,
      phase: startsReady ? "start" : "find-start",
      lastShoulderAngle: shoulderAngle,
    };
  }

  const movement = shoulderAngle - state.lastShoulderAngle;
  const movingIntoRep =
    movement <= -STRAIGHT_ARM_PULL_PHASE_THRESHOLDS.movementDelta;
  const movingTowardStart =
    movement >= STRAIGHT_ARM_PULL_PHASE_THRESHOLDS.movementDelta;
  const reachedWorkingRange =
    shoulderAngle <= STRAIGHT_ARM_PULL_PHASE_THRESHOLDS.workingStart;
  const reachedPeakRange =
    shoulderAngle <= STRAIGHT_ARM_PULL_PHASE_THRESHOLDS.peak;
  const leftPeakRange =
    shoulderAngle >= STRAIGHT_ARM_PULL_PHASE_THRESHOLDS.peakExit;

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
      if (leftPeakRange && movingTowardStart) phase = "returning";
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
    lastShoulderAngle: shoulderAngle,
    reachedPeak,
  };
}
