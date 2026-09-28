import type { FormCheckExerciseId } from "./form-check-exercises";

export type HingePhase =
  | "find-start"
  | "standing"
  | "hinging"
  | "bottom"
  | "rising";

export type HingeTrackerState = {
  phase: HingePhase;
  repetitions: number;
  lastHipAngle: number | null;
  lowestHipAngle: number;
  reachedBottom: boolean;
};

type HingeThresholds = {
  standing: number;
  hingeStart: number;
  bottom: number;
  bottomExit: number;
  movementDelta: number;
};

export function getHingeThresholds(
  exerciseId: Extract<FormCheckExerciseId, "deadlift" | "romanian_deadlift">,
): HingeThresholds {
  return exerciseId === "romanian_deadlift"
    ? { standing: 160, hingeStart: 150, bottom: 125, bottomExit: 132, movementDelta: 0.65 }
    : { standing: 160, hingeStart: 150, bottom: 115, bottomExit: 122, movementDelta: 0.65 };
}

export function createHingeTracker(): HingeTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastHipAngle: null,
    lowestHipAngle: 180,
    reachedBottom: false,
  };
}

export function updateHingeTracker(
  state: HingeTrackerState,
  hipAngle: number,
  exerciseId: Extract<FormCheckExerciseId, "deadlift" | "romanian_deadlift">,
): HingeTrackerState {
  if (!Number.isFinite(hipAngle)) return state;
  const thresholds = getHingeThresholds(exerciseId);

  if (state.lastHipAngle === null) {
    return {
      ...state,
      phase: hipAngle >= thresholds.standing ? "standing" : "find-start",
      lastHipAngle: hipAngle,
      lowestHipAngle: hipAngle,
    };
  }

  const movement = hipAngle - state.lastHipAngle;
  const isClosing = movement <= -thresholds.movementDelta;
  const isOpening = movement >= thresholds.movementDelta;
  let phase = state.phase;
  let repetitions = state.repetitions;
  let reachedBottom = state.reachedBottom;
  let lowestHipAngle = Math.min(state.lowestHipAngle, hipAngle);

  switch (state.phase) {
    case "find-start":
      if (hipAngle >= thresholds.standing) {
        phase = "standing";
        reachedBottom = false;
        lowestHipAngle = hipAngle;
      }
      break;
    case "standing":
      lowestHipAngle = hipAngle;
      if (hipAngle <= thresholds.hingeStart && isClosing) {
        phase = "hinging";
        reachedBottom = false;
      }
      break;
    case "hinging":
      if (hipAngle <= thresholds.bottom) {
        phase = "bottom";
        reachedBottom = true;
      } else if (isOpening) {
        phase = "rising";
      }
      break;
    case "bottom":
      reachedBottom = true;
      if (hipAngle >= thresholds.bottomExit && isOpening) phase = "rising";
      break;
    case "rising":
      if (reachedBottom && hipAngle <= thresholds.bottomExit && isClosing) {
        phase = "bottom";
      } else if (!reachedBottom && hipAngle < thresholds.hingeStart && isClosing) {
        phase = "hinging";
      } else if (hipAngle >= thresholds.standing) {
        if (reachedBottom) repetitions += 1;
        phase = "standing";
        reachedBottom = false;
        lowestHipAngle = hipAngle;
      }
      break;
  }

  return {
    phase,
    repetitions,
    lastHipAngle: hipAngle,
    lowestHipAngle,
    reachedBottom,
  };
}
