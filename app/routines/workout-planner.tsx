"use client";

import { useMemo, useState } from "react";
import {
  findSupportedFormCheckExercise,
  getFormCheckPath,
} from "@/lib/form-check-exercises";
import { sitePath } from "@/lib/site-path";
import { TRAINING_PROGRAMS, type TrainingProgram } from "@/lib/training-programs";

const FILTERS = ["All", "2 days", "3 days", "5 days", "6 days"] as const;
type ProgramFilter = (typeof FILTERS)[number];
type ProgramSession = TrainingProgram["phases"][number]["sessions"][number];

function matchesFilter(program: TrainingProgram, filter: ProgramFilter) {
  return filter === "All" || program.schedule.startsWith(filter);
}

function getSupportedFormCheck(session: ProgramSession) {
  for (const exercise of session.exercises) {
    const supportedExercise = findSupportedFormCheckExercise(exercise.name);
    if (supportedExercise) return supportedExercise;
  }

  return null;
}

function getWorkingSetCount(session: ProgramSession) {
  return session.exercises.reduce((total, exercise) => {
    const setCount = Number.parseInt(exercise.sets, 10);
    return total + (Number.isFinite(setCount) ? setCount : 0);
  }, 0);
}

export function WorkoutPlanner() {
  const [filter, setFilter] = useState<ProgramFilter>("All");
  const [selectedId, setSelectedId] = useState(TRAINING_PROGRAMS[0].id);
  const [phaseId, setPhaseId] = useState(TRAINING_PROGRAMS[0].phases[0].id);
  const [sessionId, setSessionId] = useState(TRAINING_PROGRAMS[0].phases[0].sessions[0].id);

  const filteredPrograms = useMemo(
    () => TRAINING_PROGRAMS.filter((program) => matchesFilter(program, filter)),
    [filter],
  );
  const selectedProgram = TRAINING_PROGRAMS.find((program) => program.id === selectedId)
    ?? filteredPrograms[0]
    ?? TRAINING_PROGRAMS[0];
  const selectedPhase = selectedProgram.phases.find((phase) => phase.id === phaseId)
    ?? selectedProgram.phases[0];
  const selectedSession = selectedPhase.sessions.find((session) => session.id === sessionId)
    ?? selectedPhase.sessions[0];
  const selectedPhaseIndex = selectedProgram.phases.findIndex((phase) => phase.id === selectedPhase.id);
  const selectedSessionIndex = selectedPhase.sessions.findIndex((session) => session.id === selectedSession.id);
  const workingSetCount = getWorkingSetCount(selectedSession);
  const supportedFormCheck = getSupportedFormCheck(selectedSession);

  function chooseProgram(program: TrainingProgram) {
    setSelectedId(program.id);
    setPhaseId(program.phases[0].id);
    setSessionId(program.phases[0].sessions[0].id);
  }

  function chooseFilter(nextFilter: ProgramFilter) {
    setFilter(nextFilter);
    const firstMatch = TRAINING_PROGRAMS.find((program) => matchesFilter(program, nextFilter));
    if (firstMatch) chooseProgram(firstMatch);
  }

  function choosePhase(nextPhaseId: string) {
    const nextPhase = selectedProgram.phases.find((phase) => phase.id === nextPhaseId);
    if (!nextPhase) return;
    setPhaseId(nextPhase.id);
    setSessionId(nextPhase.sessions[0].id);
  }

  return (
    <div className="grt-page-shell workout-library-shell grt-page-entry">
      <header className="grt-page-heading workout-library-heading">
        <p className="grt-overline">Program library</p>
        <h1>Workouts.</h1>
        <p>Choose a program. Follow one day at a time.</p>
      </header>

      <div className="workout-filters" role="group" aria-label="Filter programs by training days">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            data-active={filter === item}
            aria-pressed={filter === item}
            onClick={() => chooseFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="workout-library-grid">
        <section className="workout-list" aria-label="Training programs">
          {filteredPrograms.map((program, index) => (
            <button
              key={program.id}
              type="button"
              className="workout-row grt-row grt-pressable"
              data-selected={selectedProgram.id === program.id}
              aria-pressed={selectedProgram.id === program.id}
              onClick={() => chooseProgram(program)}
            >
              <span className="workout-row-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="workout-row-main">
                <strong>{program.name}</strong>
                <small className="workout-row-focus">{program.focus}</small>
                <small className="workout-row-mobile-meta">{program.weeks} · {program.schedule}</small>
              </span>
              <span className="workout-row-duration">{program.weeks}</span>
              <span className="workout-row-level">{program.schedule}</span>
              <span className="grt-row-arrow workout-row-arrow" aria-hidden="true">→</span>
            </button>
          ))}
          <p className="workout-library-count">
            {filteredPrograms.length} {filteredPrograms.length === 1 ? "program" : "programs"}
          </p>
        </section>

        <article className="workout-detail" aria-labelledby="selected-workout-heading">
          <header className="workout-detail-head">
            <details className="program-header-disclosure">
              <summary>
                <span className="program-header-copy">
                  <span
                    className="program-title"
                    id="selected-workout-heading"
                    role="heading"
                    aria-level={2}
                  >
                    {selectedProgram.name}
                  </span>
                  <span className="program-facts" aria-label="Program summary">
                    <span>{selectedProgram.schedule}</span>
                    <span>{selectedProgram.weeks}</span>
                    <span>{selectedProgram.level}</span>
                  </span>
                </span>
                <span className="program-header-toggle" aria-hidden="true">+</span>
              </summary>
              <div className="program-header-details">
                <p>{selectedProgram.summary}</p>
                <dl>
                  <div><dt>Training split</dt><dd>{selectedProgram.split}</dd></div>
                  <div><dt>Primary focus</dt><dd>{selectedProgram.focus}</dd></div>
                </dl>
              </div>
            </details>
          </header>

          <section className="program-choice-block" aria-labelledby="training-block-heading">
            <div className="program-step-heading">
              <div>
                <span aria-hidden="true">01</span>
                <p className="block-label" id="training-block-heading">Choose a block</p>
              </div>
              <small>Block {selectedPhaseIndex + 1} of {selectedProgram.phases.length}</small>
            </div>
            <div className="program-selector" role="tablist" aria-label="Training block">
              {selectedProgram.phases.map((phase) => (
                <button
                  key={phase.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedPhase.id === phase.id}
                  data-active={selectedPhase.id === phase.id}
                  onClick={() => choosePhase(phase.id)}
                >
                  {phase.label}
                </button>
              ))}
            </div>
          </section>

          <section className="program-choice-block" aria-labelledby="training-day-heading">
            <div className="program-step-heading">
              <div>
                <span aria-hidden="true">02</span>
                <p className="block-label" id="training-day-heading">Choose a day</p>
              </div>
              <small>
                {selectedSession.label === "Core"
                  ? "Optional session"
                  : `Day ${selectedSessionIndex + 1} of ${selectedPhase.sessions.filter((session) => session.label !== "Core").length}`}
              </small>
            </div>
            <div className="program-selector program-session-selector" role="tablist" aria-label="Training day">
              {selectedPhase.sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedSession.id === session.id}
                  data-active={selectedSession.id === session.id}
                  onClick={() => setSessionId(session.id)}
                >
                  {session.label}
                </button>
              ))}
            </div>
          </section>

          <section
            className="program-session-panel"
            role="tabpanel"
            aria-label={`${selectedPhase.label}, ${selectedSession.label}`}
          >
            <div className="program-session-heading">
              <div>
                <p>03 · Today&apos;s session</p>
                <h3>{selectedSession.label}</h3>
                <small>{selectedSession.exercises.length} exercises · {workingSetCount} working sets</small>
              </div>
              {supportedFormCheck ? (
                <a href={sitePath(getFormCheckPath(supportedFormCheck.id))} className="workout-form-link grt-pressable">
                  Check {supportedFormCheck.name.toLowerCase()} form <span aria-hidden="true">→</span>
                </a>
              ) : null}
            </div>

            <ol className="program-exercise-list" aria-label={`${selectedSession.label} exercises`}>
              {selectedSession.exercises.map((exercise, index) => (
                <li key={`${selectedSession.id}-${index}-${exercise.name}`}>
                  <details className="exercise-disclosure">
                    <summary>
                      <span className="exercise-index">{String(index + 1).padStart(2, "0")}</span>
                      <strong>{exercise.name}</strong>
                      <span className="exercise-prescription">
                        <span><b>{exercise.sets}</b> sets</span>
                        <span><b>{exercise.reps}</b> reps</span>
                      </span>
                      <span className="exercise-rest"><small>Rest</small>{exercise.rest}</span>
                      <span className="exercise-toggle" aria-hidden="true">+</span>
                    </summary>
                    <div className="exercise-details">
                      <div>
                        <span>Effort</span>
                        <strong>{exercise.effort}</strong>
                      </div>
                      <div>
                        <span>How to perform</span>
                        <p>{exercise.note ?? "Keep the movement controlled and stop the set if your technique changes."}</p>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          </section>

          <details className="program-methods">
            <summary>Training terms and methods</summary>
            <dl>
              {selectedProgram.methodNotes.map((note) => (
                <div key={`${selectedProgram.id}-${note.term}`}>
                  <dt>{note.term}</dt>
                  <dd>{note.definition}</dd>
                </div>
              ))}
            </dl>
          </details>
        </article>
      </div>
    </div>
  );
}
