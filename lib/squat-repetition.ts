export type SquatPhase =
  | "find-start"
  | "standing"
  | "descending"
  | "bottom"
  | "ascending";

export type SquatTrackerState = {
  phase: SquatPhase;
  repetitions: number;
  lastKneeAngle: number | null;
  lowestKneeAngle: number;
  reachedBottom: boolean;
};

export const SQUAT_PHASE_THRESHOLDS = {
  standing: 160,
  descentStart: 155,
  bottom: 110,
  bottomExit: 115,
  movementDelta: 0.75,
} as const;

export function createSquatTracker(): SquatTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastKneeAngle: null,
    lowestKneeAngle: 180,
    reachedBottom: false,
  };
}

export function updateSquatTracker(
  state: SquatTrackerState,
  kneeAngle: number,
): SquatTrackerState {
  if (!Number.isFinite(kneeAngle)) return state;

  if (state.lastKneeAngle === null) {
    return {
      ...state,
      phase:
        kneeAngle >= SQUAT_PHASE_THRESHOLDS.standing
          ? "standing"
          : "find-start",
      lastKneeAngle: kneeAngle,
      lowestKneeAngle: kneeAngle,
    };
  }

  const movement = kneeAngle - state.lastKneeAngle;
  const isBending = movement <= -SQUAT_PHASE_THRESHOLDS.movementDelta;
  const isStraightening = movement >= SQUAT_PHASE_THRESHOLDS.movementDelta;
  let phase = state.phase;
  let repetitions = state.repetitions;
  let reachedBottom = state.reachedBottom;
  let lowestKneeAngle = Math.min(state.lowestKneeAngle, kneeAngle);

  switch (state.phase) {
    case "find-start":
      if (kneeAngle >= SQUAT_PHASE_THRESHOLDS.standing) {
        phase = "standing";
        reachedBottom = false;
        lowestKneeAngle = kneeAngle;
      }
      break;

    case "standing":
      lowestKneeAngle = kneeAngle;
      if (
        kneeAngle <= SQUAT_PHASE_THRESHOLDS.descentStart &&
        isBending
      ) {
        phase = "descending";
        reachedBottom = false;
      }
      break;

    case "descending":
      if (kneeAngle <= SQUAT_PHASE_THRESHOLDS.bottom) {
        phase = "bottom";
        reachedBottom = true;
      } else if (isStraightening) {
        phase = "ascending";
      }
      break;

    case "bottom":
      reachedBottom = true;
      if (
        kneeAngle >= SQUAT_PHASE_THRESHOLDS.bottomExit &&
        isStraightening
      ) {
        phase = "ascending";
      }
      break;

    case "ascending":
      if (
        reachedBottom &&
        kneeAngle <= SQUAT_PHASE_THRESHOLDS.bottomExit &&
        isBending
      ) {
        phase = "bottom";
      } else if (
        !reachedBottom &&
        kneeAngle < SQUAT_PHASE_THRESHOLDS.descentStart &&
        isBending
      ) {
        phase = "descending";
      } else if (kneeAngle >= SQUAT_PHASE_THRESHOLDS.standing) {
        if (reachedBottom) repetitions += 1;
        phase = "standing";
        reachedBottom = false;
        lowestKneeAngle = kneeAngle;
      }
      break;
  }

  return {
    phase,
    repetitions,
    lastKneeAngle: kneeAngle,
    lowestKneeAngle,
    reachedBottom,
  };
}
