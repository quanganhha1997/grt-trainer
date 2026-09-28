import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { FlyAngles } from "./pose-geometry";
import type { RearShoulderIsolationPhase } from "./rear-shoulder-isolation-repetition";

type ActiveRearShoulderIsolationRep = {
  startedAt: number;
  minimumWristSeparation: number;
  maximumWristSeparation: number;
  maximumWristSeparationAt: number;
  minimumElbowAngle: number;
  maximumElbowAngle: number;
  elbowDriftAt: number;
  sampleCount: number;
};

export type RearShoulderIsolationCoachState = {
  activeRep: ActiveRearShoulderIsolationRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: RearShoulderIsolationPhase;
  previousRepetitionCount: number;
};

function scoreRange(activeRep: ActiveRearShoulderIsolationRep) {
  const wristSeparationRange = Math.max(
    0,
    activeRep.maximumWristSeparation - activeRep.minimumWristSeparation,
  );
  const good = wristSeparationRange >= 80;
  const usable = wristSeparationRange >= 50;

  return {
    points: good ? 45 : usable ? 34 : 17,
    wristSeparationRange,
    signal: {
      area: "Range",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? "The hands moved through a consistent closed-to-open range."
        : "Open the arms through a slightly larger comfortable range before returning.",
      timestampSeconds: activeRep.maximumWristSeparationAt,
    },
  };
}

function scoreElbowStability(activeRep: ActiveRearShoulderIsolationRep) {
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
        ? "The elbow bend stayed consistent through the opening and return."
        : "Keep the elbow bend more consistent while the arms open and close.",
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
          ? "Slow the opening and return so both phases stay controlled."
          : "Keep the opening and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveRearShoulderIsolationRep,
  angles: FlyAngles,
  timestampSeconds: number,
): ActiveRearShoulderIsolationRep {
  const reachedWiderPosition =
    angles.wristSeparation > activeRep.maximumWristSeparation;
  const reachedNewElbowExtreme =
    angles.elbowAverage < activeRep.minimumElbowAngle ||
    angles.elbowAverage > activeRep.maximumElbowAngle;

  return {
    ...activeRep,
    minimumWristSeparation: Math.min(
      activeRep.minimumWristSeparation,
      angles.wristSeparation,
    ),
    maximumWristSeparation: Math.max(
      activeRep.maximumWristSeparation,
      angles.wristSeparation,
    ),
    maximumWristSeparationAt: reachedWiderPosition
      ? timestampSeconds
      : activeRep.maximumWristSeparationAt,
    minimumElbowAngle: Math.min(
      activeRep.minimumElbowAngle,
      angles.elbowAverage,
    ),
    maximumElbowAngle: Math.max(
      activeRep.maximumElbowAngle,
      angles.elbowAverage,
    ),
    elbowDriftAt: reachedNewElbowExtreme
      ? timestampSeconds
      : activeRep.elbowDriftAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateRearShoulderIsolationRep(
  activeRep: ActiveRearShoulderIsolationRep,
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
    minimumWristSeparation: activeRep.minimumWristSeparation,
    maximumWristSeparation: activeRep.maximumWristSeparation,
    wristSeparationRange: range.wristSeparationRange,
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

export function createRearShoulderIsolationCoach(): RearShoulderIsolationCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateRearShoulderIsolationCoach(
  state: RearShoulderIsolationCoachState,
  phase: RearShoulderIsolationPhase,
  repetitionCount: number,
  angles: FlyAngles,
  timestampSeconds: number,
): RearShoulderIsolationCoachState {
  const beganRep = state.previousPhase === "start" && phase === "working";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumWristSeparation: angles.wristSeparation,
      maximumWristSeparation: angles.wristSeparation,
      maximumWristSeparationAt: timestampSeconds,
      minimumElbowAngle: angles.elbowAverage,
      maximumElbowAngle: angles.elbowAverage,
      elbowDriftAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateRearShoulderIsolationRep(
        activeRep,
        repetitionCount,
        timestampSeconds,
      ),
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

export function getLiveRearShoulderIsolationCue(
  phase: RearShoulderIsolationPhase,
) {
  switch (phase) {
    case "find-start":
      return "Begin with both arms in the closed start position.";
    case "start":
      return "Ready—open the arms while keeping the elbow bend consistent.";
    case "working":
      return "Keep both hands visible as the arms move through the working range.";
    case "peak":
      return "Open range detected—return the arms to the start with control.";
    case "returning":
      return "Finish in the closed start position to complete the repetition.";
  }
}
