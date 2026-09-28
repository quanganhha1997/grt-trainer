export type ChestIsolationPhase =
  | "find-start"
  | "start"
  | "working"
  | "peak"
  | "returning";

export type ChestIsolationTrackerState = {
  phase: ChestIsolationPhase;
  repetitions: number;
  lastWristSeparation: number | null;
  reachedPeak: boolean;
};

export const CHEST_ISOLATION_PHASE_THRESHOLDS = {
  start: 175,
  workingStart: 150,
  peak: 110,
  peakExit: 128,
  movementDelta: 1.5,
} as const;

export function createChestIsolationTracker(): ChestIsolationTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastWristSeparation: null,
    reachedPeak: false,
  };
}

export function updateChestIsolationTracker(
  state: ChestIsolationTrackerState,
  wristSeparation: number,
): ChestIsolationTrackerState {
  if (!Number.isFinite(wristSeparation)) return state;

  const startsReady = wristSeparation >= CHEST_ISOLATION_PHASE_THRESHOLDS.start;
  if (state.lastWristSeparation === null) {
    return {
      ...state,
      phase: startsReady ? "start" : "find-start",
      lastWristSeparation: wristSeparation,
    };
  }

  const movement = wristSeparation - state.lastWristSeparation;
  const movingIntoRep = movement <= -CHEST_ISOLATION_PHASE_THRESHOLDS.movementDelta;
  const movingTowardStart = movement >= CHEST_ISOLATION_PHASE_THRESHOLDS.movementDelta;
  const reachedWorkingRange =
    wristSeparation <= CHEST_ISOLATION_PHASE_THRESHOLDS.workingStart;
  const reachedPeakRange =
    wristSeparation <= CHEST_ISOLATION_PHASE_THRESHOLDS.peak;
  const leftPeakRange =
    wristSeparation >= CHEST_ISOLATION_PHASE_THRESHOLDS.peakExit;

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
