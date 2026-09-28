export type ExerciseId =
  | "bodyweight_squat"
  | "reverse_lunge"
  | "push_up"
  | "glute_bridge"
  | "plank"
  | "dumbbell_row";

export type ExerciseDefinition = {
  id: ExerciseId;
  name: string;
  category: "Lower body" | "Upper body" | "Core";
  equipment: "Bodyweight" | "Dumbbells";
  target: string;
  defaultSets: number;
  defaultAmount: number;
  unit: "reps" | "seconds";
  formCheckAvailable: boolean;
};

export const EXERCISE_CATALOG: ExerciseDefinition[] = [
  {
    id: "bodyweight_squat",
    name: "Bodyweight squat",
    category: "Lower body",
    equipment: "Bodyweight",
    target: "Quads, glutes, and trunk",
    defaultSets: 3,
    defaultAmount: 10,
    unit: "reps",
    formCheckAvailable: true,
  },
  {
    id: "reverse_lunge",
    name: "Reverse lunge",
    category: "Lower body",
    equipment: "Bodyweight",
    target: "Quads, glutes, and balance",
    defaultSets: 3,
    defaultAmount: 8,
    unit: "reps",
    formCheckAvailable: true,
  },
  {
    id: "push_up",
    name: "Push-up",
    category: "Upper body",
    equipment: "Bodyweight",
    target: "Chest, shoulders, and triceps",
    defaultSets: 3,
    defaultAmount: 8,
    unit: "reps",
    formCheckAvailable: false,
  },
  {
    id: "glute_bridge",
    name: "Glute bridge",
    category: "Lower body",
    equipment: "Bodyweight",
    target: "Glutes and posterior chain",
    defaultSets: 3,
    defaultAmount: 12,
    unit: "reps",
    formCheckAvailable: false,
  },
  {
    id: "plank",
    name: "Forearm plank",
    category: "Core",
    equipment: "Bodyweight",
    target: "Trunk stability",
    defaultSets: 3,
    defaultAmount: 30,
    unit: "seconds",
    formCheckAvailable: false,
  },
  {
    id: "dumbbell_row",
    name: "Dumbbell row",
    category: "Upper body",
    equipment: "Dumbbells",
    target: "Back, rear shoulders, and arms",
    defaultSets: 3,
    defaultAmount: 10,
    unit: "reps",
    formCheckAvailable: false,
  },
];

export function getExerciseDefinition(id: ExerciseId) {
  return EXERCISE_CATALOG.find((exercise) => exercise.id === id) ?? null;
}
