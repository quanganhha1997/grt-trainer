import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { PressAngles } from "./pose-geometry";
import type { StraightArmPullPhase } from "./straight-arm-pull-repetition";

type ActiveStraightArmPullRep = {
  startedAt: number;
  minimumShoulderAngle: number;
  maximumShoulderAngle: number;
  minimumShoulderAngleAt: number;
  minimumElbowAngle: number;
  maximumElbowAngle: number;
  elbowDriftAt: number;
  sampleCount: number;
};

export type StraightArmPullCoachState = {
  activeRep: ActiveStraightArmPullRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: StraightArmPullPhase;
  previousRepetitionCount: number;
};

function scoreRange(activeRep: ActiveStraightArmPullRep) {
  const shoulderAngleRange = Math.max(
    0,
    activeRep.maximumShoulderAngle - activeRep.minimumShoulderAngle,
  );
  const good = shoulderAngleRange >= 70;
  const usable = shoulderAngleRange >= 45;

  return {
    points: good ? 45 : usable ? 34 : 17,
    shoulderAngleRange,
    signal: {
      area: "Range",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? `A ${Math.round(shoulderAngleRange)}° shoulder-angle change was detected.`
        : "Pull the arm through a slightly larger comfortable range before returning.",
      timestampSeconds: activeRep.minimumShoulderAngleAt,
    },
  };
}

function scoreElbowStability(activeRep: ActiveStraightArmPullRep) {
  const elbowAngleRange = Math.max(
    0,
    activeRep.maximumElbowAngle - activeRep.minimumElbowAngle,
  );
  const good = elbowAngleRange <= 18;

  return {
    points: good ? 30 : elbowAngleRange <= 28 ? 22 : 10,
    elbowAngleRange,
    signal: {
      area: "Elbow stability",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? "The elbow bend stayed consistent through the pull and return."
        : "Keep the elbow bend more consistent while the arm pulls down and returns.",
      timestampSeconds: activeRep.elbowDriftAt,
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
          ? "Slow the pull and return so both phases stay controlled."
          : "Keep the pull and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveStraightArmPullRep,
  angles: PressAngles,
  timestampSeconds: number,
): ActiveStraightArmPullRep {
  const reachedLowerShoulder =
    angles.shoulder < activeRep.minimumShoulderAngle;
  const reachedNewElbowExtreme =
    angles.elbow < activeRep.minimumElbowAngle ||
    angles.elbow > activeRep.maximumElbowAngle;

  return {
    ...activeRep,
    minimumShoulderAngle: Math.min(
      activeRep.minimumShoulderAngle,
      angles.shoulder,
    ),
    maximumShoulderAngle: Math.max(
      activeRep.maximumShoulderAngle,
      angles.shoulder,
    ),
    minimumShoulderAngleAt: reachedLowerShoulder
      ? timestampSeconds
      : activeRep.minimumShoulderAngleAt,
    minimumElbowAngle: Math.min(activeRep.minimumElbowAngle, angles.elbow),
    maximumElbowAngle: Math.max(activeRep.maximumElbowAngle, angles.elbow),
    elbowDriftAt: reachedNewElbowExtreme
      ? timestampSeconds
      : activeRep.elbowDriftAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateStraightArmPullRep(
  activeRep: ActiveStraightArmPullRep,
  repetition: number,
  completedAt: number,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const range = scoreRange(activeRep);
  const stability = scoreElbowStability(activeRep);
  const tempo = scoreTempo(durationSeconds, midpoint);
  const signals: FormCoachingSignal[] = [
    range.signal,
    stability.signal,
    tempo.signal,
  ];
  const score = range.points + stability.points + tempo.points;

  return {
    repetition,
    score,
    rating: score >= 85 ? "Strong" : score >= 70 ? "Good" : "Needs attention",
    minimumKneeAngle: 0,
    minimumHipAngle: 0,
    maximumTorsoLean: 0,
    minimumElbowAngle: activeRep.minimumElbowAngle,
    maximumElbowAngle: activeRep.maximumElbowAngle,
    minimumShoulderAngle: activeRep.minimumShoulderAngle,
    shoulderAngleRange: range.shoulderAngleRange,
    bodyPositionRange: stability.elbowAngleRange,
    durationSeconds,
    sampleCount: activeRep.sampleCount,
    startedAtSeconds: activeRep.startedAt,
    completedAtSeconds: completedAt,
    reviewAtSeconds:
      signals.find((signal) => signal.status === "adjust")?.timestampSeconds ??
      range.signal.timestampSeconds,
    signals,
  };
}

export function createStraightArmPullCoach(): StraightArmPullCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateStraightArmPullCoach(
  state: StraightArmPullCoachState,
  phase: StraightArmPullPhase,
  repetitionCount: number,
  angles: PressAngles,
  timestampSeconds: number,
): StraightArmPullCoachState {
  const beganRep = state.previousPhase === "start" && phase === "working";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumShoulderAngle: angles.shoulder,
      maximumShoulderAngle: angles.shoulder,
      minimumShoulderAngleAt: timestampSeconds,
      minimumElbowAngle: angles.elbow,
      maximumElbowAngle: angles.elbow,
      elbowDriftAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateStraightArmPullRep(activeRep, repetitionCount, timestampSeconds),
    ];
    activeRep = null;
  } else if (activeRep && phase === "start" && state.previousPhase !== "start") {
    activeRep = null;
  }

  return {
    activeRep,
    completedReps,
    previousPhase: phase,
    previousRepetitionCount: repetitionCount,
  };
}

export function getLiveStraightArmPullCue(phase: StraightArmPullPhase) {
  switch (phase) {
    case "find-start":
      return "Begin with the working arm extended overhead.";
    case "start":
      return "Ready—pull the arm down while keeping the elbow bend consistent.";
    case "working":
      return "Keep the shoulder, elbow, and wrist visible through the pull.";
    case "peak":
      return "Pull range detected—return the arm overhead with control.";
    case "returning":
      return "Finish with the arm overhead to complete the repetition.";
  }
}
