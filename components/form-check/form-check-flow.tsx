"use client";

import { Check } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Input } from "@/components/ui/input";
import {
  FORM_CHECK_BODY_AREAS,
  FORM_CHECK_EXERCISES,
  getFormCheckExercisesByBodyArea,
  type FormCheckBodyAreaId,
  type FormCheckExercise,
  type FormCheckExerciseId,
} from "@/lib/form-check-exercises";
import {
  FORM_CHECK_CATEGORY_IMAGES,
  getFormCheckInstructionContent,
} from "@/lib/form-check-presentation";
import { sitePath } from "@/lib/site-path";

type ExerciseSelectionState =
  | { view: "areas"; bodyAreaId: null; query: "" }
  | { view: "area"; bodyAreaId: FormCheckBodyAreaId; query: "" }
  | { view: "all"; bodyAreaId: null; query: string };

const INITIAL_SELECTION_STATE: ExerciseSelectionState = {
  view: "areas",
  bodyAreaId: null,
  query: "",
};

type FormCheckSelectionProps = {
  onSelectExercise: (exerciseId: FormCheckExerciseId) => void;
};

export function FormCheckSelection({
  onSelectExercise,
}: FormCheckSelectionProps) {
  const [selection, setSelection] = useState<ExerciseSelectionState>(
    INITIAL_SELECTION_STATE,
  );
  const selectedBodyArea = selection.bodyAreaId
    ? FORM_CHECK_BODY_AREAS.find((area) => area.id === selection.bodyAreaId)
    : null;
  const normalizedQuery = selection.query.trim().toLowerCase();
  const visibleExercises =
    selection.view === "area"
      ? getFormCheckExercisesByBodyArea(selection.bodyAreaId)
      : FORM_CHECK_EXERCISES.filter((exercise) =>
          exercise.name.toLowerCase().includes(normalizedQuery),
        );

  function showBodyAreas() {
    setSelection(INITIAL_SELECTION_STATE);
  }

  function showBodyArea(bodyAreaId: FormCheckBodyAreaId) {
    setSelection({ view: "area", bodyAreaId, query: "" });
  }

  function showAllExercises() {
    setSelection({ view: "all", bodyAreaId: null, query: "" });
  }

  return (
    <div className="form-flow-shell grt-page-entry">
      <section
        className="form-intro-block form-selection-block"
        aria-labelledby="form-intro-heading"
      >
        <div className="form-intro-copy form-selection-heading">
          <h1 id="form-intro-heading">Check your form.</h1>
          <p>Choose a movement.</p>
        </div>

        {selection.view === "areas" ? (
          <div className="form-area-selection">
            <div className="form-body-area-grid" aria-label="Choose a body area">
              {FORM_CHECK_BODY_AREAS.map((area, index) => (
                <button
                  key={area.id}
                  type="button"
                  className="grt-pressable"
                  style={{ "--card-index": index } as CSSProperties}
                  onClick={() => showBodyArea(area.id)}
                >
                  <span className="form-body-area-art" aria-hidden="true">
                    {/* Static, pre-compressed artwork keeps both Sites and Pages builds path-safe. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sitePath(FORM_CHECK_CATEGORY_IMAGES[area.id])}
                      alt=""
                      width="1448"
                      height="1086"
                      loading={index < 3 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  </span>
                  <strong>{area.label}</strong>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="form-all-exercises grt-pressable"
              onClick={showAllExercises}
            >
              All exercises <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : (
          <div className="form-exercise-choice form-exercise-choice-panel">
            <div className="form-selection-toolbar">
              <button
                type="button"
                className="grt-text-button"
                onClick={showBodyAreas}
              >
                ← Body areas
              </button>
              <p className="block-label">
                {selection.view === "all"
                  ? "All exercises"
                  : selectedBodyArea?.label}
              </p>
            </div>

            {selection.view === "all" ? (
              <label className="form-exercise-search">
                <span className="sr-only">Search all exercises</span>
                <Input
                  type="search"
                  value={selection.query}
                  onChange={(event) =>
                    setSelection({
                      view: "all",
                      bodyAreaId: null,
                      query: event.target.value,
                    })
                  }
                  placeholder="Search exercises"
                  autoFocus
                />
              </label>
            ) : null}

            <div className="form-exercise-selector" aria-label="Choose an exercise">
              {visibleExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => onSelectExercise(exercise.id)}
                >
                  <strong>{exercise.name}</strong>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>

            {visibleExercises.length === 0 ? (
              <p className="form-exercise-empty">No matching exercises.</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

type FormCheckInstructionsProps = {
  exercise: FormCheckExercise;
  onBack: () => void;
  onContinue: () => void;
};

export function FormCheckInstructions({
  exercise,
  onBack,
  onContinue,
}: FormCheckInstructionsProps) {
  const instructionContent = getFormCheckInstructionContent(exercise);

  return (
    <div className="form-flow-shell grt-page-entry">
      <section
        className="form-instruction-block"
        aria-labelledby="form-instructions-heading"
      >
        <div className="form-instruction-head">
          <p className="block-label">Before upload</p>
          <h1 id="form-instructions-heading">Before you start.</h1>
          <p className="form-instruction-movement">{exercise.name}</p>
        </div>
        <ol className="form-instruction-list">
          {instructionContent.groups.map((instruction, index) => (
            <li
              key={instruction.title}
              style={{ "--row-index": index } as CSSProperties}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{instruction.title}</strong>
                <p>{instruction.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        {instructionContent.note ? (
          <p className="form-exercise-note">
            <strong>{exercise.name}:</strong> {instructionContent.note}
          </p>
        ) : null}
        <p className="form-transparency-note">
          For transparency: videos are analyzed for this session. Saved history
          is not available yet.
        </p>
        <div className="form-instruction-actions">
          <button type="button" className="grt-text-button" onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className="grt-primary-inverse grt-pressable"
            onClick={onContinue}
          >
            I understand <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export function FormCheckWorkflowSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: "Instructions" },
    { number: 2, label: "Upload" },
    { number: 3, label: "Review" },
  ];

  return (
    <ol className="workflow-steps" aria-label="Analysis progress">
      {steps.map((step) => {
        const isComplete = currentStep > step.number;
        const isCurrent = currentStep === step.number;
        return (
          <li
            key={step.number}
            className={`workflow-step ${isCurrent ? "workflow-step-current" : ""} ${isComplete ? "workflow-step-complete" : ""}`}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span className="workflow-step-marker" aria-hidden="true">
              {isComplete ? <Check className="size-3" /> : step.number}
            </span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
