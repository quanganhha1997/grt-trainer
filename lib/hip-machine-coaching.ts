import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { HipMachineAngles } from "./pose-geometry";
import type {
  HipMachineExerciseId,
  HipMachinePhase,
} from "./hip-machine-repetition";

type ActiveHipMachineRep = {
  startedAt: number;
  minimumKneeSeparation: number;
  maximumKneeSeparation: number;
  peakRangeAt: number;
  maximumKneeAsymmetry: number;
  maximumKneeAsymmetryAt: number;
  sampleCount: number;
};

export type HipMachineCoachState = {
  activeRep: ActiveHipMachineRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: HipMachinePhase;
  previousRepetitionCount: number;
};

function scoreRange(
  activeRep: ActiveHipMachineRep,
  exerciseId: HipMachineExerciseId,
) {
  const kneeSeparationRange = Math.max(
    0,
    activeRep.maximumKneeSeparation - activeRep.minimumKneeSeparation,
  );
  const good = kneeSeparationRange >= 60;
  const usable = kneeSeparationRange >= 35;
  const opensDuringRep = exerciseId === "abductor_machine";

  return {
    points: good ? 45 : usable ? 34 : 17,
    kneeSeparationRange,
    signal: {
      area: "Range",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? `A ${Math.round(kneeSeparationRange)}% knee-spacing change was detected.`
        : opensDuringRep
          ? "Open the knees through a slightly larger comfortable range before returning."
          : "Bring the knees through a slightly larger comfortable range before reopening.",
      timestampSeconds: activeRep.peakRangeAt,
    },
  };
}

function scoreSymmetry(activeRep: ActiveHipMachineRep) {
  const good = activeRep.maximumKneeAsymmetry <= 18;
  const usable = activeRep.maximumKneeAsymmetry <= 30;

  return {
    points: good ? 30 : usable ? 22 : 10,
    signal: {
      area: "Knee symmetry",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? "Both knees stayed evenly spaced from the body center."
        : "Move both knees more evenly through the working range and return.",
      timestampSeconds: activeRep.maximumKneeAsymmetryAt,
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
          ? "Slow the working phase and return so both stay controlled."
          : "Keep the working phase and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveHipMachineRep,
  angles: HipMachineAngles,
  timestampSeconds: number,
  exerciseId: HipMachineExerciseId,
): ActiveHipMachineRep {
  const reachedNewPeak = exerciseId === "abductor_machine"
    ? angles.kneeSeparation > activeRep.maximumKneeSeparation
    : angles.kneeSeparation < activeRep.minimumKneeSeparation;
  const reachedNewAsymmetry =
    angles.kneeAsymmetry > activeRep.maximumKneeAsymmetry;

  return {
    ...activeRep,
    minimumKneeSeparation: Math.min(
      activeRep.minimumKneeSeparation,
      angles.kneeSeparation,
    ),
    maximumKneeSeparation: Math.max(
      activeRep.maximumKneeSeparation,
      angles.kneeSeparation,
    ),
    peakRangeAt: reachedNewPeak ? timestampSeconds : activeRep.peakRangeAt,
    maximumKneeAsymmetry: Math.max(
      activeRep.maximumKneeAsymmetry,
      angles.kneeAsymmetry,
    ),
    maximumKneeAsymmetryAt: reachedNewAsymmetry
      ? timestampSeconds
      : activeRep.maximumKneeAsymmetryAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateHipMachineRep(
  activeRep: ActiveHipMachineRep,
  repetition: number,
  completedAt: number,
  exerciseId: HipMachineExerciseId,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const range = scoreRange(activeRep, exerciseId);
  const symmetry = scoreSymmetry(activeRep);
  const tempo = scoreTempo(durationSeconds, midpoint);
  const signals: FormCoachingSignal[] = [
    range.signal,
    symmetry.signal,
    tempo.signal,
  ];
  const score = range.points + symmetry.points + tempo.points;

  return {
    repetition,
    score,
    rating: score >= 85 ? "Strong" : score >= 70 ? "Good" : "Needs attention",
    minimumKneeAngle: 0,
    minimumHipAngle: 0,
    maximumTorsoLean: 0,
    minimumKneeSeparation: activeRep.minimumKneeSeparation,
    maximumKneeSeparation: activeRep.maximumKneeSeparation,
    kneeSeparationRange: range.kneeSeparationRange,
    maximumKneeAsymmetry: activeRep.maximumKneeAsymmetry,
    durationSeconds,
    sampleCount: activeRep.sampleCount,
    startedAtSeconds: activeRep.startedAt,
    completedAtSeconds: completedAt,
    reviewAtSeconds:
      signals.find((signal) => signal.status === "adjust")?.timestampSeconds ??
      activeRep.peakRangeAt,
    signals,
  };
}

export function createHipMachineCoach(): HipMachineCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateHipMachineCoach(
  state: HipMachineCoachState,
  phase: HipMachinePhase,
  repetitionCount: number,
  angles: HipMachineAngles,
  timestampSeconds: number,
  exerciseId: HipMachineExerciseId,
): HipMachineCoachState {
  const beganRep = state.previousPhase === "start" && phase === "working";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumKneeSeparation: angles.kneeSeparation,
      maximumKneeSeparation: angles.kneeSeparation,
      peakRangeAt: timestampSeconds,
      maximumKneeAsymmetry: angles.kneeAsymmetry,
      maximumKneeAsymmetryAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(
      activeRep,
      angles,
      timestampSeconds,
      exerciseId,
    );
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateHipMachineRep(
        activeRep,
        repetitionCount,
        timestampSeconds,
        exerciseId,
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

export function getLiveHipMachineCue(
  phase: HipMachinePhase,
  exerciseId: HipMachineExerciseId,
) {
  const opensDuringRep = exerciseId === "abductor_machine";

  switch (phase) {
    case "find-start":
      return opensDuringRep
        ? "Begin with both knees in the closed start position."
        : "Begin with both knees in the open start position.";
    case "start":
      return opensDuringRep
        ? "Ready—open both knees evenly."
        : "Ready—bring both knees inward evenly.";
    case "working":
      return "Keep both hips and knees visible through the working range.";
    case "peak":
      return opensDuringRep
        ? "Open range detected—return the knees with control."
        : "Closed range detected—reopen the knees with control.";
    case "returning":
      return opensDuringRep
        ? "Finish with the knees closed to complete the repetition."
        : "Finish with the knees open to complete the repetition.";
  }
}
