import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { FlyAngles } from "./pose-geometry";
import type { ChestIsolationPhase } from "./chest-isolation-repetition";

type ActiveChestIsolationRep = {
  startedAt: number;
  minimumWristSeparation: number;
  maximumWristSeparation: number;
  minimumWristSeparationAt: number;
  minimumElbowAngle: number;
  maximumElbowAngle: number;
  elbowDriftAt: number;
  sampleCount: number;
};

export type ChestIsolationCoachState = {
  activeRep: ActiveChestIsolationRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: ChestIsolationPhase;
  previousRepetitionCount: number;
};

function scoreRange(activeRep: ActiveChestIsolationRep) {
  const wristSeparationRange = Math.max(
    0,
    activeRep.maximumWristSeparation - activeRep.minimumWristSeparation,
  );
  const good = wristSeparationRange >= 85;
  const usable = wristSeparationRange >= 55;

  return {
    points: good ? 45 : usable ? 34 : 17,
    wristSeparationRange,
    signal: {
      area: "Range",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? "The hands moved through a consistent open-to-closed range."
        : "Bring the arms through a slightly larger comfortable range before reopening.",
      timestampSeconds: activeRep.minimumWristSeparationAt,
    },
  };
}

function scoreElbowStability(activeRep: ActiveChestIsolationRep) {
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
        ? "The elbow bend stayed consistent through the close and return."
        : "Keep the elbow bend more consistent while the arms close and reopen.",
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
          ? "Slow the close and return so both phases stay controlled."
          : "Keep the close and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveChestIsolationRep,
  angles: FlyAngles,
  timestampSeconds: number,
): ActiveChestIsolationRep {
  const reachedCloserPosition =
    angles.wristSeparation < activeRep.minimumWristSeparation;
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
    minimumWristSeparationAt: reachedCloserPosition
      ? timestampSeconds
      : activeRep.minimumWristSeparationAt,
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

export function evaluateChestIsolationRep(
  activeRep: ActiveChestIsolationRep,
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

export function createChestIsolationCoach(): ChestIsolationCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateChestIsolationCoach(
  state: ChestIsolationCoachState,
  phase: ChestIsolationPhase,
  repetitionCount: number,
  angles: FlyAngles,
  timestampSeconds: number,
): ChestIsolationCoachState {
  const beganRep = state.previousPhase === "start" && phase === "working";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumWristSeparation: angles.wristSeparation,
      maximumWristSeparation: angles.wristSeparation,
      minimumWristSeparationAt: timestampSeconds,
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
      evaluateChestIsolationRep(activeRep, repetitionCount, timestampSeconds),
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

export function getLiveChestIsolationCue(phase: ChestIsolationPhase) {
  switch (phase) {
    case "find-start":
      return "Begin with both arms open so tracking can establish the start.";
    case "start":
      return "Ready—close the arms while keeping the elbow bend consistent.";
    case "working":
      return "Keep both hands visible as the arms move through the working range.";
    case "peak":
      return "Closed range detected—reopen the arms with control.";
    case "returning":
      return "Finish with both arms open to complete the repetition.";
  }
}
