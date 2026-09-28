export type PressPhase =
  | "find-start"
  | "locked-out"
  | "lowering"
  | "bottom"
  | "pressing";

export type PressTrackerState = {
  phase: PressPhase;
  repetitions: number;
  lastElbowAngle: number | null;
  lowestElbowAngle: number;
  reachedBottom: boolean;
};

export const PRESS_PHASE_THRESHOLDS = {
  lockedOut: 155,
  loweringStart: 145,
  bottom: 120,
  bottomExit: 128,
  movementDelta: 0.7,
} as const;

export function createPressTracker(): PressTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastElbowAngle: null,
    lowestElbowAngle: 180,
    reachedBottom: false,
  };
}

export function updatePressTracker(
  state: PressTrackerState,
  elbowAngle: number,
): PressTrackerState {
  if (!Number.isFinite(elbowAngle)) return state;

  if (state.lastElbowAngle === null) {
    return {
      ...state,
      phase:
        elbowAngle >= PRESS_PHASE_THRESHOLDS.lockedOut
          ? "locked-out"
          : "find-start",
      lastElbowAngle: elbowAngle,
      lowestElbowAngle: elbowAngle,
    };
  }

  const movement = elbowAngle - state.lastElbowAngle;
  const isBending = movement <= -PRESS_PHASE_THRESHOLDS.movementDelta;
  const isStraightening = movement >= PRESS_PHASE_THRESHOLDS.movementDelta;
  let phase = state.phase;
  let repetitions = state.repetitions;
  let reachedBottom = state.reachedBottom;
  let lowestElbowAngle = Math.min(state.lowestElbowAngle, elbowAngle);

  switch (state.phase) {
    case "find-start":
      if (elbowAngle >= PRESS_PHASE_THRESHOLDS.lockedOut) {
        phase = "locked-out";
        reachedBottom = false;
        lowestElbowAngle = elbowAngle;
      }
      break;
    case "locked-out":
      lowestElbowAngle = elbowAngle;
      if (elbowAngle <= PRESS_PHASE_THRESHOLDS.loweringStart && isBending) {
        phase = "lowering";
        reachedBottom = false;
      }
      break;
    case "lowering":
      if (elbowAngle <= PRESS_PHASE_THRESHOLDS.bottom) {
        phase = "bottom";
        reachedBottom = true;
      } else if (isStraightening) {
        phase = "pressing";
      }
      break;
    case "bottom":
      reachedBottom = true;
      if (elbowAngle >= PRESS_PHASE_THRESHOLDS.bottomExit && isStraightening) {
        phase = "pressing";
      }
      break;
    case "pressing":
      if (
        reachedBottom &&
        elbowAngle <= PRESS_PHASE_THRESHOLDS.bottomExit &&
        isBending
      ) {
        phase = "bottom";
      } else if (
        !reachedBottom &&
        elbowAngle < PRESS_PHASE_THRESHOLDS.loweringStart &&
        isBending
      ) {
        phase = "lowering";
      } else if (elbowAngle >= PRESS_PHASE_THRESHOLDS.lockedOut) {
        if (reachedBottom) repetitions += 1;
        phase = "locked-out";
        reachedBottom = false;
        lowestElbowAngle = elbowAngle;
      }
      break;
  }

  return {
    phase,
    repetitions,
    lastElbowAngle: elbowAngle,
    lowestElbowAngle,
    reachedBottom,
  };
}
