import type { FormCheckExerciseId } from "./form-check-exercises";

export type KneeIsolationExerciseId = Extract<
  FormCheckExerciseId,
  "leg_extension" | "leg_curl"
>;

export type KneeIsolationPhase =
  | "find-start"
  | "start"
  | "working"
  | "peak"
  | "returning";

export type KneeIsolationTrackerState = {
  phase: KneeIsolationPhase;
  repetitions: number;
  lastKneeAngle: number | null;
  reachedPeak: boolean;
};

export const KNEE_ISOLATION_PHASE_THRESHOLDS = {
  leg_extension: {
    start: 110,
    workingStart: 120,
    peak: 155,
    peakExit: 145,
    movementDelta: 0.7,
  },
  leg_curl: {
    start: 150,
    workingStart: 142,
    peak: 105,
    peakExit: 118,
    movementDelta: 0.7,
  },
} as const;

export function createKneeIsolationTracker(): KneeIsolationTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastKneeAngle: null,
    reachedPeak: false,
  };
}

export function updateKneeIsolationTracker(
  state: KneeIsolationTrackerState,
  kneeAngle: number,
  exerciseId: KneeIsolationExerciseId,
): KneeIsolationTrackerState {
  if (!Number.isFinite(kneeAngle)) return state;

  const thresholds = KNEE_ISOLATION_PHASE_THRESHOLDS[exerciseId];
  const startsReady = exerciseId === "leg_extension"
    ? kneeAngle <= thresholds.start
    : kneeAngle >= thresholds.start;

  if (state.lastKneeAngle === null) {
    return {
      ...state,
      phase: startsReady ? "start" : "find-start",
      lastKneeAngle: kneeAngle,
    };
  }

  const movement = kneeAngle - state.lastKneeAngle;
  const isOpening = movement >= thresholds.movementDelta;
  const isClosing = movement <= -thresholds.movementDelta;
  const movingIntoRep = exerciseId === "leg_extension" ? isOpening : isClosing;
  const movingTowardStart = exerciseId === "leg_extension" ? isClosing : isOpening;
  const reachedWorkingRange = exerciseId === "leg_extension"
    ? kneeAngle >= thresholds.workingStart
    : kneeAngle <= thresholds.workingStart;
  const reachedPeakRange = exerciseId === "leg_extension"
    ? kneeAngle >= thresholds.peak
    : kneeAngle <= thresholds.peak;
  const leftPeakRange = exerciseId === "leg_extension"
    ? kneeAngle <= thresholds.peakExit
    : kneeAngle >= thresholds.peakExit;

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
    lastKneeAngle: kneeAngle,
    reachedPeak,
  };
}
