import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { FormCheckExerciseId } from "./form-check-exercises";
import type { PressAngles } from "./pose-geometry";
import type { VerticalPullPhase } from "./vertical-pull-repetition";

export type VerticalPullExerciseId = Extract<
  FormCheckExerciseId,
  "pull_up" | "lat_pulldown"
>;

type ActiveVerticalPullRep = {
  startedAt: number;
  minimumElbowAngle: number;
  minimumElbowAngleAt: number;
  minimumShoulderAngle: number;
  minimumTorsoLean: number;
  maximumTorsoLean: number;
  torsoDriftAt: number;
  sampleCount: number;
};

export type VerticalPullCoachState = {
  activeRep: ActiveVerticalPullRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: VerticalPullPhase;
  previousRepetitionCount: number;
};

function scoreRange(minimumElbowAngle: number, timestampSeconds: number) {
  if (minimumElbowAngle <= 105) {
    return {
      points: 40,
      signal: {
        area: "Range",
        status: "good" as const,
        message: `A complete pulling range was detected at ${Math.round(minimumElbowAngle)}° elbow flexion.`,
        timestampSeconds,
      },
    };
  }

  return {
    points: minimumElbowAngle <= 120 ? 30 : 15,
    signal: {
      area: "Range",
      status: "adjust" as const,
      message: "Pull through a slightly larger comfortable range before returning.",
      timestampSeconds,
    },
  };
}

function scoreTorsoStability(
  torsoLeanRange: number,
  timestampSeconds: number,
  exerciseId: VerticalPullExerciseId,
) {
  const goodThreshold = exerciseId === "pull_up" ? 12 : 10;
  const usableThreshold = exerciseId === "pull_up" ? 20 : 17;

  if (torsoLeanRange <= goodThreshold) {
    return {
      points: 35,
      signal: {
        area: "Torso stability",
        status: "good" as const,
        message: "Torso position stayed controlled through the pull and return.",
        timestampSeconds,
      },
    };
  }

  return {
    points: torsoLeanRange <= usableThreshold ? 25 : 12,
    signal: {
      area: "Torso stability",
      status: "adjust" as const,
      message: "Reduce torso swing as the body or weight moves through the repetition.",
      timestampSeconds,
    },
  };
}

function scoreTempo(durationSeconds: number, timestampSeconds: number) {
  const good = durationSeconds >= 1.5 && durationSeconds <= 6;
  return {
    points: good ? 25 : durationSeconds >= 1 && durationSeconds <= 7.5 ? 18 : 10,
    signal: {
      area: "Tempo",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? `Controlled ${durationSeconds.toFixed(1)}-second repetition.`
        : durationSeconds < 1.5
          ? "Slow the repetition so the pull and return stay controlled."
          : "Keep the pull and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveVerticalPullRep,
  angles: PressAngles,
  timestampSeconds: number,
): ActiveVerticalPullRep {
  const reachedDeeperPosition = angles.elbow < activeRep.minimumElbowAngle;
  const reachedNewTorsoExtreme =
    angles.torsoLean < activeRep.minimumTorsoLean ||
    angles.torsoLean > activeRep.maximumTorsoLean;

  return {
    ...activeRep,
    minimumElbowAngle: Math.min(activeRep.minimumElbowAngle, angles.elbow),
    minimumElbowAngleAt: reachedDeeperPosition
      ? timestampSeconds
      : activeRep.minimumElbowAngleAt,
    minimumShoulderAngle: Math.min(activeRep.minimumShoulderAngle, angles.shoulder),
    minimumTorsoLean: Math.min(activeRep.minimumTorsoLean, angles.torsoLean),
    maximumTorsoLean: Math.max(activeRep.maximumTorsoLean, angles.torsoLean),
    torsoDriftAt: reachedNewTorsoExtreme
      ? timestampSeconds
      : activeRep.torsoDriftAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateVerticalPullRep(
  activeRep: ActiveVerticalPullRep,
  repetition: number,
  completedAt: number,
  exerciseId: VerticalPullExerciseId,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const torsoLeanRange = Math.max(
    0,
    activeRep.maximumTorsoLean - activeRep.minimumTorsoLean,
  );
  const range = scoreRange(
    activeRep.minimumElbowAngle,
    activeRep.minimumElbowAngleAt,
  );
  const torso = scoreTorsoStability(
    torsoLeanRange,
    activeRep.torsoDriftAt,
    exerciseId,
  );
  const tempo = scoreTempo(durationSeconds, midpoint);
  const signals: FormCoachingSignal[] = [range.signal, torso.signal, tempo.signal];
  const score = range.points + torso.points + tempo.points;

  return {
    repetition,
    score,
    rating: score >= 85 ? "Strong" : score >= 70 ? "Good" : "Needs attention",
    minimumKneeAngle: 0,
    minimumHipAngle: 0,
    maximumTorsoLean: activeRep.maximumTorsoLean,
    minimumElbowAngle: activeRep.minimumElbowAngle,
    minimumShoulderAngle: activeRep.minimumShoulderAngle,
    torsoLeanRange,
    durationSeconds,
    sampleCount: activeRep.sampleCount,
    startedAtSeconds: activeRep.startedAt,
    completedAtSeconds: completedAt,
    reviewAtSeconds:
      signals.find((signal) => signal.status === "adjust")?.timestampSeconds ??
      activeRep.minimumElbowAngleAt,
    signals,
  };
}

export function createVerticalPullCoach(): VerticalPullCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateVerticalPullCoach(
  state: VerticalPullCoachState,
  phase: VerticalPullPhase,
  repetitionCount: number,
  angles: PressAngles,
  timestampSeconds: number,
  exerciseId: VerticalPullExerciseId,
): VerticalPullCoachState {
  const beganRep = state.previousPhase === "extended" && phase === "pulling";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumElbowAngle: angles.elbow,
      minimumElbowAngleAt: timestampSeconds,
      minimumShoulderAngle: angles.shoulder,
      minimumTorsoLean: angles.torsoLean,
      maximumTorsoLean: angles.torsoLean,
      torsoDriftAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateVerticalPullRep(
        activeRep,
        repetitionCount,
        timestampSeconds,
        exerciseId,
      ),
    ];
    activeRep = null;
  } else if (
    activeRep &&
    phase === "extended" &&
    state.previousPhase !== "extended"
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

export function getLiveVerticalPullCue(phase: VerticalPullPhase) {
  switch (phase) {
    case "find-start":
      return "Begin with the arms extended so tracking can establish the start.";
    case "extended":
      return "Ready—begin the pull without swinging the torso.";
    case "pulling":
      return "Keep the torso controlled as the elbows bend.";
    case "contracted":
      return "Pull detected—return to extended arms with control.";
    case "returning":
      return "Finish with the arms extended to complete the rep.";
  }
}
