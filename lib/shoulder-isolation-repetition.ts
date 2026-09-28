import type { FormCheckExerciseId } from "./form-check-exercises";

export type ShoulderIsolationExerciseId = Extract<
  FormCheckExerciseId,
  "lateral_raise"
>;

export type ShoulderIsolationPhase =
  | "find-start"
  | "start"
  | "working"
  | "peak"
  | "returning";

export type ShoulderIsolationTrackerState = {
  phase: ShoulderIsolationPhase;
  repetitions: number;
  lastShoulderAngle: number | null;
  reachedPeak: boolean;
};

export const SHOULDER_ISOLATION_PHASE_THRESHOLDS = {
  lateral_raise: {
    start: 25,
    workingStart: 40,
    peak: 70,
    peakExit: 58,
    movementDelta: 0.75,
  },
} as const;

export function createShoulderIsolationTracker(): ShoulderIsolationTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastShoulderAngle: null,
    reachedPeak: false,
  };
}

export function updateShoulderIsolationTracker(
  state: ShoulderIsolationTrackerState,
  shoulderAngle: number,
  exerciseId: ShoulderIsolationExerciseId,
): ShoulderIsolationTrackerState {
  if (!Number.isFinite(shoulderAngle)) return state;

  const thresholds = SHOULDER_ISOLATION_PHASE_THRESHOLDS[exerciseId];
  const startsReady = shoulderAngle <= thresholds.start;

  if (state.lastShoulderAngle === null) {
    return {
      ...state,
      phase: startsReady ? "start" : "find-start",
      lastShoulderAngle: shoulderAngle,
    };
  }

  const movement = shoulderAngle - state.lastShoulderAngle;
  const movingIntoRep = movement >= thresholds.movementDelta;
  const movingTowardStart = movement <= -thresholds.movementDelta;
  const reachedWorkingRange = shoulderAngle >= thresholds.workingStart;
  const reachedPeakRange = shoulderAngle >= thresholds.peak;
  const leftPeakRange = shoulderAngle <= thresholds.peakExit;

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
