import type { FormCoachingSignal, FormRepAnalysis } from "./form-analysis";
import type { CalfRaiseAngles } from "./pose-geometry";
import type {
  CalfIsolationExerciseId,
  CalfIsolationPhase,
} from "./calf-isolation-repetition";

type ActiveCalfIsolationRep = {
  startedAt: number;
  minimumAnkleAngle: number;
  maximumAnkleAngle: number;
  maximumAnkleAngleAt: number;
  minimumKneeAngle: number;
  maximumKneeAngle: number;
  kneeDriftAt: number;
  sampleCount: number;
};

export type CalfIsolationCoachState = {
  activeRep: ActiveCalfIsolationRep | null;
  completedReps: FormRepAnalysis[];
  previousPhase: CalfIsolationPhase;
  previousRepetitionCount: number;
};

function scoreRange(activeRep: ActiveCalfIsolationRep) {
  const ankleAngleRange = Math.max(
    0,
    activeRep.maximumAnkleAngle - activeRep.minimumAnkleAngle,
  );
  const good = ankleAngleRange >= 20;
  const usable = ankleAngleRange >= 12;

  return {
    points: good ? 45 : usable ? 34 : 17,
    ankleAngleRange,
    signal: {
      area: "Range",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? `A ${Math.round(ankleAngleRange)}° ankle-angle change was detected.`
        : "Raise the heel through a slightly larger comfortable range before returning.",
      timestampSeconds: activeRep.maximumAnkleAngleAt,
    },
  };
}

function scoreKneeStability(
  activeRep: ActiveCalfIsolationRep,
  exerciseId: CalfIsolationExerciseId,
) {
  const kneeAngleRange = Math.max(
    0,
    activeRep.maximumKneeAngle - activeRep.minimumKneeAngle,
  );
  const good = kneeAngleRange <= 8;

  return {
    points: good ? 30 : kneeAngleRange <= 15 ? 22 : 10,
    kneeAngleRange,
    signal: {
      area: "Knee stability",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? exerciseId === "seated_calf_raise"
          ? "The bent-knee position stayed stable through the raise and return."
          : "The knee position stayed stable through the raise and return."
        : "Keep the knee position steadier as the heel rises and lowers.",
      timestampSeconds: activeRep.kneeDriftAt,
    },
  };
}

function scoreTempo(durationSeconds: number, timestampSeconds: number) {
  const good = durationSeconds >= 1.5 && durationSeconds <= 5.5;

  return {
    points: good ? 25 : durationSeconds >= 1 && durationSeconds <= 7 ? 18 : 10,
    signal: {
      area: "Tempo",
      status: good ? "good" as const : "adjust" as const,
      message: good
        ? `Controlled ${durationSeconds.toFixed(1)}-second repetition.`
        : durationSeconds < 1.5
          ? "Slow the raise and return so both phases stay controlled."
          : "Keep the raise and return moving at a steadier pace.",
      timestampSeconds,
    },
  };
}

function captureSample(
  activeRep: ActiveCalfIsolationRep,
  angles: CalfRaiseAngles,
  timestampSeconds: number,
): ActiveCalfIsolationRep {
  const reachedHigherAnkle = angles.ankle > activeRep.maximumAnkleAngle;
  const reachedNewKneeExtreme =
    angles.knee < activeRep.minimumKneeAngle ||
    angles.knee > activeRep.maximumKneeAngle;

  return {
    ...activeRep,
    minimumAnkleAngle: Math.min(activeRep.minimumAnkleAngle, angles.ankle),
    maximumAnkleAngle: Math.max(activeRep.maximumAnkleAngle, angles.ankle),
    maximumAnkleAngleAt: reachedHigherAnkle
      ? timestampSeconds
      : activeRep.maximumAnkleAngleAt,
    minimumKneeAngle: Math.min(activeRep.minimumKneeAngle, angles.knee),
    maximumKneeAngle: Math.max(activeRep.maximumKneeAngle, angles.knee),
    kneeDriftAt: reachedNewKneeExtreme
      ? timestampSeconds
      : activeRep.kneeDriftAt,
    sampleCount: activeRep.sampleCount + 1,
  };
}

export function evaluateCalfIsolationRep(
  activeRep: ActiveCalfIsolationRep,
  repetition: number,
  completedAt: number,
  exerciseId: CalfIsolationExerciseId,
): FormRepAnalysis {
  const durationSeconds = Math.max(0, completedAt - activeRep.startedAt);
  const midpoint = activeRep.startedAt + durationSeconds / 2;
  const range = scoreRange(activeRep);
  const stability = scoreKneeStability(activeRep, exerciseId);
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
    minimumKneeAngle: activeRep.minimumKneeAngle,
    maximumKneeAngle: activeRep.maximumKneeAngle,
    minimumHipAngle: 0,
    maximumTorsoLean: 0,
    minimumAnkleAngle: activeRep.minimumAnkleAngle,
    maximumAnkleAngle: activeRep.maximumAnkleAngle,
    ankleAngleRange: range.ankleAngleRange,
    bodyPositionRange: stability.kneeAngleRange,
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

export function createCalfIsolationCoach(): CalfIsolationCoachState {
  return {
    activeRep: null,
    completedReps: [],
    previousPhase: "find-start",
    previousRepetitionCount: 0,
  };
}

export function updateCalfIsolationCoach(
  state: CalfIsolationCoachState,
  phase: CalfIsolationPhase,
  repetitionCount: number,
  angles: CalfRaiseAngles,
  timestampSeconds: number,
  exerciseId: CalfIsolationExerciseId,
): CalfIsolationCoachState {
  const beganRep = state.previousPhase === "start" && phase === "working";
  let activeRep = state.activeRep;
  let completedReps = state.completedReps;

  if (beganRep) {
    activeRep = {
      startedAt: timestampSeconds,
      minimumAnkleAngle: angles.ankle,
      maximumAnkleAngle: angles.ankle,
      maximumAnkleAngleAt: timestampSeconds,
      minimumKneeAngle: angles.knee,
      maximumKneeAngle: angles.knee,
      kneeDriftAt: timestampSeconds,
      sampleCount: 1,
    };
  } else if (activeRep) {
    activeRep = captureSample(activeRep, angles, timestampSeconds);
  }

  if (repetitionCount > state.previousRepetitionCount && activeRep) {
    completedReps = [
      ...completedReps,
      evaluateCalfIsolationRep(
        activeRep,
        repetitionCount,
        timestampSeconds,
        exerciseId,
      ),
    ];
    activeRep = null;
  } else if (
    activeRep &&
    phase === "start" &&
    state.previousPhase !== "start"
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

export function getLiveCalfIsolationCue(
  phase: CalfIsolationPhase,
  exerciseId: CalfIsolationExerciseId,
) {
  switch (phase) {
    case "find-start":
      return "Begin with the heel lowered so tracking can establish the start.";
    case "start":
      return exerciseId === "seated_calf_raise"
        ? "Ready—raise the heel while keeping the bent knee steady."
        : "Ready—raise the heel while keeping the knee position steady.";
    case "working":
      return "Keep the knee steady as the heel rises through the working range.";
    case "peak":
      return "Top range detected—lower the heel to the start with control.";
    case "returning":
      return "Finish with the heel lowered to complete the repetition.";
  }
}
