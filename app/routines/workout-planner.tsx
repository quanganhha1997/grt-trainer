"use client";

import { useMemo, useState } from "react";
import { sitePath } from "@/lib/site-path";

type WorkoutCategory = "Strength" | "Full body" | "Mobility";

type Workout = {
  id: string;
  name: string;
  category: WorkoutCategory;
  duration: string;
  level: string;
  focus: string;
  exercises: Array<{ name: string; prescription: string }>;
};

const WORKOUTS: Workout[] = [
  {
    id: "lower-strength",
    name: "Lower Strength",
    category: "Strength",
    duration: "40 min",
    level: "Beginner",
    focus: "Leg strength and control",
    exercises: [
      { name: "Bodyweight squat", prescription: "3 × 10" },
      { name: "Reverse lunge", prescription: "3 × 8 / side" },
      { name: "Glute bridge", prescription: "3 × 12" },
      { name: "Forearm plank", prescription: "3 × 30 sec" },
    ],
  },
  {
    id: "upper-push-pull",
    name: "Upper Push + Pull",
    category: "Strength",
    duration: "35 min",
    level: "Intermediate",
    focus: "Chest, back, and arms",
    exercises: [
      { name: "Push-up", prescription: "4 × 8" },
      { name: "Dumbbell row", prescription: "4 × 10 / side" },
      { name: "Forearm plank", prescription: "3 × 40 sec" },
    ],
  },
  {
    id: "full-body-base",
    name: "Full Body Base",
    category: "Full body",
    duration: "32 min",
    level: "All levels",
    focus: "Repeatable full-body work",
    exercises: [
      { name: "Bodyweight squat", prescription: "3 × 10" },
      { name: "Push-up", prescription: "3 × 8" },
      { name: "Dumbbell row", prescription: "3 × 10 / side" },
      { name: "Glute bridge", prescription: "3 × 12" },
    ],
  },
  {
    id: "controlled-conditioning",
    name: "Controlled Conditioning",
    category: "Full body",
    duration: "28 min",
    level: "Intermediate",
    focus: "Strength with steady pacing",
    exercises: [
      { name: "Reverse lunge", prescription: "3 × 10 / side" },
      { name: "Push-up", prescription: "3 × 10" },
      { name: "Bodyweight squat", prescription: "3 × 12" },
      { name: "Forearm plank", prescription: "3 × 30 sec" },
    ],
  },
  {
    id: "mobility-reset",
    name: "Mobility Reset",
    category: "Mobility",
    duration: "20 min",
    level: "All levels",
    focus: "Hips, trunk, and positions",
    exercises: [
      { name: "Glute bridge", prescription: "3 × 12" },
      { name: "Reverse lunge", prescription: "3 × 6 / side" },
      { name: "Forearm plank", prescription: "3 × 25 sec" },
    ],
  },
];

const FILTERS = ["All", "Strength", "Full body", "Mobility"] as const;
type WorkoutFilter = (typeof FILTERS)[number];

export function WorkoutPlanner() {
  const [filter, setFilter] = useState<WorkoutFilter>("All");
  const [selectedId, setSelectedId] = useState(WORKOUTS[0].id);

  const filteredWorkouts = useMemo(
    () => WORKOUTS.filter((workout) => filter === "All" || workout.category === filter),
    [filter],
  );
  const selectedWorkout = WORKOUTS.find((workout) => workout.id === selectedId) ?? filteredWorkouts[0] ?? WORKOUTS[0];

  function chooseFilter(nextFilter: WorkoutFilter) {
    setFilter(nextFilter);
    const firstMatch = WORKOUTS.find((workout) => nextFilter === "All" || workout.category === nextFilter);
    if (firstMatch) setSelectedId(firstMatch.id);
  }

  return (
    <div className="grt-page-shell workout-library-shell grt-page-entry">
      <header className="grt-page-heading workout-library-heading">
        <p className="grt-overline">Library</p>
        <h1>Workouts.</h1>
        <p>Simple routines. Effective training.</p>
      </header>

      <div className="workout-filters" role="group" aria-label="Filter workouts">
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
        <section className="workout-list" aria-label="Workout routines">
          {filteredWorkouts.map((workout, index) => (
            <button
              key={workout.id}
              type="button"
              className="workout-row grt-row grt-pressable"
              data-selected={selectedWorkout.id === workout.id}
              aria-pressed={selectedWorkout.id === workout.id}
              onClick={() => setSelectedId(workout.id)}
            >
              <span className="workout-row-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="workout-row-main"><strong>{workout.name}</strong><small>{workout.focus}</small></span>
              <span>{workout.duration}</span>
              <span>{workout.level}</span>
              <span className="grt-row-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </section>

        <aside className="workout-detail" aria-labelledby="selected-workout-heading">
          <div className="workout-detail-head">
            <p className="block-label">Selected routine</p>
            <h2 id="selected-workout-heading">{selectedWorkout.name}</h2>
            <p>{selectedWorkout.duration} · {selectedWorkout.level}</p>
          </div>
          <ol className="workout-exercise-list">
            {selectedWorkout.exercises.map((exercise, index) => (
              <li key={`${selectedWorkout.id}-${exercise.name}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{exercise.name}</strong>
                <small>{exercise.prescription}</small>
              </li>
            ))}
          </ol>
          {selectedWorkout.exercises.some((exercise) => exercise.name === "Bodyweight squat") ? (
            <a href={sitePath("/form-check")} className="workout-form-link grt-pressable">
              Check squat form <span aria-hidden="true">→</span>
            </a>
          ) : (
            <p className="workout-detail-note">Move with control. Rest as needed.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
