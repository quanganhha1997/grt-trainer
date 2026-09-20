import catalog from "./training-programs.json";

export type ProgramExercise = {
  name: string;
  sets: string;
  reps: string;
  effort: string;
  rest: string;
  note?: string;
};

export type ProgramSession = {
  id: string;
  label: string;
  exercises: ProgramExercise[];
};

export type ProgramPhase = {
  id: string;
  label: string;
  weeks: string;
  sessions: ProgramSession[];
};

export type TrainingProgram = {
  id: string;
  name: string;
  split: string;
  schedule: string;
  weeks: string;
  level: string;
  focus: string;
  summary: string;
  phases: ProgramPhase[];
  methodNotes: Array<{ term: string; definition: string }>;
};

export const TRAINING_PROGRAMS = catalog as TrainingProgram[];

export function getProgramExerciseCount(program: TrainingProgram) {
  return program.phases.reduce(
    (total, phase) => total + phase.sessions.reduce(
      (phaseTotal, session) => phaseTotal + session.exercises.length,
      0,
    ),
    0,
  );
}
