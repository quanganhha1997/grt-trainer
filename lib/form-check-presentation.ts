import {
  isOverheadPressExerciseId,
  type FormCheckBodyAreaId,
  type FormCheckExercise,
  type FormCheckFamily,
} from "@/lib/form-check-exercises";

export type FormCheckInstructionGroup = {
  title: "Frame" | "Clip" | "Camera";
  detail: string;
};

export type FormCheckInstructionContent = {
  groups: FormCheckInstructionGroup[];
  note?: string;
};

export const FORM_CHECK_CATEGORY_IMAGES: Record<FormCheckBodyAreaId, string> = {
  legs: "/grt/form-check-categories/legs.webp",
  chest: "/grt/form-check-categories/chest.webp",
  back: "/grt/form-check-categories/back.webp",
  shoulders: "/grt/form-check-categories/shoulders.webp",
  arms: "/grt/form-check-categories/arms.webp",
  core: "/grt/form-check-categories/core.webp",
};

const LIVE_TRACKING_LABELS: Partial<Record<FormCheckFamily, string>> = {
  squat: "squat",
  hinge: "hinge",
  unilateral: "single-leg",
  row: "row",
  "vertical-pull": "vertical pull",
  "knee-isolation": "leg isolation",
  "arm-isolation": "arm isolation",
  "core-flexion": "core",
  "calf-isolation": "calf",
  "shoulder-isolation": "shoulder isolation",
  "chest-isolation": "chest isolation",
  "rear-shoulder-isolation": "rear shoulder",
  "straight-arm-pull": "straight-arm pull",
  "hip-machine": "hip machine",
};

const CLIP_AND_CAMERA_INSTRUCTIONS = new Set([
  "keep it 5 - 30 seconds",
  "record at least one full rep",
  "use good lighting",
  "keep the camera still",
]);

function isFrameInstruction(instruction: string) {
  const normalized = instruction.toLowerCase();
  return (
    normalized.includes("view") ||
    normalized.startsWith("show ") ||
    normalized.includes(" visible") ||
    normalized.includes("inside the frame")
  );
}

export function getCaptureView(exercise: FormCheckExercise) {
  return exercise.instructions.some((instruction) =>
    instruction.toLowerCase().includes("front view"),
  )
    ? "front view"
    : "side view";
}

export function getFormCheckInstructionContent(
  exercise: FormCheckExercise,
): FormCheckInstructionContent {
  const frameInstructions = exercise.instructions.filter(isFrameInstruction);
  const note = exercise.instructions.find((instruction) => {
    const normalized = instruction.toLowerCase();
    return (
      !frameInstructions.includes(instruction) &&
      !CLIP_AND_CAMERA_INSTRUCTIONS.has(normalized)
    );
  });

  return {
    groups: [
      {
        title: "Frame",
        detail: frameInstructions.join(". ").replace(/\.\s*\./g, "."),
      },
      {
        title: "Clip",
        detail: "Record 5 - 30 seconds with at least one complete repetition.",
      },
      {
        title: "Camera",
        detail: "Use good lighting and keep the camera still.",
      },
    ],
    note,
  };
}

export function getLiveTrackingLabel(exercise: FormCheckExercise) {
  if (exercise.family === "press") {
    return isOverheadPressExerciseId(exercise.id) ? "overhead" : "press";
  }

  return LIVE_TRACKING_LABELS[exercise.family] ?? "movement";
}
