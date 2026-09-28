import type { SquatAngles } from "./pose-geometry";
import type { SquatPhase } from "./squat-repetition";
import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";

export type CoachingSignal = FormCoachingSignal;
export type SquatRepAnalysis = FormRepAnalysis;

type ActiveSquatRep = {
  startedAt: number;
  minimumKneeAngle: number;
  minimumKneeAngleAt: number;
  minimumHipAngle: number;
  maximumTorsoLean: number;
  maximumTorsoLeanAt: number;
  sampleCount: number;
};

export type SquatCoachState = {
  activeRep: ActiveSquatRep | null;
  completedReps: SquatRepAnalysis[];
  previousPhase: SquatPhase;
  previousRepetitionCount: number;
};

function captureSample(
  activeRep: ActiveSquatRep,
  angles: SquatAngles,
  timestampSeconds: number,
): ActiveSquatRep {
  const reachedDeeperKneeAngle = angles.knee < activeRep.minimumKneeAngle;
  const reachedGreaterTorsoLean =
    angles.torsoLean > activeRep.maximumTorsoLean;

  return {
    ...activeRep,
    minimumKneeAngle: Math.min(activeRep.minimumKneeAngle, angles.knee),
    minimumKneeAngleAt: reachedDeeperKneeAngle
      ? timestampSeconds
      : activeRep.minimumKneeAngleAt,
    minimumHipAngle: Math.min(activeRep.minimumHipAngle, angles.hip),
    maximumTorsoLean: Math.max(activeRep.maximumTorsoLean, angles.torsoLean),
    maximumTorsoLeanAt: reachedGreaterTorsoLean
      ? timestampSeconds
      : activeRep.maximumTorsoLeanAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

function scoreDepth(minimumKneeAngle: number, timestampSeconds: number): {
  points: number;
  signal: CoachingSignal;
} {
  if (minimumKneeAngle <= 100) {
    return {
      points: 40,
      signal: {
        area: "Depth",
        status: "good",
        message: `Strong detected range at ${Math.round(minimumKneeAngle)}° knee flexion.`,
        timestampSeconds,
      },
    };
  }

  if (minimumKneeAngle <= 110) {
    return {
      points: 32,
      signal: {
        area: "Depth",
        status: "adjust",
        message:
          "The rep reached the detector threshold. If comfortable, try a slightly deeper, controlled bottom position.",
        timestampSeconds,
      },
    };
  }

  return {
    points: 15,
    signal: {
      area: "Depth",
      status: "adjust",
      message: "Use a larger comfortable range before returning to standing.",
      timestampSeconds,
    },
  };
}

function scoreTorso(maximumTorsoLean: number, timestampSeconds: number): {
  points: number;
  signal: CoachingSignal;
} {
  if (maximumTorsoLean <= 35) {
    return {
      points: 35,
      signal: {
        area: "Torso",
        status: "good",
        message: `Torso stayed controlled, peaking at ${Math.round(maximumTorsoLean)}° from vertical.`,
        timestampSeconds,
      },
    };
  }

  if (maximumTorsoLean <= 45) {
    return {
      points: 26,
      signal: {
        area: "Torso",
        status: "adjust",
        message: "Brace before descending and keep your chest from drifting farther forward.",
        timestampSeconds,
      },
    };
  }

  return {
    points: 12,
    signal: {
      area: "Torso",
      status: "adjust",
      message: "Reduce forward lean by bracing and keeping the chest more upright.",
      timestampSeconds,
    },
  };
}

function scoreTempo(durationSeconds: number, timestampSeconds: number): {
  points: number;
  signal: CoachingSignal;
} {
  if (durationSeconds >= 1.5 && durationSeconds <= 4.5) {
    return {
      points: 25,
      signal: {
        area: "Tempo",
        status: "good",
        message: `Controlled ${durationSeconds.toFixed(1)}-second repetition.`,
        timestampSeconds,
      },
    };
  }

  if (durationSeconds < 1.5) {
    return {
      points: durationSeconds >= 1 ? 18 : 10,
      signal: {
        area: "Tempo",
        status: "adjust",
        message: "Slow the repetition slightly so each phase stays controlled.",
        timestampSeconds,
      },
    };
  }

  return {
    points: durationSeconds <= 6 ? 18 : 10,
    signal: {
      area: "Tempo",
      status: "adjust",
      message: "Aim for a smoother, more continuous descent and return.",
      timestampSeconds,
    },
  };
}

export function evaluateSquatRep(
  activeRep: ActiveSquatRep,
  repetition: number,
  completedAt: number,
): SquatRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const depth = scoreDepth(
    activeRep.minimumKneeAngle,
    activeRep.minimumKneeAngleAt,
  );
  const torso = scoreTorso(
    activeRep.maximumTorsoLean,
    activeRep.maximumTorsoLeanAt,
  );
  const tempo = scoreTempo(durationSeconds, midpoint);
  const score = depth.points + torso.points + tempo.points;
  const signals = [depth.signal, torso.signal, tempo.signal];
  const reviewAtSeconds =
    signals.find((signal) => signal.status === "adjust")?.timestampSeconds ??
    activeRep.minimumKneeAngleAt;

  return {
    repetition,
    score,
    rating: score >= 85 ? "Strong" : score >= 70 ? "Good" : "Needs attention",
    minimumKneeAngle: activeRep.minimumKneeAngle,
    minimumHipAngle: activeRep.minimumHipAngle,
    maximumTorsoLean: activeRep.maximumTorsoLean,
    durationSeconds,
    sampleCount: activeRep.sampleCount,
    startedAtSeconds: activeRep.startedAt,
    completedAtSeconds: completedAt,
    reviewAtSeconds,
    signals,
  };
}

export function createSquatCoach(): SquatCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateSquatCoach(
  state: SquatCoachState,
  phase: SquatPhase,
  repetitionCount: number,
  angles: SquatAngles,
  timestampSeconds: number,
): SquatCoachState {
  const beganRep =
    state.previousPhase === "standing" && phase === "descending";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumKneeAngle: angles.knee,
      minimumKneeAngleAt: timestampSeconds,
      minimumHipAngle: angles.hip,
      maximumTorsoLean: angles.torsoLean,
      maximumTorsoLeanAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateSquatRep(activeRep, repetitionCount, timestampSeconds),
    ];
    activeRep = null;
  } else if (
    activeRep &&
    phase === "standing" &&
    state.previousPhase !== "standing"
  ) {
    activeRep = null;
  }

  return {
    activeRep,
    completedReps,
    previousPhase: phase,
    previousRepetitionCount: repetitionCount,
  };
}

export function getLiveSquatCue(phase: SquatPhase, angles: SquatAngles) {
  if (angles.torsoLean > 45) {
    return "Brace your core and reduce forward lean.";
  }

  switch (phase) {
    case "find-start":
      return "Stand tall and hold briefly so tracking can begin.";
    case "standing":
      return "Ready—start the next repetition with a controlled descent.";
    case "descending":
      return "Keep lowering smoothly while your feet stay planted.";
    case "bottom":
      return "Bottom detected—drive upward without rushing.";
    case "ascending":
      return "Finish tall to complete the repetition.";
  }
}
