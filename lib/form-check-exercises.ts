export type FormCheckExerciseId =
  | "bodyweight_squat"
  | "barbell_back_squat"
  | "deadlift"
  | "romanian_deadlift"
  | "bulgarian_split_squat"
  | "lunge"
  | "flat_bench_press"
  | "incline_bench_press"
  | "barbell_overhead_press"
  | "dumbbell_shoulder_press"
  | "chest_supported_row"
  | "bent_over_row"
  | "single_arm_dumbbell_row"
  | "pull_up"
  | "lat_pulldown"
  | "leg_extension"
  | "leg_curl"
  | "biceps_curl"
  | "triceps_pushdown"
  | "triceps_extension"
  | "crunch"
  | "reverse_crunch"
  | "leg_raise"
  | "standing_calf_raise"
  | "seated_calf_raise"
  | "lateral_raise"
  | "pectoral_fly"
  | "rear_delt_fly"
  | "lat_prayer"
  | "triceps_dip"
  | "adductor_machine"
  | "abductor_machine";

export type FormCheckFamily =
  | "squat"
  | "hinge"
  | "unilateral"
  | "press"
  | "row"
  | "vertical-pull"
  | "knee-isolation"
  | "arm-isolation"
  | "core-flexion"
  | "calf-isolation"
  | "shoulder-isolation"
  | "chest-isolation"
  | "rear-shoulder-isolation"
  | "straight-arm-pull"
  | "hip-machine";

export type FormCheckExercise = {
  id: FormCheckExerciseId;
  name: string;
  family: FormCheckFamily;
  familyLabel: string;
  recordingSlug: string;
  instructions: string[];
};

export type FormCheckBodyAreaId =
  | "legs"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core";

export type FormCheckBodyArea = {
  id: FormCheckBodyAreaId;
  label: string;
  exerciseIds: FormCheckExerciseId[];
};

export const FORM_CHECK_EXERCISES: FormCheckExercise[] = [
  {
    id: "bodyweight_squat",
    name: "Bodyweight squat",
    family: "squat",
    familyLabel: "Squat",
    recordingSlug: "squat",
    instructions: [
      "Use a side view",
      "Show your full body",
      "Keep it 5 - 30 seconds",
      "Record at least one full rep",
      "Use good lighting",
      "Keep the camera still",
    ],
  },
  {
    id: "barbell_back_squat",
    name: "Barbell back squat",
    family: "squat",
    familyLabel: "Squat",
    recordingSlug: "barbell-back-squat",
    instructions: [
      "Use a side view",
      "Show your full body and the bar",
      "Keep it 5 - 30 seconds",
      "Begin and finish standing",
      "Keep your feet visible through the full rep",
      "Keep the camera still",
    ],
  },
  {
    id: "deadlift",
    name: "Deadlift",
    family: "hinge",
    familyLabel: "Hip hinge",
    recordingSlug: "deadlift",
    instructions: [
      "Use a side view",
      "Show your full body and the weight",
      "Keep it 5 - 30 seconds",
      "Start and finish standing",
      "Use good lighting",
      "Keep the camera still",
    ],
  },
  {
    id: "romanian_deadlift",
    name: "Romanian deadlift",
    family: "hinge",
    familyLabel: "Hip hinge",
    recordingSlug: "romanian-deadlift",
    instructions: [
      "Use a side view",
      "Show your full body and the weight",
      "Keep it 5 - 30 seconds",
      "Start and finish standing",
      "Use good lighting",
      "Keep the camera still",
    ],
  },
  {
    id: "bulgarian_split_squat",
    name: "Bulgarian split squat",
    family: "unilateral",
    familyLabel: "Single leg",
    recordingSlug: "bulgarian-split-squat",
    instructions: [
      "Use a side view",
      "Show your full body and the bench",
      "Keep it 5 - 30 seconds",
      "Keep your front foot visible",
      "Record at least one full rep",
      "Keep the camera still",
    ],
  },
  {
    id: "lunge",
    name: "Lunge",
    family: "unilateral",
    familyLabel: "Single leg",
    recordingSlug: "lunge",
    instructions: [
      "Use a side view",
      "Show your full body",
      "Keep it 5 - 30 seconds",
      "Stay inside the frame",
      "Record at least one full rep",
      "Keep the camera still",
    ],
  },
  {
    id: "flat_bench_press",
    name: "Flat bench press",
    family: "press",
    familyLabel: "Press",
    recordingSlug: "flat-bench-press",
    instructions: [
      "Use a side view",
      "Show your shoulders, elbows, wrists, and bench",
      "Keep it 5 - 30 seconds",
      "Begin and finish with the arms extended",
      "Keep the camera level with the bench",
      "Keep the camera still",
    ],
  },
  {
    id: "incline_bench_press",
    name: "Incline bench press",
    family: "press",
    familyLabel: "Press",
    recordingSlug: "incline-bench-press",
    instructions: [
      "Use a side view",
      "Show your shoulders, elbows, wrists, and bench",
      "Keep it 5 - 30 seconds",
      "Begin and finish with the arms extended",
      "Keep the camera level with the bench",
      "Keep the camera still",
    ],
  },
  {
    id: "barbell_overhead_press",
    name: "Barbell overhead press",
    family: "press",
    familyLabel: "Overhead",
    recordingSlug: "barbell-overhead-press",
    instructions: [
      "Use a side view",
      "Show your full body and the bar",
      "Keep it 5 - 30 seconds",
      "Begin with the arms extended",
      "Lower the bar near shoulder height",
      "Keep the camera still",
    ],
  },
  {
    id: "dumbbell_shoulder_press",
    name: "Dumbbell shoulder press",
    family: "press",
    familyLabel: "Overhead",
    recordingSlug: "dumbbell-shoulder-press",
    instructions: [
      "Use a side view",
      "Show your torso, arms, and bench if seated",
      "Keep it 5 - 30 seconds",
      "Begin with the arms extended",
      "Lower the weights near shoulder height",
      "Keep the camera still",
    ],
  },
  {
    id: "chest_supported_row",
    name: "Chest-supported row",
    family: "row",
    familyLabel: "Row",
    recordingSlug: "chest-supported-row",
    instructions: [
      "Use a side view",
      "Show your torso, arms, and support",
      "Keep it 5 - 30 seconds",
      "Begin with the arms extended",
      "Record the full pull and return",
      "Keep the camera still",
    ],
  },
  {
    id: "bent_over_row",
    name: "Bent-over row",
    family: "row",
    familyLabel: "Row",
    recordingSlug: "bent-over-row",
    instructions: [
      "Use a side view",
      "Show your torso, arms, and the weight",
      "Keep it 5 - 30 seconds",
      "Begin with the arms extended",
      "Keep your hinged torso visible",
      "Keep the camera still",
    ],
  },
  {
    id: "single_arm_dumbbell_row",
    name: "Single-arm dumbbell row",
    family: "row",
    familyLabel: "Row",
    recordingSlug: "single-arm-dumbbell-row",
    instructions: [
      "Use the working-arm side view",
      "Show your torso, shoulder, elbow, and wrist",
      "Keep it 5 - 30 seconds",
      "Begin with the working arm extended",
      "Record the full pull and return",
      "Keep the camera still",
    ],
  },
  {
    id: "pull_up",
    name: "Pull-up / chin-up",
    family: "vertical-pull",
    familyLabel: "Vertical pull",
    recordingSlug: "pull-up",
    instructions: [
      "Use a side view",
      "Show your full body and the bar",
      "Keep it 5 - 30 seconds",
      "Begin hanging with the arms extended",
      "Record the full pull and return",
      "Keep the camera still",
    ],
  },
  {
    id: "lat_pulldown",
    name: "Lat pulldown",
    family: "vertical-pull",
    familyLabel: "Vertical pull",
    recordingSlug: "lat-pulldown",
    instructions: [
      "Use a side view",
      "Show your torso, shoulders, elbows, and wrists",
      "Keep it 5 - 30 seconds",
      "Begin with the arms extended",
      "Record the full pull and return",
      "Keep the camera still",
    ],
  },
  {
    id: "leg_extension",
    name: "Leg extension",
    family: "knee-isolation",
    familyLabel: "Leg isolation",
    recordingSlug: "leg-extension",
    instructions: [
      "Use a side view",
      "Show one full working side and the machine",
      "Keep it 5 - 30 seconds",
      "Begin with the working knee bent",
      "Record one working leg at a time",
      "Keep the camera still",
    ],
  },
  {
    id: "leg_curl",
    name: "Leg curl",
    family: "knee-isolation",
    familyLabel: "Leg isolation",
    recordingSlug: "leg-curl",
    instructions: [
      "Use a side view",
      "Show one full working side and the machine",
      "Keep it 5 - 30 seconds",
      "Begin with the working leg extended",
      "Record one working leg at a time",
      "Keep the camera still",
    ],
  },
  {
    id: "biceps_curl",
    name: "Biceps curl",
    family: "arm-isolation",
    familyLabel: "Arm isolation",
    recordingSlug: "biceps-curl",
    instructions: [
      "Use a side view",
      "Show the working shoulder, elbow, and wrist",
      "Keep it 5 - 30 seconds",
      "Begin with the working arm extended",
      "Record one working arm at a time",
      "Keep the camera still",
    ],
  },
  {
    id: "triceps_pushdown",
    name: "Triceps pushdown",
    family: "arm-isolation",
    familyLabel: "Arm isolation",
    recordingSlug: "triceps-pushdown",
    instructions: [
      "Use a side view",
      "Show the working shoulder, elbow, and wrist",
      "Keep it 5 - 30 seconds",
      "Begin with the working elbow bent",
      "Record one working arm at a time",
      "Keep the camera still",
    ],
  },
  {
    id: "triceps_extension",
    name: "Triceps extension",
    family: "arm-isolation",
    familyLabel: "Arm isolation",
    recordingSlug: "triceps-extension",
    instructions: [
      "Use a side view",
      "Show the working shoulder, elbow, and wrist",
      "Keep it 5 - 30 seconds",
      "Begin with the working arm extended",
      "Show the bench when performing a skull crusher",
      "Keep the camera still",
    ],
  },
  {
    id: "crunch",
    name: "Crunch",
    family: "core-flexion",
    familyLabel: "Core",
    recordingSlug: "crunch",
    instructions: [
      "Use a side view",
      "Show your shoulders, hips, knees, and ankles",
      "Keep it 5 - 30 seconds",
      "Begin in the extended start position",
      "Keep your lower body visible and steady",
      "Keep the camera still",
    ],
  },
  {
    id: "reverse_crunch",
    name: "Reverse crunch",
    family: "core-flexion",
    familyLabel: "Core",
    recordingSlug: "reverse-crunch",
    instructions: [
      "Use a side view",
      "Show your shoulders, hips, knees, and ankles",
      "Keep it 5 - 30 seconds",
      "Begin with the hips in the open start position",
      "Keep your shoulders visible and steady",
      "Keep the camera still",
    ],
  },
  {
    id: "leg_raise",
    name: "Leg raise",
    family: "core-flexion",
    familyLabel: "Core",
    recordingSlug: "leg-raise",
    instructions: [
      "Use a side view",
      "Show your shoulders, hips, knees, and ankles",
      "Keep it 5 - 30 seconds",
      "Begin with the hips extended",
      "Keep your torso visible through the full rep",
      "Keep the camera still",
    ],
  },
  {
    id: "standing_calf_raise",
    name: "Standing calf raise",
    family: "calf-isolation",
    familyLabel: "Calf",
    recordingSlug: "standing-calf-raise",
    instructions: [
      "Use a side view",
      "Show the working hip, knee, ankle, and toes",
      "Keep it 5 - 30 seconds",
      "Begin with the heel lowered",
      "Record one clearly visible working side",
      "Keep the camera still",
    ],
  },
  {
    id: "seated_calf_raise",
    name: "Seated calf raise",
    family: "calf-isolation",
    familyLabel: "Calf",
    recordingSlug: "seated-calf-raise",
    instructions: [
      "Use a side view",
      "Show the working hip, knee, ankle, and toes",
      "Keep it 5 - 30 seconds",
      "Begin with the heel lowered",
      "Keep the working thigh and foot visible",
      "Keep the camera still",
    ],
  },
  {
    id: "lateral_raise",
    name: "Lateral raise",
    family: "shoulder-isolation",
    familyLabel: "Shoulder isolation",
    recordingSlug: "lateral-raise",
    instructions: [
      "Use a front view",
      "Show your torso, shoulders, elbows, and wrists",
      "Keep it 5 - 30 seconds",
      "Begin with the working arm lowered",
      "Keep the full working arm visible",
      "Keep the camera still",
    ],
  },
  {
    id: "pectoral_fly",
    name: "Pectoral fly",
    family: "chest-isolation",
    familyLabel: "Chest isolation",
    recordingSlug: "pectoral-fly",
    instructions: [
      "Use a front view",
      "Show both shoulders, elbows, wrists, and hands",
      "Keep it 5 - 30 seconds",
      "Begin with both arms open",
      "Keep both hands visible through the full rep",
      "Keep the camera still",
    ],
  },
  {
    id: "rear_delt_fly",
    name: "Rear-delt fly",
    family: "rear-shoulder-isolation",
    familyLabel: "Rear shoulder",
    recordingSlug: "rear-delt-fly",
    instructions: [
      "Use a rear view",
      "Show both shoulders, elbows, wrists, and hands",
      "Keep it 5 - 30 seconds",
      "Begin with both arms in the closed start position",
      "Keep both hands visible through the full rep",
      "Keep the camera still",
    ],
  },
  {
    id: "lat_prayer",
    name: "Lat prayer",
    family: "straight-arm-pull",
    familyLabel: "Straight-arm pull",
    recordingSlug: "lat-prayer",
    instructions: [
      "Use a side view",
      "Show one full side of your torso and working arm",
      "Keep it 5 - 30 seconds",
      "Begin with the arm extended overhead",
      "Keep the shoulder, elbow, wrist, and hip visible",
      "Keep the camera still",
    ],
  },
  {
    id: "triceps_dip",
    name: "Dip",
    family: "press",
    familyLabel: "Dip",
    recordingSlug: "dip",
    instructions: [
      "Use a side view",
      "Show your torso, arms, hips, and support",
      "Keep it 5 - 30 seconds",
      "Begin and finish with the arms extended",
      "Keep the shoulder, elbow, wrist, and hip visible",
      "Keep the camera still",
    ],
  },
  {
    id: "adductor_machine",
    name: "Adductor machine",
    family: "hip-machine",
    familyLabel: "Hip machine",
    recordingSlug: "adductor-machine",
    instructions: [
      "Use a centered front view",
      "Show your shoulders, hips, knees, and feet",
      "Keep it 5 - 30 seconds",
      "Begin with both knees in the open position",
      "Keep both knees visible through the full rep",
      "Keep the camera still",
    ],
  },
  {
    id: "abductor_machine",
    name: "Abductor machine",
    family: "hip-machine",
    familyLabel: "Hip machine",
    recordingSlug: "abductor-machine",
    instructions: [
      "Use a centered front view",
      "Show your shoulders, hips, knees, and feet",
      "Keep it 5 - 30 seconds",
      "Begin with both knees in the closed position",
      "Keep both knees visible through the full rep",
      "Keep the camera still",
    ],
  },
];

export const FORM_CHECK_BODY_AREAS: FormCheckBodyArea[] = [
  {
    id: "legs",
    label: "Legs",
    exerciseIds: [
      "bodyweight_squat",
      "barbell_back_squat",
      "deadlift",
      "romanian_deadlift",
      "bulgarian_split_squat",
      "lunge",
      "leg_extension",
      "leg_curl",
      "standing_calf_raise",
      "seated_calf_raise",
      "adductor_machine",
      "abductor_machine",
    ],
  },
  {
    id: "chest",
    label: "Chest",
    exerciseIds: [
      "flat_bench_press",
      "incline_bench_press",
      "pectoral_fly",
      "triceps_dip",
    ],
  },
  {
    id: "back",
    label: "Back",
    exerciseIds: [
      "chest_supported_row",
      "bent_over_row",
      "single_arm_dumbbell_row",
      "pull_up",
      "lat_pulldown",
      "lat_prayer",
    ],
  },
  {
    id: "shoulders",
    label: "Shoulders",
    exerciseIds: [
      "barbell_overhead_press",
      "dumbbell_shoulder_press",
      "lateral_raise",
      "rear_delt_fly",
    ],
  },
  {
    id: "arms",
    label: "Arms",
    exerciseIds: [
      "biceps_curl",
      "triceps_pushdown",
      "triceps_extension",
    ],
  },
  {
    id: "core",
    label: "Core",
    exerciseIds: ["crunch", "reverse_crunch", "leg_raise"],
  },
];

export function getFormCheckExercisesByBodyArea(
  bodyAreaId: FormCheckBodyAreaId,
) {
  const bodyArea = FORM_CHECK_BODY_AREAS.find(
    (candidate) => candidate.id === bodyAreaId,
  );
  if (!bodyArea) return [];

  return bodyArea.exerciseIds.map((exerciseId) =>
    getFormCheckExercise(exerciseId),
  );
}

export function getFormCheckExercise(id: FormCheckExerciseId) {
  return FORM_CHECK_EXERCISES.find((exercise) => exercise.id === id) ?? FORM_CHECK_EXERCISES[0];
}

export function parseFormCheckExerciseId(value: string | null) {
  return FORM_CHECK_EXERCISES.find((exercise) => exercise.id === value)?.id ?? null;
}

export function findSupportedFormCheckExercise(exerciseName: string) {
  const normalized = exerciseName.trim().toLowerCase();

  if (normalized === "bodyweight squat") return getFormCheckExercise("bodyweight_squat");
  if (normalized === "barbell back squat") {
    return getFormCheckExercise("barbell_back_squat");
  }
  if (normalized === "deadlift") return getFormCheckExercise("deadlift");
  if (normalized === "romanian deadlift") return getFormCheckExercise("romanian_deadlift");
  if (
    normalized === "bulgarian split squat" ||
    normalized === "dumbbell bulgarian split squat"
  ) {
    return getFormCheckExercise("bulgarian_split_squat");
  }
  if (
    normalized === "walking lunge" ||
    normalized === "weighted lunge" ||
    normalized === "reverse lunge"
  ) {
    return getFormCheckExercise("lunge");
  }
  if (
    normalized === "flat barbell bench press" ||
    normalized === "flat dumbbell bench press"
  ) {
    return getFormCheckExercise("flat_bench_press");
  }
  if (
    normalized === "incline barbell bench press" ||
    normalized === "incline dumbbell bench press"
  ) {
    return getFormCheckExercise("incline_bench_press");
  }
  if (normalized === "barbell overhead press") {
    return getFormCheckExercise("barbell_overhead_press");
  }
  if (
    normalized === "seated dumbbell shoulder press" ||
    normalized === "dumbbell shoulder press"
  ) {
    return getFormCheckExercise("dumbbell_shoulder_press");
  }
  if (
    normalized === "chest-supported row" ||
    normalized === "dumbbell seal row" ||
    normalized === "seated cable row" ||
    normalized === "machine row"
  ) {
    return getFormCheckExercise("chest_supported_row");
  }
  if (
    normalized === "t-bar row" ||
    normalized === "pendlay row" ||
    normalized === "bent-over smith machine row"
  ) {
    return getFormCheckExercise("bent_over_row");
  }
  if (
    normalized === "single-arm dumbbell row" ||
    normalized === "dumbbell row"
  ) {
    return getFormCheckExercise("single_arm_dumbbell_row");
  }
  if (
    normalized === "pull-up" ||
    normalized === "weighted pull-up" ||
    normalized === "chin-up" ||
    normalized === "sternum pull-up" ||
    normalized === "weighted chin-up"
  ) {
    return getFormCheckExercise("pull_up");
  }
  if (
    normalized === "lat pulldown" ||
    normalized === "close-grip lat pulldown"
  ) {
    return getFormCheckExercise("lat_pulldown");
  }
  if (
    normalized === "leg extension" ||
    normalized === "single-leg extension" ||
    normalized === "alternating leg extension"
  ) {
    return getFormCheckExercise("leg_extension");
  }
  if (
    normalized === "leg curl" ||
    normalized === "seated leg curl" ||
    normalized === "single-leg curl" ||
    normalized === "alternating leg curl"
  ) {
    return getFormCheckExercise("leg_curl");
  }
  if (
    normalized === "barbell curl" ||
    normalized === "ez-bar curl" ||
    normalized === "dumbbell curl" ||
    normalized === "dumbbell hammer curl" ||
    normalized === "dumbbell preacher curl" ||
    normalized === "ez-bar preacher curl" ||
    normalized === "single-arm cable curl" ||
    normalized === "seated hammer curl" ||
    normalized === "barbell concentration curl" ||
    normalized === "pinned hammer curl" ||
    normalized === "incline curl" ||
    normalized === "ez-bar reverse curl" ||
    normalized === "concentration curl" ||
    normalized === "pinwheel curl" ||
    normalized === "single-arm dumbbell curl"
  ) {
    return getFormCheckExercise("biceps_curl");
  }
  if (
    normalized === "cable pushdown" ||
    normalized === "cable pushdown (drop set)" ||
    normalized === "single-arm rope pushdown"
  ) {
    return getFormCheckExercise("triceps_pushdown");
  }
  if (
    normalized === "dumbbell skull crusher" ||
    normalized === "ez-bar skull crusher" ||
    normalized === "skull crusher" ||
    normalized === "french press" ||
    normalized === "cable triceps extension" ||
    normalized === "cable overhead extension" ||
    normalized === "single-arm overhead triceps extension"
  ) {
    return getFormCheckExercise("triceps_extension");
  }
  if (
    normalized === "decline crunch" ||
    normalized === "kneeling cable crunch"
  ) {
    return getFormCheckExercise("crunch");
  }
  if (normalized === "reverse crunch") {
    return getFormCheckExercise("reverse_crunch");
  }
  if (
    normalized === "roman chair leg raise" ||
    normalized === "hanging straight-leg raise" ||
    normalized === "hanging knee raise"
  ) {
    return getFormCheckExercise("leg_raise");
  }
  if (
    normalized === "smith machine calf raise" ||
    normalized === "standing machine calf raise" ||
    normalized === "single-leg dumbbell calf raise" ||
    normalized === "calf raise" ||
    normalized === "machine calf raise"
  ) {
    return getFormCheckExercise("standing_calf_raise");
  }
  if (
    normalized === "seated calf press" ||
    normalized === "seated machine calf raise" ||
    normalized === "seated calf raise"
  ) {
    return getFormCheckExercise("seated_calf_raise");
  }
  if (
    normalized === "lateral raise" ||
    normalized === "dumbbell lateral raise" ||
    normalized === "cable lateral raise" ||
    normalized === "machine lateral raise" ||
    normalized === "egyptian cable raise" ||
    normalized === "leaning lateral raise" ||
    normalized === "incline lateral raise"
  ) {
    return getFormCheckExercise("lateral_raise");
  }
  if (
    normalized === "incline cable flye" ||
    normalized === "cable pectoral flye" ||
    normalized === "machine pectoral flye" ||
    normalized === "standing cable flye" ||
    normalized === "incline flye or cable crossover"
  ) {
    return getFormCheckExercise("pectoral_fly");
  }
  if (
    normalized === "cable rear-delt flye" ||
    normalized === "dumbbell rear-delt flye" ||
    normalized === "machine rear-delt flye" ||
    normalized === "rear-delt flye" ||
    normalized === "bent-over flye"
  ) {
    return getFormCheckExercise("rear_delt_fly");
  }
  if (
    normalized === "lat prayer" ||
    normalized === "lat prayer (drop set)"
  ) {
    return getFormCheckExercise("lat_prayer");
  }
  if (normalized === "triceps dip" || normalized === "weighted dip") {
    return getFormCheckExercise("triceps_dip");
  }
  if (normalized === "adductor machine") {
    return getFormCheckExercise("adductor_machine");
  }
  if (normalized === "abductor machine") {
    return getFormCheckExercise("abductor_machine");
  }

  return null;
}

export function isOverheadPressExerciseId(
  id: FormCheckExerciseId,
): id is "barbell_overhead_press" | "dumbbell_shoulder_press" {
  return id === "barbell_overhead_press" || id === "dumbbell_shoulder_press";
}

export function isDipExerciseId(
  id: FormCheckExerciseId,
): id is "triceps_dip" {
  return id === "triceps_dip";
}

export function getFormCheckPath(id: FormCheckExerciseId) {
  return `/form-check?exercise=${id}`;
}
