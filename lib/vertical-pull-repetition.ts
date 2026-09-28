export type VerticalPullPhase =
  | "find-start"
  | "extended"
  | "pulling"
  | "contracted"
  | "returning";

export type VerticalPullTrackerState = {
  phase: VerticalPullPhase;
  repetitions: number;
  lastElbowAngle: number | null;
  lowestElbowAngle: number;
  reachedContracted: boolean;
};

export const VERTICAL_PULL_PHASE_THRESHOLDS = {
  extended: 150,
  pullingStart: 142,
  contracted: 110,
  contractedExit: 118,
  movementDelta: 0.7,
} as const;

export function createVerticalPullTracker(): VerticalPullTrackerState {
  return {
    phase: "find-start",
    repetitions: 0,
    lastElbowAngle: null,
    lowestElbowAngle: 180,
    reachedContracted: false,
  };
}

export function updateVerticalPullTracker(
  state: VerticalPullTrackerState,
  elbowAngle: number,
): VerticalPullTrackerState {
  if (!Number.isFinite(elbowAngle)) return state;

  if (state.lastElbowAngle === null) {
    return {
      ...state,
      phase:
        elbowAngle >= VERTICAL_PULL_PHASE_THRESHOLDS.extended
          ? "extended"
          : "find-start",
      lastElbowAngle: elbowAngle,
      lowestElbowAngle: elbowAngle,
    };
  }

  const movement = elbowAngle - state.lastElbowAngle;
  const isBending = movement <= -VERTICAL_PULL_PHASE_THRESHOLDS.movementDelta;
  const isStraightening = movement >= VERTICAL_PULL_PHASE_THRESHOLDS.movementDelta;
  let phase = state.phase;
  let repetitions = state.repetitions;
  let reachedContracted = state.reachedContracted;
  let lowestElbowAngle = Math.min(state.lowestElbowAngle, elbowAngle);

  switch (state.phase) {
    case "find-start":
      if (elbowAngle >= VERTICAL_PULL_PHASE_THRESHOLDS.extended) {
        phase = "extended";
        reachedContracted = false;
        lowestElbowAngle = elbowAngle;
      }
      break;
    case "extended":
      lowestElbowAngle = elbowAngle;
      if (
        elbowAngle <= VERTICAL_PULL_PHASE_THRESHOLDS.pullingStart &&
        isBending
      ) {
        phase = "pulling";
        reachedContracted = false;
      }
      break;
    case "pulling":
      if (elbowAngle <= VERTICAL_PULL_PHASE_THRESHOLDS.contracted) {
        phase = "contracted";
        reachedContracted = true;
      } else if (isStraightening) {
        phase = "returning";
      }
      break;
    case "contracted":
      reachedContracted = true;
      if (
        elbowAngle >= VERTICAL_PULL_PHASE_THRESHOLDS.contractedExit &&
        isStraightening
      ) {
        phase = "returning";
      }
      break;
    case "returning":
      if (
        reachedContracted &&
        elbowAngle <= VERTICAL_PULL_PHASE_THRESHOLDS.contractedExit &&
        isBending
      ) {
        phase = "contracted";
      } else if (
        !reachedContracted &&
        elbowAngle < VERTICAL_PULL_PHASE_THRESHOLDS.pullingStart &&
        isBending
      ) {
        phase = "pulling";
      } else if (elbowAngle >= VERTICAL_PULL_PHASE_THRESHOLDS.extended) {
        if (reachedContracted) repetitions += 1;
        phase = "extended";
        reachedContracted = false;
        lowestElbowAngle = elbowAngle;
      }
      break;
  }

  return {
    phase,
    repetitions,
    lastElbowAngle: elbowAngle,
    lowestElbowAngle,
    reachedContracted,
  };
}
