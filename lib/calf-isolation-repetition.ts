import type { FormCheckExerciseId } from "./form-check-exercises";

export type CalfIsolationExerciseId = Extract<
  FormCheckExerciseId,
  "standing_calf_raise" | "seated_calf_raise"
>;

export type CalfIsolationPhase =
  | "find-start"
  | "start"
  | "working"
  | "peak"
  | "returning";

export type CalfIsolationTrackerState = {
  phase: CalfIsolationPhase;
  repetitions: number;
  lastAnkleAngle: number | null;
  reachedPeak: boolean;
};

export const CALF_ISOLATION_PHASE_THRESHOLDS = {
  standing_calf_raise: {
    start: 115,
    workingStart: 122,
    peak: 132,
    peakExit: 126,
    movementDelta: 0.5,
  },
  seated_calf_raise: {
    start: 145,
    workingStart: 150,
    peak: 160,
    peakExit: 154,
    movementDelta: 0.5,
  },
} as const;

export function createCalfIsolationTracker(): CalfIsolationTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastAnkleAngle: null,
    reachedPeak: false,
  };
}

export function updateCalfIsolationTracker(
  state: CalfIsolationTrackerState,
  ankleAngle: number,
  exerciseId: CalfIsolationExerciseId,
): CalfIsolationTrackerState {
  if (!Number.isFinite(ankleAngle)) return state;

  const thresholds = CALF_ISOLATION_PHASE_THRESHOLDS[exerciseId];
  const startsReady = ankleAngle <= thresholds.start;

  if (state.lastAnkleAngle === null) {
    return {
      ...state,
      phase: startsReady ? "start" : "find-start",
      lastAnkleAngle: ankleAngle,
    };
  }

  const movement = ankleAngle - state.lastAnkleAngle;
  const movingIntoRep = movement >= thresholds.movementDelta;
  const movingTowardStart = movement <= -thresholds.movementDelta;
  const reachedWorkingRange = ankleAngle >= thresholds.workingStart;
  const reachedPeakRange = ankleAngle >= thresholds.peak;
  const leftPeakRange = ankleAngle <= thresholds.peakExit;

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
    lastAnkleAngle: ankleAngle,
    reachedPeak,
  };
}
