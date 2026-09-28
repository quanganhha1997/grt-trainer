export type RearShoulderIsolationPhase =
  | "find-start"
  | "start"
  | "working"
  | "peak"
  | "returning";

export type RearShoulderIsolationTrackerState = {
  phase: RearShoulderIsolationPhase;
  repetitions: number;
  lastWristSeparation: number | null;
  reachedPeak: boolean;
};

export const REAR_SHOULDER_ISOLATION_PHASE_THRESHOLDS = {
  start: 115,
  workingStart: 140,
  peak: 190,
  peakExit: 165,
  movementDelta: 1.5,
} as const;

export function createRearShoulderIsolationTracker(): RearShoulderIsolationTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastWristSeparation: null,
    reachedPeak: false,
  };
}

export function updateRearShoulderIsolationTracker(
  state: RearShoulderIsolationTrackerState,
  wristSeparation: number,
): RearShoulderIsolationTrackerState {
  if (!Number.isFinite(wristSeparation)) return state;

  const startsReady =
    wristSeparation <= REAR_SHOULDER_ISOLATION_PHASE_THRESHOLDS.start;
  if (state.lastWristSeparation === null) {
    return {
      ...state,
      phase: startsReady ? "start" : "find-start",
      lastWristSeparation: wristSeparation,
    };
  }

  const movement = wristSeparation - state.lastWristSeparation;
  const movingIntoRep =
    movement >= REAR_SHOULDER_ISOLATION_PHASE_THRESHOLDS.movementDelta;
  const movingTowardStart =
    movement <= -REAR_SHOULDER_ISOLATION_PHASE_THRESHOLDS.movementDelta;
  const reachedWorkingRange =
    wristSeparation >= REAR_SHOULDER_ISOLATION_PHASE_THRESHOLDS.workingStart;
  const reachedPeakRange =
    wristSeparation >= REAR_SHOULDER_ISOLATION_PHASE_THRESHOLDS.peak;
  const leftPeakRange =
    wristSeparation <= REAR_SHOULDER_ISOLATION_PHASE_THRESHOLDS.peakExit;

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
    lastWristSeparation: wristSeparation,
    reachedPeak,
  };
}
