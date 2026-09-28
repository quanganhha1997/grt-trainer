import type { FormCheckExerciseId } from "./form-check-exercises";

export type HipMachineExerciseId = Extract<
  FormCheckExerciseId,
  "adductor_machine" | "abductor_machine"
>;

export type HipMachinePhase =
  | "find-start"
  | "start"
  | "working"
  | "peak"
  | "returning";

export type HipMachineTrackerState = {
  phase: HipMachinePhase;
  repetitions: number;
  lastKneeSeparation: number | null;
  reachedPeak: boolean;
};

export const HIP_MACHINE_PHASE_THRESHOLDS = {
  adductor_machine: {
    start: 150,
    workingStart: 125,
    peak: 85,
    peakExit: 110,
    movementDelta: 1.5,
  },
  abductor_machine: {
    start: 90,
    workingStart: 115,
    peak: 155,
    peakExit: 130,
    movementDelta: 1.5,
  },
} as const;

export function createHipMachineTracker(): HipMachineTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastKneeSeparation: null,
    reachedPeak: false,
  };
}

export function updateHipMachineTracker(
  state: HipMachineTrackerState,
  kneeSeparation: number,
  exerciseId: HipMachineExerciseId,
): HipMachineTrackerState {
  if (!Number.isFinite(kneeSeparation)) return state;

  const thresholds = HIP_MACHINE_PHASE_THRESHOLDS[exerciseId];
  const opensDuringRep = exerciseId === "abductor_machine";
  const startsReady = opensDuringRep
    ? kneeSeparation <= thresholds.start
    : kneeSeparation >= thresholds.start;

  if (state.lastKneeSeparation === null) {
    return {
      ...state,
      phase: startsReady ? "start" : "find-start",
      lastKneeSeparation: kneeSeparation,
    };
  }

  const movement = kneeSeparation - state.lastKneeSeparation;
  const movingIntoRep = opensDuringRep
    ? movement >= thresholds.movementDelta
    : movement <= -thresholds.movementDelta;
  const movingTowardStart = opensDuringRep
    ? movement <= -thresholds.movementDelta
    : movement >= thresholds.movementDelta;
  const reachedWorkingRange = opensDuringRep
    ? kneeSeparation >= thresholds.workingStart
    : kneeSeparation <= thresholds.workingStart;
  const reachedPeakRange = opensDuringRep
    ? kneeSeparation >= thresholds.peak
    : kneeSeparation <= thresholds.peak;
  const leftPeakRange = opensDuringRep
    ? kneeSeparation <= thresholds.peakExit
    : kneeSeparation >= thresholds.peakExit;

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
    lastKneeSeparation: kneeSeparation,
    reachedPeak,
  };
}
