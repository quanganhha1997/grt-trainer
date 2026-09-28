import type { FormCheckExerciseId } from "./form-check-exercises";

export type CoreFlexionExerciseId = Extract<
  FormCheckExerciseId,
  "crunch" | "reverse_crunch" | "leg_raise"
>;

export type CoreFlexionPhase =
  | "find-start"
  | "start"
  | "working"
  | "peak"
  | "returning";

export type CoreFlexionTrackerState = {
  phase: CoreFlexionPhase;
  repetitions: number;
  lastHipAngle: number | null;
  reachedPeak: boolean;
};

export const CORE_FLEXION_PHASE_THRESHOLDS = {
  crunch: {
    start: 145,
    workingStart: 132,
    peak: 95,
    peakExit: 110,
    movementDelta: 0.6,
  },
  reverse_crunch: {
    start: 105,
    workingStart: 95,
    peak: 60,
    peakExit: 75,
    movementDelta: 0.6,
  },
  leg_raise: {
    start: 150,
    workingStart: 135,
    peak: 90,
    peakExit: 105,
    movementDelta: 0.6,
  },
} as const;

export function createCoreFlexionTracker(): CoreFlexionTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastHipAngle: null,
    reachedPeak: false,
  };
}

export function updateCoreFlexionTracker(
  state: CoreFlexionTrackerState,
  hipAngle: number,
  exerciseId: CoreFlexionExerciseId,
): CoreFlexionTrackerState {
  if (!Number.isFinite(hipAngle)) return state;

  const thresholds = CORE_FLEXION_PHASE_THRESHOLDS[exerciseId];
  const startsReady = hipAngle >= thresholds.start;

  if (state.lastHipAngle === null) {
    return {
      ...state,
      phase: startsReady ? "start" : "find-start",
      lastHipAngle: hipAngle,
    };
  }

  const movement = hipAngle - state.lastHipAngle;
  const movingIntoRep = movement <= -thresholds.movementDelta;
  const movingTowardStart = movement >= thresholds.movementDelta;
  const reachedWorkingRange = hipAngle <= thresholds.workingStart;
  const reachedPeakRange = hipAngle <= thresholds.peak;
  const leftPeakRange = hipAngle >= thresholds.peakExit;

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
    lastHipAngle: hipAngle,
    reachedPeak,
  };
}
