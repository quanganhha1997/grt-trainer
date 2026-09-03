import {
  EXERCISE_CATALOG,
  getExerciseDefinition,
  type ExerciseId,
} from "@/lib/exercise-catalog";

export const WORKOUT_PLANS_KEY = "ai-personal-trainer.workout-plans.v1";
export const MAX_SAVED_WORKOUT_PLANS = 8;

export type WorkoutPlanExercise = {
  exerciseId: ExerciseId;
  sets: number;
  amount: number;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  createdAt: string;
  exercises: WorkoutPlanExercise[];
};

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isExerciseId(value: unknown): value is ExerciseId {
  return (
    typeof value === "string" &&
    EXERCISE_CATALOG.some((exercise) => exercise.id === value)
  );
}

function isPlanExercise(value: unknown): value is WorkoutPlanExercise {
  if (!value || typeof value !== "object") return false;
  const exercise = value as Partial<WorkoutPlanExercise>;
  if (!isExerciseId(exercise.exerciseId)) return false;
  const definition = getExerciseDefinition(exercise.exerciseId);
  const maximumAmount = definition?.unit === "seconds" ? 300 : 100;

  return (
    isFiniteInteger(exercise.sets) &&
    exercise.sets >= 1 &&
    exercise.sets <= 10 &&
    isFiniteInteger(exercise.amount) &&
    exercise.amount >= 1 &&
    exercise.amount <= maximumAmount
  );
}

function isWorkoutPlan(value: unknown): value is WorkoutPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<WorkoutPlan>;
  return (
    typeof plan.id === "string" &&
    typeof plan.name === "string" &&
    plan.name.trim().length > 0 &&
    plan.name.length <= 60 &&
    typeof plan.createdAt === "string" &&
    Array.isArray(plan.exercises) &&
    plan.exercises.length > 0 &&
    plan.exercises.length <= EXERCISE_CATALOG.length &&
    plan.exercises.every(isPlanExercise) &&
    new Set(plan.exercises.map((exercise) => exercise.exerciseId)).size ===
      plan.exercises.length
  );
}

export function createPlanExercise(exerciseId: ExerciseId): WorkoutPlanExercise {
  const exercise = getExerciseDefinition(exerciseId);
  if (!exercise) throw new Error("Unknown exercise");

  return {
    exerciseId,
    sets: exercise.defaultSets,
    amount: exercise.defaultAmount,
  };
}

export function createWorkoutPlan(
  name: string,
  exercises: WorkoutPlanExercise[],
  options?: { id?: string; createdAt?: string },
): WorkoutPlan {
  const trimmedName = name.trim().slice(0, 60);
  const uniqueExerciseCount = new Set(
    exercises.map((exercise) => exercise.exerciseId),
  ).size;
  if (
    !trimmedName ||
    exercises.length === 0 ||
    exercises.length > EXERCISE_CATALOG.length ||
    uniqueExerciseCount !== exercises.length ||
    !exercises.every(isPlanExercise)
  ) {
    throw new Error("A workout name and at least one exercise are required");
  }

  return {
    id:
      options?.id ??
      `routine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName,
    createdAt: options?.createdAt ?? new Date().toISOString(),
    exercises: exercises.map((exercise) => ({ ...exercise })),
  };
}

export function parseWorkoutPlans(value: string | null) {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWorkoutPlan).slice(0, MAX_SAVED_WORKOUT_PLANS);
  } catch {
    return [];
  }
}

export function prependWorkoutPlan(plans: WorkoutPlan[], plan: WorkoutPlan) {
  return [plan, ...plans.filter((savedPlan) => savedPlan.id !== plan.id)].slice(
    0,
    MAX_SAVED_WORKOUT_PLANS,
  );
}
