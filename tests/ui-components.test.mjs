import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

async function readCssTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return readCssTree(entryPath);
      }
      return entry.name.endsWith(".css") ? readFile(entryPath, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

test("emits the catalog's animation and scrolling utilities", async () => {
  const css = await readCssTree(path.join(root, "dist"));

  assert.match(css, /--tw-enter-opacity/);
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /scroll-fade-reveal-b/);
  assert.match(css, /mask-image:/);
  assert.match(css, /tw-shimmer/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("uses the Grt v0.6-2 type hierarchy, workout alignment, and precise motion", async () => {
  const sourceCss = await readFile(path.join(root, "app", "globals.css"), "utf8");
  const layoutSource = await readFile(path.join(root, "app", "layout.tsx"), "utf8");
  const workoutSource = await readFile(path.join(root, "app", "routines", "workout-planner.tsx"), "utf8");
  const experienceSource = await readFile(path.join(root, "app", "grt-experience.tsx"), "utf8");
  const pageSources = (
    await Promise.all(
      [
        "app/grt-experience.tsx",
        "app/form-check-workspace.tsx",
        "app/routines/workout-planner.tsx",
      ].map((file) => readFile(path.join(root, file), "utf8")),
    )
  ).join("\n");
  const { Button } = await vite.ssrLoadModule("/components/ui/button.tsx");
  const buttonHtml = renderToStaticMarkup(React.createElement(Button, null, "Analyze"));

  for (const color of ["#f3f1ea", "#fbfaf6", "#0b0b0a", "#10100f", "#f7f5ef", "#686660", "#cbc8bf", "#e8e5dd"]) {
    assert.match(sourceCss, new RegExp(color, "i"));
  }

  assert.match(layoutSource, /@fontsource-variable\/inter-tight/);
  assert.match(sourceCss, /\/\* Grt v0\.6-2 — normalized typography \+ aligned workout metadata \*\//);
  assert.match(sourceCss, /--type-display:\s*clamp\(3\.25rem, 9vw, 10rem\)/);
  assert.match(sourceCss, /--type-page:\s*clamp\(2\.25rem, 5vw, 5rem\)/);
  assert.match(sourceCss, /--type-section:\s*clamp\(1\.75rem, 3vw, 3rem\)/);
  assert.match(sourceCss, /--type-block:\s*clamp\(1\.25rem, 1\.6vw, 1\.75rem\)/);
  assert.match(sourceCss, /--type-body:\s*clamp\(1rem, calc\(0\.95rem \+ 0\.25vw\), 1\.125rem\)/);
  assert.match(sourceCss, /--type-ui:\s*0\.875rem/);
  assert.match(sourceCss, /--type-label:\s*0\.75rem/);
  assert.match(sourceCss, /--weight-body:\s*400/);
  assert.match(sourceCss, /--weight-ui:\s*500/);
  assert.match(sourceCss, /--weight-heading:\s*600/);
  assert.match(sourceCss, /--weight-display:\s*700/);
  assert.match(sourceCss, /--tracking-display:\s*0\.008em/);
  assert.match(sourceCss, /--tracking-label:\s*0\.08em/);
  assert.match(sourceCss, /--experience-option-padding-block:\s*clamp\(1rem, 1\.5vw, 1\.375rem\)/);
  assert.match(sourceCss, /--experience-copy-gap:\s*clamp\(0\.5rem, 0\.75vw, 0\.625rem\)/);
  assert.match(sourceCss, /font-synthesis:\s*none/);
  assert.match(sourceCss, /font-kerning:\s*normal/);
  assert.match(sourceCss, /font-optical-sizing:\s*auto/);
  assert.match(sourceCss, /max-width:\s*62ch/);
  assert.match(sourceCss, /font-variant-numeric:\s*tabular-nums lining-nums/);
  assert.match(
    sourceCss,
    /\.workout-library-heading h1,[\s\S]*?font-size:\s*var\(--type-page\) !important;[\s\S]*?font-weight:\s*var\(--weight-heading\) !important;/,
  );
  assert.match(
    sourceCss,
    /@media \(min-width: 1024px\)[\s\S]*?\.workout-row\s*{[\s\S]*?grid-template-columns:\s*4\.5rem minmax\(0, 1fr\) 6\.875rem 8\.75rem 2\.5rem;/,
  );
  assert.match(sourceCss, /\.workout-row-duration\s*{[\s\S]*?justify-self:\s*end;[\s\S]*?tabular-nums lining-nums/);
  assert.match(
    sourceCss,
    /\.workout-row-level\s*{[\s\S]*?justify-self:\s*start;[\s\S]*?padding-inline-start:\s*var\(--workout-meta-gutter\);/,
  );
  assert.match(sourceCss, /\.workout-row-arrow\s*{[\s\S]*?justify-self:\s*center;/);
  assert.match(
    sourceCss,
    /\.experience-list button\s*\{[\s\S]*?padding-block:\s*var\(--experience-option-padding-block\);/,
  );
  assert.match(
    sourceCss,
    /\.experience-list \.experience-copy\s*\{[\s\S]*?row-gap:\s*var\(--experience-copy-gap\);/,
  );
  assert.match(experienceSource, /className="experience-copy"/);
  assert.match(workoutSource, /className="workout-row-duration"/);
  assert.match(workoutSource, /className="workout-row-level"/);
  assert.match(workoutSource, /className="grt-row-arrow workout-row-arrow"/);
  assert.doesNotMatch(
    pageSources,
    /\b(?:text-(?:xs|sm|base|lg|xl|[2-9]xl)|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|tracking-\[-?\d|leading-(?:none|tight|snug|normal|relaxed|loose|\d+))\b/,
  );
  assert.doesNotMatch(sourceCss, /#bef264|rgb\(190 242 100/i);
  assert.match(buttonHtml, /active:scale-\[0\.97\]/);
  assert.doesNotMatch(buttonHtml, /transition-all/);
});

test("gates coaching when scan quality is unreliable", async () => {
  const { evaluateScanQuality } = await vite.ssrLoadModule(
    "/lib/scan-quality.ts",
  );

  const highQuality = evaluateScanQuality({
    attemptedFrames: 100,
    poseFrames: 95,
    measurableFrames: 90,
    averageConfidence: 0.9,
    leftSideSamples: 88,
    rightSideSamples: 2,
    maximumVisibleLandmarks: 31,
  });
  assert.equal(highQuality.level, "high");
  assert.equal(highQuality.allowCoaching, true);
  assert.equal(highQuality.issues.length, 0);

  const usableQuality = evaluateScanQuality({
    attemptedFrames: 100,
    poseFrames: 80,
    measurableFrames: 65,
    averageConfidence: 0.72,
    leftSideSamples: 60,
    rightSideSamples: 5,
    maximumVisibleLandmarks: 26,
  });
  assert.equal(usableQuality.level, "usable");
  assert.equal(usableQuality.allowCoaching, true);

  const lowQuality = evaluateScanQuality({
    attemptedFrames: 100,
    poseFrames: 40,
    measurableFrames: 15,
    averageConfidence: 0.5,
    leftSideSamples: 8,
    rightSideSamples: 7,
    maximumVisibleLandmarks: 17,
  });
  assert.equal(lowQuality.level, "low");
  assert.equal(lowQuality.allowCoaching, false);
  assert.ok(lowQuality.issues.length >= 3);
});

test("stores only valid structured analysis history and keeps the latest eight", async () => {
  const {
    createAnalysisHistoryRecord,
    getScoreChange,
    parseAnalysisHistory,
    prependAnalysisHistory,
  } = await vite.ssrLoadModule("/lib/analysis-history.ts");

  const records = Array.from({ length: 10 }, (_, index) =>
    createAnalysisHistoryRecord({
      id: `result-${index}`,
      createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
      repetitions: 3,
      averageScore: 80 + index,
      captureQuality: "high",
      captureQualityScore: 92,
      primaryFocus: index % 2 === 0 ? "Depth" : null,
      coachingCue: "Keep a controlled tempo.",
      minimumKneeAngle: 102,
      maximumTorsoLean: 24,
    }),
  );

  const history = records.reduce(
    (current, record) => prependAnalysisHistory(current, record),
    [],
  );

  assert.equal(history.length, 8);
  assert.equal(history[0].id, "result-9");
  assert.equal(history[7].id, "result-2");
  assert.equal(getScoreChange(history, 0), 1);
  assert.equal(getScoreChange(history, 7), null);
  assert.deepEqual(parseAnalysisHistory(JSON.stringify(history)), history);
  assert.deepEqual(parseAnalysisHistory("not-json"), []);
  assert.deepEqual(parseAnalysisHistory(JSON.stringify([{ id: "bad" }])), []);
  assert.deepEqual(
    parseAnalysisHistory(
      JSON.stringify([{ ...records[0], averageScore: 500 }]),
    ),
    [],
  );
});

test("summarizes saved checks without exaggerating chart movement", async () => {
  const { calculateAnalysisProgress } = await vite.ssrLoadModule(
    "/lib/analysis-progress.ts",
  );
  const records = [
    {
      id: "latest",
      createdAt: "2026-09-01T12:00:00.000Z",
      exercise: "Bodyweight squat",
      repetitions: 4,
      averageScore: 88,
      captureQuality: "high",
      captureQualityScore: 94,
      primaryFocus: "Depth",
      coachingCue: "Reach a consistent depth.",
      minimumKneeAngle: 102,
      maximumTorsoLean: 24,
    },
    {
      id: "middle",
      createdAt: "2026-08-31T12:00:00.000Z",
      exercise: "Bodyweight squat",
      repetitions: 3,
      averageScore: 84,
      captureQuality: "high",
      captureQualityScore: 91,
      primaryFocus: "Depth",
      coachingCue: "Reach a consistent depth.",
      minimumKneeAngle: 105,
      maximumTorsoLean: 26,
    },
    {
      id: "oldest",
      createdAt: "2026-08-30T12:00:00.000Z",
      exercise: "Bodyweight squat",
      repetitions: 3,
      averageScore: 80,
      captureQuality: "usable",
      captureQualityScore: 78,
      primaryFocus: "Tempo",
      coachingCue: "Use a controlled tempo.",
      minimumKneeAngle: 108,
      maximumTorsoLean: 28,
    },
  ];

  const summary = calculateAnalysisProgress(records);
  assert.ok(summary);
  assert.equal(summary.checkCount, 3);
  assert.equal(summary.totalRepetitions, 10);
  assert.equal(summary.averageScore, 84);
  assert.equal(summary.bestScore, 88);
  assert.equal(summary.scoreChange, 8);
  assert.equal(summary.recurringFocus, "Depth");
  assert.deepEqual(
    summary.chartPoints.map((point) => point.id),
    ["oldest", "middle", "latest"],
  );
  assert.deepEqual(
    summary.chartPoints.map((point) => point.x),
    [4, 50, 96],
  );
  assert.ok(summary.chartPoints.every((point) => point.y >= 4 && point.y <= 36));
  assert.equal(calculateAnalysisProgress([]), null);
});

test("chooses a supported recording format and creates a safe local file name", async () => {
  const {
    formatRecordingDuration,
    getRecordedVideoFileDetails,
    selectPreferredRecordingMimeType,
  } = await vite.ssrLoadModule("/lib/video-recording.ts");

  assert.equal(
    selectPreferredRecordingMimeType((type) => type === "video/webm;codecs=vp8"),
    "video/webm;codecs=vp8",
  );
  assert.equal(selectPreferredRecordingMimeType(() => false), null);

  const mp4 = getRecordedVideoFileDetails(
    "video/mp4;codecs=avc1",
    new Date("2026-09-01T12:34:56.789Z"),
  );
  assert.equal(mp4.mimeType, "video/mp4");
  assert.equal(mp4.fileName, "squat-recording-2026-09-01T12-34-56-789Z.mp4");

  const webm = getRecordedVideoFileDetails("video/webm;codecs=vp9");
  assert.equal(webm.mimeType, "video/webm");
  assert.match(webm.fileName, /^squat-recording-.+\.webm$/);

  const deadlift = getRecordedVideoFileDetails(
    "video/webm",
    new Date("2026-09-01T12:34:56.789Z"),
    "deadlift",
  );
  assert.equal(deadlift.fileName, "deadlift-recording-2026-09-01T12-34-56-789Z.webm");

  assert.equal(formatRecordingDuration(-4), "0:00");
  assert.equal(formatRecordingDuration(7.9), "0:07");
  assert.equal(formatRecordingDuration(35), "0:30");
});

test("creates, validates, and limits private workout plans", async () => {
  const { EXERCISE_CATALOG } = await vite.ssrLoadModule(
    "/lib/exercise-catalog.ts",
  );
  const {
    createPlanExercise,
    createWorkoutPlan,
    parseWorkoutPlans,
    prependWorkoutPlan,
  } = await vite.ssrLoadModule("/lib/workout-plans.ts");

  assert.equal(EXERCISE_CATALOG.length, 6);
  assert.equal(
    new Set(EXERCISE_CATALOG.map((exercise) => exercise.id)).size,
    EXERCISE_CATALOG.length,
  );

  const squat = createPlanExercise("bodyweight_squat");
  const plank = createPlanExercise("plank");
  assert.deepEqual(squat, {
    exerciseId: "bodyweight_squat",
    sets: 3,
    amount: 10,
  });
  assert.equal(plank.amount, 30);

  const plan = createWorkoutPlan("  Full body A  ", [squat, plank], {
    id: "plan-1",
    createdAt: "2026-09-01T12:00:00.000Z",
  });
  assert.equal(plan.name, "Full body A");
  assert.equal(plan.exercises.length, 2);

  const plans = Array.from({ length: 10 }, (_, index) => ({
    ...plan,
    id: `plan-${index}`,
  })).reduce(
    (current, savedPlan) => prependWorkoutPlan(current, savedPlan),
    [],
  );
  assert.equal(plans.length, 8);
  assert.equal(plans[0].id, "plan-9");
  assert.deepEqual(parseWorkoutPlans(JSON.stringify(plans)), plans);
  assert.deepEqual(parseWorkoutPlans("bad-json"), []);
  assert.deepEqual(
    parseWorkoutPlans(JSON.stringify([{ ...plan, exercises: [squat, squat] }])),
    [],
  );
  assert.throws(() => createWorkoutPlan("Duplicate", [squat, squat]));
});

test("loads five complete training programs without author attribution", async () => {
  const { TRAINING_PROGRAMS, getProgramExerciseCount } = await vite.ssrLoadModule(
    "/lib/training-programs.ts",
  );

  assert.equal(TRAINING_PROGRAMS.length, 5);
  assert.deepEqual(
    TRAINING_PROGRAMS.map((program) => program.name),
    [
      "Strength",
      "Full Body",
      "Physique",
      "Push / Pull / Legs",
      "Progressive Split",
    ],
  );
  assert.equal(
    TRAINING_PROGRAMS.reduce((total, program) => total + getProgramExerciseCount(program), 0),
    568,
  );
  assert.ok(TRAINING_PROGRAMS.every((program) => program.phases.length > 0));
  assert.ok(
    TRAINING_PROGRAMS.every((program) =>
      program.phases.every((phase) =>
        phase.sessions.every((session) => session.exercises.length > 0),
      ),
    ),
  );
  assert.ok(TRAINING_PROGRAMS.every((program) => !("author" in program)));
  assert.equal(
    TRAINING_PROGRAMS.find((program) => program.name === "Strength")?.schedule,
    "2 days / week",
  );

  const exerciseNames = [
    ...new Set(
      TRAINING_PROGRAMS.flatMap((program) =>
        program.phases.flatMap((phase) =>
          phase.sessions.flatMap((session) =>
            session.exercises.map((exercise) => exercise.name),
          ),
        ),
      ),
    ),
  ];
  const exerciseAliasKey = (name) => name
    .toLowerCase()
    .replace(/\b(dumbbell|db)\b/g, "db")
    .replace(/\b(barbell|bb)\b/g, "bb")
    .replace(/\btriceps?\b/g, "tricep")
    .replace(/flye/g, "fly")
    .replace(/pull[- ]?ups?/g, "pullup")
    .replace(/push[- ]?downs?/g, "pushdown")
    .replace(/(crunch|curl|raise|extension)s\b/g, "$1")
    .replace(/skull\s?crushers?/g, "skullcrusher")
    .replace(/[-–()/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  assert.equal(exerciseNames.length, 122);
  assert.equal(new Set(exerciseNames.map(exerciseAliasKey)).size, exerciseNames.length);
  assert.ok(exerciseNames.every((name) => !/\b(?:BB|DB|OHP)\b/.test(name)));
  assert.ok(
    TRAINING_PROGRAMS.every((program) =>
      program.phases.every((phase) => /^Week \d+(?: - \d+)?$/.test(phase.label)),
    ),
  );
  assert.ok(
    TRAINING_PROGRAMS.some((program) =>
      program.phases.some((phase) =>
        phase.sessions.some((session) => session.label === "Day 1 · Chest / Shoulders / Triceps"),
      ),
    ),
  );
  assert.ok(
    TRAINING_PROGRAMS.every((program) =>
      program.phases.every((phase) =>
        phase.sessions.every((session) =>
          session.label === "Core" || /^Day \d+ · .+$/.test(session.label),
        ),
      ),
    ),
  );
  const visibleStrings = [];
  const collectVisibleStrings = (value) => {
    if (typeof value === "string") {
      visibleStrings.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collectVisibleStrings);
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, entry]) => {
        if (key !== "id") collectVisibleStrings(entry);
      });
    }
  };
  collectVisibleStrings(TRAINING_PROGRAMS);

  assert.doesNotMatch(visibleStrings.join("\n"), /\d\s*–\s*\d|\d-\d/);

  const leaningLateralRaise = TRAINING_PROGRAMS
    .flatMap((program) => program.phases)
    .flatMap((phase) => phase.sessions)
    .flatMap((session) => session.exercises)
    .find((exercise) => exercise.name === "Leaning Lateral Raise");
  assert.equal(leaningLateralRaise?.reps, "12 - 15 / 4 - 5 / 4 - 5 / 4 - 5");
});

test("renders Grt navigation and a progressively disclosed program library", async () => {
  const { SiteHeader } = await vite.ssrLoadModule(
    "/components/site-header.tsx",
  );
  const { WorkoutPlanner } = await vite.ssrLoadModule(
    "/app/routines/workout-planner.tsx",
  );
  const headerHtml = renderToStaticMarkup(
    React.createElement(SiteHeader, { active: "workouts" }),
  );
  const plannerHtml = renderToStaticMarkup(React.createElement(WorkoutPlanner));

  assert.match(headerHtml, /data-active="true"[^>]*href="\/routines"/);
  assert.match(headerHtml, />Grt</);
  assert.match(headerHtml, /Form Check/);
  assert.match(headerHtml, /About/);
  assert.match(plannerHtml, /Choose a program\. Follow one day at a time\./);
  assert.match(plannerHtml, /Strength/);
  assert.match(plannerHtml, /Push \/ Pull \/ Legs/);
  assert.doesNotMatch(plannerHtml, /Selected program/);
  assert.match(plannerHtml, /2 days \/ week/);
  assert.match(plannerHtml, /class="program-header-disclosure"/);
  assert.match(plannerHtml, /class="program-header-toggle"[^>]*>\+</);
  assert.doesNotMatch(plannerHtml, />Details</);
  assert.doesNotMatch(plannerHtml, /About this program/);
  assert.match(plannerHtml, /Choose a block/);
  assert.match(plannerHtml, /Choose a day/);
  assert.match(plannerHtml, /Today&#x27;s session/);
  assert.match(plannerHtml, /Training terms and methods/);
  assert.match(plannerHtml, /class="exercise-disclosure"/);
  assert.doesNotMatch(plannerHtml, /role="table"/);
});

test("keeps advanced workout data available without crowding the session view", async () => {
  const source = await readFile(
    path.join(root, "app", "routines", "workout-planner.tsx"),
    "utf8",
  );
  const css = await readFile(path.join(root, "app", "globals.css"), "utf8");

  assert.match(source, /<details className="program-header-disclosure">/);
  assert.match(source, /className="program-header-toggle"/);
  assert.match(source, /<details className="exercise-disclosure">/);
  assert.match(source, /<span><b>\{exercise\.sets\}<\/b> sets<\/span>/);
  assert.match(source, /<span><b>\{exercise\.reps\}<\/b> reps<\/span>/);
  assert.match(source, /<span>Effort<\/span>/);
  assert.match(source, /<span>How to perform<\/span>/);
  assert.match(source, /workout-row-focus/);
  assert.doesNotMatch(source, /Coaching note|How to use this|Selected program/);
  assert.match(source, /exercises · \{workingSetCount\} working sets/);
  assert.doesNotMatch(source, /role="table"/);
  assert.match(
    css,
    /\.program-title\s*\{[\s\S]*?font-size:\s*var\(--type-section\);/,
  );
  assert.match(
    css,
    /\.program-header-disclosure > summary\s*\{[\s\S]*?grid-template-columns:[\s\S]*?cursor:\s*pointer;/,
  );
  assert.match(
    css,
    /\.program-header-disclosure\[open\] \.program-header-toggle\s*\{[\s\S]*?transform:\s*rotate\(45deg\);/,
  );
  assert.match(
    css,
    /\.exercise-disclosure > summary\s*\{[\s\S]*?min-height:\s*5rem;[\s\S]*?grid-template-columns:/,
  );
  assert.match(
    css,
    /@media \(max-width: 699px\)[\s\S]*?\.exercise-disclosure > summary\s*\{[\s\S]*?grid-template-areas:/,
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.exercise-toggle\s*\{[\s\S]*?transition:\s*none;/,
  );
});

test("keeps onboarding personalization inside the browser session", async () => {
  const source = await readFile(
    path.join(root, "app", "grt-experience.tsx"),
    "utf8",
  );

  assert.match(source, /window\.sessionStorage\.setItem/);
  assert.match(source, /window\.sessionStorage\.removeItem/);
  assert.doesNotMatch(source, /window\.localStorage/);
  assert.doesNotMatch(source, /No account|cloud profile/i);
});

test("places Form Check instructions and transparency before upload", async () => {
  const source = await readFile(
    path.join(root, "app", "form-check-workspace.tsx"),
    "utf8",
  );

  assert.match(source, /Before you start\./);
  assert.match(source, /Saved history is not available yet\./);
  assert.match(source, /Upload a side view\./);
  assert.doesNotMatch(source, /window\.localStorage/);
});

test("preserves the v0.5 mobile-first feedback hierarchy after analysis", async () => {
  const source = await readFile(
    path.join(root, "app", "form-check-workspace.tsx"),
    "utf8",
  );
  const sourceCss = await readFile(path.join(root, "app", "globals.css"), "utf8");

  const scoreIndex = source.indexOf("Score</p>");
  const goodIndex = source.indexOf(">Good</p>");
  const fixIndex = source.indexOf(">Fix first</p>");
  const nextIndex = source.indexOf(">Next rep</p>");

  assert.match(source, /Form Check \/ Review/);
  assert.match(source, /One correction\. One cue for the next rep\./);
  assert.ok(scoreIndex >= 0 && scoreIndex < fixIndex);
  assert.ok(fixIndex < goodIndex && goodIndex < nextIndex);
  assert.match(source, /Capture quality, joint measurements, and rep breakdown/);
  assert.match(sourceCss, /\.form-results-grid\s*\{[^}]*grid-template-columns:/s);
  assert.match(sourceCss, /grid-template-areas:\s*"score"\s*"fix"\s*"good"\s*"next"/s);
  assert.match(sourceCss, /\.result-set-details-content/);
});

test("calculates and smooths side-view squat angles", async () => {
  const {
    calculateAngleDegrees,
    calculateSquatAngles,
    smoothSquatAngles,
  } = await vite.ssrLoadModule("/lib/pose-geometry.ts");

  assert.equal(
    Math.round(
      calculateAngleDegrees(
        { x: 0, y: 1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ),
    ),
    90,
  );

  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    visibility: 0.1,
  }));
  landmarks[12] = { x: 0.5, y: 0.2, visibility: 0.95 };
  landmarks[24] = { x: 0.5, y: 0.5, visibility: 0.95 };
  landmarks[26] = { x: 0.5, y: 0.7, visibility: 0.95 };
  landmarks[28] = { x: 0.5, y: 0.9, visibility: 0.95 };

  const standing = calculateSquatAngles(landmarks, 1920, 1080);
  assert.ok(standing);
  assert.equal(standing.side, "right");
  assert.equal(Math.round(standing.knee), 180);
  assert.equal(Math.round(standing.hip), 180);
  assert.equal(Math.round(standing.torsoLean), 0);

  const smoothed = smoothSquatAngles(
    standing,
    { ...standing, knee: 100, hip: 120, torsoLean: 20 },
    0.25,
  );
  assert.equal(Math.round(smoothed.knee), 160);
  assert.equal(Math.round(smoothed.hip), 165);
  assert.equal(Math.round(smoothed.torsoLean), 5);
});

test("selects the grounded working leg for Bulgarian split squats", async () => {
  const { calculateUnilateralAngles } = await vite.ssrLoadModule(
    "/lib/pose-geometry.ts",
  );
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    visibility: 0.1,
  }));

  landmarks[11] = { x: 0.44, y: 0.2, visibility: 0.94 };
  landmarks[23] = { x: 0.45, y: 0.5, visibility: 0.94 };
  landmarks[25] = { x: 0.55, y: 0.7, visibility: 0.94 };
  landmarks[27] = { x: 0.56, y: 0.91, visibility: 0.94 };
  landmarks[12] = { x: 0.48, y: 0.2, visibility: 0.96 };
  landmarks[24] = { x: 0.49, y: 0.5, visibility: 0.96 };
  landmarks[26] = { x: 0.62, y: 0.64, visibility: 0.96 };
  landmarks[28] = { x: 0.73, y: 0.76, visibility: 0.96 };

  const grounded = calculateUnilateralAngles(landmarks, 1920, 1080, true);

  assert.ok(grounded);
  assert.equal(grounded.side, "left");
  assert.ok(Number.isFinite(grounded.knee));
  assert.ok(Number.isFinite(grounded.hip));
});

test("calculates and smooths side-view bench press angles", async () => {
  const { calculatePressAngles, smoothPressAngles } = await vite.ssrLoadModule(
    "/lib/pose-geometry.ts",
  );
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    visibility: 0.1,
  }));

  landmarks[12] = { x: 0.3, y: 0.5, visibility: 0.96 };
  landmarks[14] = { x: 0.5, y: 0.5, visibility: 0.96 };
  landmarks[16] = { x: 0.5, y: 0.3, visibility: 0.96 };
  landmarks[24] = { x: 0.1, y: 0.5, visibility: 0.96 };

  const bottom = calculatePressAngles(landmarks, 1000, 1000);
  assert.ok(bottom);
  assert.equal(bottom.side, "right");
  assert.equal(Math.round(bottom.elbow), 90);
  assert.equal(Math.round(bottom.shoulder), 180);
  assert.equal(Math.round(bottom.wristOffset), 0);
  assert.equal(Math.round(bottom.torsoLean), 90);

  const smoothed = smoothPressAngles(
    bottom,
    { ...bottom, elbow: 170, shoulder: 140, wristOffset: 20, torsoLean: 10 },
    0.25,
  );
  assert.equal(Math.round(smoothed.elbow), 110);
  assert.equal(Math.round(smoothed.shoulder), 170);
  assert.equal(Math.round(smoothed.wristOffset), 5);
  assert.equal(Math.round(smoothed.torsoLean), 70);
});

test("selects the visibly moving arm for a front-view lateral raise", async () => {
  const { calculateLateralRaiseAngles } = await vite.ssrLoadModule(
    "/lib/pose-geometry.ts",
  );
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    visibility: 0.1,
  }));

  landmarks[11] = { x: 0.3, y: 0.3, visibility: 0.96 };
  landmarks[13] = { x: 0.3, y: 0.52, visibility: 0.96 };
  landmarks[15] = { x: 0.3, y: 0.7, visibility: 0.96 };
  landmarks[23] = { x: 0.3, y: 0.7, visibility: 0.96 };
  landmarks[12] = { x: 0.7, y: 0.3, visibility: 0.94 };
  landmarks[14] = { x: 0.9, y: 0.3, visibility: 0.94 };
  landmarks[16] = { x: 1.0, y: 0.3, visibility: 0.94 };
  landmarks[24] = { x: 0.7, y: 0.7, visibility: 0.94 };

  const raised = calculateLateralRaiseAngles(
    landmarks,
    1000,
    1000,
    "left",
  );

  assert.ok(raised);
  assert.equal(raised.side, "right");
  assert.equal(Math.round(raised.shoulder), 90);
  assert.equal(Math.round(raised.elbow), 180);
});

test("calculates and smooths front-view pectoral-fly spacing", async () => {
  const { calculateFlyAngles, smoothFlyAngles } = await vite.ssrLoadModule(
    "/lib/pose-geometry.ts",
  );
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    visibility: 0.1,
  }));

  landmarks[11] = { x: 0.4, y: 0.3, visibility: 0.96 };
  landmarks[13] = { x: 0.2, y: 0.3, visibility: 0.96 };
  landmarks[15] = { x: 0.0, y: 0.3, visibility: 0.96 };
  landmarks[12] = { x: 0.6, y: 0.3, visibility: 0.95 };
  landmarks[14] = { x: 0.8, y: 0.3, visibility: 0.95 };
  landmarks[16] = { x: 1.0, y: 0.3, visibility: 0.95 };

  const open = calculateFlyAngles(landmarks, 1000, 1000);
  assert.ok(open);
  assert.equal(open.side, "bilateral");
  assert.equal(Math.round(open.leftElbow), 180);
  assert.equal(Math.round(open.rightElbow), 180);
  assert.equal(Math.round(open.wristSeparation), 500);

  const smoothed = smoothFlyAngles(
    open,
    { ...open, wristSeparation: 100, leftElbow: 160, rightElbow: 160, elbowAverage: 160 },
    0.25,
  );
  assert.equal(Math.round(smoothed.wristSeparation), 400);
  assert.equal(Math.round(smoothed.elbowAverage), 175);
});

test("calculates and smooths front-view hip-machine spacing", async () => {
  const { calculateHipMachineAngles, smoothHipMachineAngles } =
    await vite.ssrLoadModule("/lib/pose-geometry.ts");
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    visibility: 0.1,
  }));

  landmarks[11] = { x: 0.45, y: 0.2, visibility: 0.96 };
  landmarks[12] = { x: 0.55, y: 0.2, visibility: 0.95 };
  landmarks[23] = { x: 0.45, y: 0.5, visibility: 0.97 };
  landmarks[24] = { x: 0.55, y: 0.5, visibility: 0.96 };
  landmarks[25] = { x: 0.4, y: 0.75, visibility: 0.98 };
  landmarks[26] = { x: 0.6, y: 0.75, visibility: 0.97 };

  const open = calculateHipMachineAngles(landmarks, 1000, 1000);
  assert.ok(open);
  assert.equal(open.side, "bilateral");
  assert.equal(Math.round(open.kneeSeparation), 200);
  assert.equal(Math.round(open.leftKneeDistance), 100);
  assert.equal(Math.round(open.rightKneeDistance), 100);
  assert.equal(Math.round(open.kneeAsymmetry), 0);

  const smoothed = smoothHipMachineAngles(
    open,
    {
      ...open,
      kneeSeparation: 80,
      leftKneeDistance: 40,
      rightKneeDistance: 40,
    },
    0.25,
  );
  assert.equal(Math.round(smoothed.kneeSeparation), 170);
  assert.equal(Math.round(smoothed.leftKneeDistance), 85);
});

test("calculates and smooths side-view calf-raise angles", async () => {
  const { calculateCalfRaiseAngles, smoothCalfRaiseAngles } =
    await vite.ssrLoadModule("/lib/pose-geometry.ts");
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    visibility: 0.1,
  }));

  landmarks[24] = { x: 0.4, y: 0.2, visibility: 0.96 };
  landmarks[26] = { x: 0.4, y: 0.5, visibility: 0.96 };
  landmarks[28] = { x: 0.4, y: 0.8, visibility: 0.96 };
  landmarks[32] = { x: 0.7, y: 0.8, visibility: 0.96 };

  const lowered = calculateCalfRaiseAngles(landmarks, 1000, 1000);
  assert.ok(lowered);
  assert.equal(lowered.side, "right");
  assert.equal(Math.round(lowered.knee), 180);
  assert.equal(Math.round(lowered.ankle), 90);

  const smoothed = smoothCalfRaiseAngles(
    lowered,
    { ...lowered, knee: 172, ankle: 130 },
    0.25,
  );
  assert.equal(Math.round(smoothed.knee), 178);
  assert.equal(Math.round(smoothed.ankle), 100);
});

test("counts only complete squat cycles", async () => {
  const { createSquatTracker, updateSquatTracker } = await vite.ssrLoadModule(
    "/lib/squat-repetition.ts",
  );

  const completeRep = [170, 165, 154, 140, 120, 108, 105, 112, 118, 135, 155, 162];
  let tracker = createSquatTracker();
  for (const kneeAngle of completeRep) {
    tracker = updateSquatTracker(tracker, kneeAngle);
  }

  assert.equal(tracker.repetitions, 1);
  assert.equal(tracker.phase, "standing");

  const partialRep = [150, 140, 125, 130, 145, 162];
  for (const kneeAngle of partialRep) {
    tracker = updateSquatTracker(tracker, kneeAngle);
  }

  assert.equal(tracker.repetitions, 1);
  assert.equal(tracker.phase, "standing");

  let midRepStart = createSquatTracker();
  for (const kneeAngle of [130, 105, 125, 150, 165]) {
    midRepStart = updateSquatTracker(midRepStart, kneeAngle);
  }

  assert.equal(midRepStart.repetitions, 0);
  assert.equal(midRepStart.phase, "standing");
});

test("scores each completed squat and returns specific coaching signals", async () => {
  const { createSquatTracker, updateSquatTracker } = await vite.ssrLoadModule(
    "/lib/squat-repetition.ts",
  );
  const { createSquatCoach, updateSquatCoach } = await vite.ssrLoadModule(
    "/lib/squat-coaching.ts",
  );

  const kneeAngles = [170, 165, 154, 135, 112, 98, 96, 105, 120, 142, 158, 164];
  let tracker = createSquatTracker();
  let coach = createSquatCoach();

  kneeAngles.forEach((knee, index) => {
    tracker = updateSquatTracker(tracker, knee);
    coach = updateSquatCoach(
      coach,
      tracker.phase,
      tracker.repetitions,
      {
        side: "right",
        knee,
        hip: knee - 8,
        torsoLean: index > 2 && index < 9 ? 28 : 12,
        confidence: 0.95,
      },
      index * 0.3,
    );
  });

  assert.equal(coach.completedReps.length, 1);
  assert.equal(coach.completedReps[0].score, 100);
  assert.equal(coach.completedReps[0].rating, "Strong");
  assert.equal(coach.completedReps[0].startedAtSeconds, 0.6);
  assert.equal(coach.completedReps[0].completedAtSeconds, 3.3);
  assert.ok(Math.abs(coach.completedReps[0].reviewAtSeconds - 1.8) < 0.001);
  assert.equal(
    coach.completedReps[0].signals.every((signal) => signal.status === "good"),
    true,
  );
  assert.equal(
    coach.completedReps[0].signals.every((signal) =>
      Number.isFinite(signal.timestampSeconds),
    ),
    true,
  );
});

test("flags excessive torso lean and rushed squat tempo", async () => {
  const { createSquatTracker, updateSquatTracker } = await vite.ssrLoadModule(
    "/lib/squat-repetition.ts",
  );
  const { createSquatCoach, updateSquatCoach } = await vite.ssrLoadModule(
    "/lib/squat-coaching.ts",
  );

  const kneeAngles = [170, 154, 130, 108, 104, 118, 145, 162];
  let tracker = createSquatTracker();
  let coach = createSquatCoach();

  kneeAngles.forEach((knee, index) => {
    tracker = updateSquatTracker(tracker, knee);
    coach = updateSquatCoach(
      coach,
      tracker.phase,
      tracker.repetitions,
      {
        side: "left",
        knee,
        hip: knee - 5,
        torsoLean: 52,
        confidence: 0.9,
      },
      index * 0.1,
    );
  });

  assert.equal(coach.completedReps.length, 1);
  assert.equal(coach.completedReps[0].rating, "Needs attention");
  assert.deepEqual(
    coach.completedReps[0].signals
      .filter((signal) => signal.status === "adjust")
      .map((signal) => signal.area),
    ["Depth", "Torso", "Tempo"],
  );
  assert.equal(coach.completedReps[0].reviewAtSeconds, 0.4);
  assert.equal(coach.completedReps[0].signals[1].timestampSeconds, 0.1);
});

test("maps only validated catalog exercises to available form checks", async () => {
  const {
    FORM_CHECK_EXERCISES,
    findSupportedFormCheckExercise,
    getFormCheckPath,
    parseFormCheckExerciseId,
  } = await vite.ssrLoadModule("/lib/form-check-exercises.ts");

  assert.deepEqual(
    FORM_CHECK_EXERCISES.map((exercise) => exercise.name),
    [
      "Bodyweight squat",
      "Barbell back squat",
      "Deadlift",
      "Romanian deadlift",
      "Bulgarian split squat",
      "Lunge",
      "Flat bench press",
      "Incline bench press",
      "Barbell overhead press",
      "Dumbbell shoulder press",
      "Chest-supported row",
      "Bent-over row",
      "Single-arm dumbbell row",
      "Pull-up / chin-up",
      "Lat pulldown",
      "Leg extension",
      "Leg curl",
      "Biceps curl",
      "Triceps pushdown",
      "Triceps extension",
      "Crunch",
      "Reverse crunch",
      "Leg raise",
      "Standing calf raise",
      "Seated calf raise",
      "Lateral raise",
      "Pectoral fly",
      "Rear-delt fly",
      "Lat prayer",
      "Dip",
      "Adductor machine",
      "Abductor machine",
    ],
  );
  assert.equal(findSupportedFormCheckExercise("Deadlift")?.id, "deadlift");
  assert.equal(
    findSupportedFormCheckExercise("Romanian Deadlift")?.id,
    "romanian_deadlift",
  );
  assert.equal(
    findSupportedFormCheckExercise("Barbell Back Squat")?.id,
    "barbell_back_squat",
  );
  assert.equal(findSupportedFormCheckExercise("Sumo Deadlift"), null);
  assert.equal(
    findSupportedFormCheckExercise("Dumbbell Bulgarian Split Squat")?.id,
    "bulgarian_split_squat",
  );
  assert.equal(findSupportedFormCheckExercise("Walking Lunge")?.id, "lunge");
  assert.equal(findSupportedFormCheckExercise("Weighted Lunge")?.id, "lunge");
  assert.equal(
    findSupportedFormCheckExercise("Flat Barbell Bench Press")?.id,
    "flat_bench_press",
  );
  assert.equal(
    findSupportedFormCheckExercise("Flat Dumbbell Bench Press")?.id,
    "flat_bench_press",
  );
  assert.equal(
    findSupportedFormCheckExercise("Incline Dumbbell Bench Press")?.id,
    "incline_bench_press",
  );
  assert.equal(
    findSupportedFormCheckExercise("Barbell Overhead Press")?.id,
    "barbell_overhead_press",
  );
  assert.equal(
    findSupportedFormCheckExercise("Seated Dumbbell Shoulder Press")?.id,
    "dumbbell_shoulder_press",
  );
  assert.equal(
    findSupportedFormCheckExercise("Chest-supported Row")?.id,
    "chest_supported_row",
  );
  assert.equal(
    findSupportedFormCheckExercise("Dumbbell Seal Row")?.id,
    "chest_supported_row",
  );
  assert.equal(
    findSupportedFormCheckExercise("Seated Cable Row")?.id,
    "chest_supported_row",
  );
  assert.equal(
    findSupportedFormCheckExercise("Machine Row")?.id,
    "chest_supported_row",
  );
  assert.equal(
    findSupportedFormCheckExercise("T-Bar Row")?.id,
    "bent_over_row",
  );
  assert.equal(
    findSupportedFormCheckExercise("Pendlay Row")?.id,
    "bent_over_row",
  );
  assert.equal(
    findSupportedFormCheckExercise("Bent-over Smith Machine Row")?.id,
    "bent_over_row",
  );
  assert.equal(
    findSupportedFormCheckExercise("Single-arm Dumbbell Row")?.id,
    "single_arm_dumbbell_row",
  );
  assert.equal(findSupportedFormCheckExercise("Cable Upright Row"), null);
  assert.equal(findSupportedFormCheckExercise("Pull-up")?.id, "pull_up");
  assert.equal(findSupportedFormCheckExercise("Chin-up")?.id, "pull_up");
  assert.equal(
    findSupportedFormCheckExercise("Weighted Chin-up")?.id,
    "pull_up",
  );
  assert.equal(
    findSupportedFormCheckExercise("Sternum Pull-up")?.id,
    "pull_up",
  );
  assert.equal(
    findSupportedFormCheckExercise("Lat Pulldown")?.id,
    "lat_pulldown",
  );
  assert.equal(
    findSupportedFormCheckExercise("Close-grip Lat Pulldown")?.id,
    "lat_pulldown",
  );
  assert.equal(
    findSupportedFormCheckExercise("Leg Extension")?.id,
    "leg_extension",
  );
  assert.equal(
    findSupportedFormCheckExercise("Single-leg Extension")?.id,
    "leg_extension",
  );
  assert.equal(
    findSupportedFormCheckExercise("Alternating Leg Extension")?.id,
    "leg_extension",
  );
  assert.equal(findSupportedFormCheckExercise("Leg Curl")?.id, "leg_curl");
  assert.equal(
    findSupportedFormCheckExercise("Seated Leg Curl")?.id,
    "leg_curl",
  );
  assert.equal(
    findSupportedFormCheckExercise("Single-leg Curl")?.id,
    "leg_curl",
  );
  assert.equal(
    findSupportedFormCheckExercise("Alternating Leg Curl")?.id,
    "leg_curl",
  );
  assert.equal(
    findSupportedFormCheckExercise("EZ-Bar Curl")?.id,
    "biceps_curl",
  );
  assert.equal(
    findSupportedFormCheckExercise("Dumbbell Hammer Curl")?.id,
    "biceps_curl",
  );
  assert.equal(
    findSupportedFormCheckExercise("Single-arm Cable Curl")?.id,
    "biceps_curl",
  );
  assert.equal(
    findSupportedFormCheckExercise("Cable Pushdown")?.id,
    "triceps_pushdown",
  );
  assert.equal(
    findSupportedFormCheckExercise("Cable Pushdown (Drop Set)")?.id,
    "triceps_pushdown",
  );
  assert.equal(
    findSupportedFormCheckExercise("Single-arm Rope Pushdown")?.id,
    "triceps_pushdown",
  );
  assert.equal(
    findSupportedFormCheckExercise("Dumbbell Skull Crusher")?.id,
    "triceps_extension",
  );
  assert.equal(
    findSupportedFormCheckExercise("French Press")?.id,
    "triceps_extension",
  );
  assert.equal(
    findSupportedFormCheckExercise("Cable Overhead Extension")?.id,
    "triceps_extension",
  );
  assert.equal(
    findSupportedFormCheckExercise("Triceps Dip")?.id,
    "triceps_dip",
  );
  assert.equal(
    findSupportedFormCheckExercise("Weighted Dip")?.id,
    "triceps_dip",
  );
  assert.equal(
    findSupportedFormCheckExercise("Adductor Machine")?.id,
    "adductor_machine",
  );
  assert.equal(
    findSupportedFormCheckExercise("Abductor Machine")?.id,
    "abductor_machine",
  );
  assert.equal(findSupportedFormCheckExercise("Optional Biceps Isolation"), null);
  assert.equal(findSupportedFormCheckExercise("Decline Crunch")?.id, "crunch");
  assert.equal(
    findSupportedFormCheckExercise("Kneeling Cable Crunch")?.id,
    "crunch",
  );
  assert.equal(
    findSupportedFormCheckExercise("Reverse Crunch")?.id,
    "reverse_crunch",
  );
  assert.equal(
    findSupportedFormCheckExercise("Roman Chair Leg Raise")?.id,
    "leg_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Hanging Straight-leg Raise")?.id,
    "leg_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Hanging Knee Raise")?.id,
    "leg_raise",
  );
  assert.equal(findSupportedFormCheckExercise("Standing Oblique Crunch"), null);
  assert.equal(
    findSupportedFormCheckExercise("Smith Machine Calf Raise")?.id,
    "standing_calf_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Standing Machine Calf Raise")?.id,
    "standing_calf_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Single-leg Dumbbell Calf Raise")?.id,
    "standing_calf_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Seated Calf Press")?.id,
    "seated_calf_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Seated Machine Calf Raise")?.id,
    "seated_calf_raise",
  );
  assert.equal(findSupportedFormCheckExercise("Optional Calf Isolation"), null);
  assert.equal(
    findSupportedFormCheckExercise("Dumbbell Lateral Raise")?.id,
    "lateral_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Cable Lateral Raise")?.id,
    "lateral_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Machine Lateral Raise")?.id,
    "lateral_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Egyptian Cable Raise")?.id,
    "lateral_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Leaning Lateral Raise")?.id,
    "lateral_raise",
  );
  assert.equal(
    findSupportedFormCheckExercise("Incline Lateral Raise")?.id,
    "lateral_raise",
  );
  assert.equal(findSupportedFormCheckExercise("Optional Shoulder Isolation"), null);
  assert.equal(
    findSupportedFormCheckExercise("Incline Cable Flye")?.id,
    "pectoral_fly",
  );
  assert.equal(
    findSupportedFormCheckExercise("Cable Pectoral Flye")?.id,
    "pectoral_fly",
  );
  assert.equal(
    findSupportedFormCheckExercise("Machine Pectoral Flye")?.id,
    "pectoral_fly",
  );
  assert.equal(
    findSupportedFormCheckExercise("Standing Cable Flye")?.id,
    "pectoral_fly",
  );
  assert.equal(
    findSupportedFormCheckExercise("Incline Flye or Cable Crossover")?.id,
    "pectoral_fly",
  );
  for (const exerciseName of [
    "Cable Rear-delt Flye",
    "Dumbbell Rear-delt Flye",
    "Machine Rear-delt Flye",
    "Rear-delt Flye",
    "Bent-over Flye",
  ]) {
    assert.equal(
      findSupportedFormCheckExercise(exerciseName)?.id,
      "rear_delt_fly",
    );
  }
  assert.equal(findSupportedFormCheckExercise("Lat Prayer")?.id, "lat_prayer");
  assert.equal(
    findSupportedFormCheckExercise("Lat Prayer (Drop Set)")?.id,
    "lat_prayer",
  );
  assert.equal(findSupportedFormCheckExercise("Bradford or Arnold Press"), null);
  assert.equal(getFormCheckPath("deadlift"), "/form-check?exercise=deadlift");
  assert.equal(parseFormCheckExerciseId("romanian_deadlift"), "romanian_deadlift");
  assert.equal(parseFormCheckExerciseId("unknown"), null);
});

test("counts complete deadlift and Romanian deadlift hinge cycles", async () => {
  const { createHingeTracker, updateHingeTracker } = await vite.ssrLoadModule(
    "/lib/hinge-repetition.ts",
  );

  const run = (exerciseId, angles) =>
    angles.reduce(
      (tracker, angle) => updateHingeTracker(tracker, angle, exerciseId),
      createHingeTracker(),
    );

  const deadlift = run(
    "deadlift",
    [170, 162, 149, 135, 116, 110, 120, 138, 153, 162],
  );
  const romanianDeadlift = run(
    "romanian_deadlift",
    [170, 162, 149, 138, 124, 118, 130, 145, 154, 162],
  );
  const partial = run("deadlift", [170, 149, 130, 120, 135, 152, 162]);

  assert.equal(deadlift.repetitions, 1);
  assert.equal(romanianDeadlift.repetitions, 1);
  assert.equal(partial.repetitions, 0);
});

test("scores Romanian deadlift reps with variant-specific hinge coaching", async () => {
  const { createHingeTracker, updateHingeTracker } = await vite.ssrLoadModule(
    "/lib/hinge-repetition.ts",
  );
  const { createHingeCoach, updateHingeCoach } = await vite.ssrLoadModule(
    "/lib/hinge-coaching.ts",
  );
  const hipAngles = [170, 162, 149, 138, 124, 110, 108, 120, 138, 153, 162];
  let tracker = createHingeTracker();
  let coach = createHingeCoach();

  hipAngles.forEach((hip, index) => {
    tracker = updateHingeTracker(tracker, hip, "romanian_deadlift");
    coach = updateHingeCoach(
      coach,
      tracker.phase,
      tracker.repetitions,
      {
        side: "right",
        hip,
        knee: index >= 2 && index <= 8 ? 132 : 170,
        torsoLean: 180 - hip,
        confidence: 0.94,
      },
      index * 0.3,
      "romanian_deadlift",
    );
  });

  assert.equal(coach.completedReps.length, 1);
  assert.equal(coach.completedReps[0].score, 100);
  assert.equal(coach.completedReps[0].rating, "Strong");
  assert.deepEqual(
    coach.completedReps[0].signals.map((signal) => signal.area),
    ["Range", "Knee bend", "Tempo"],
  );
  assert.equal(
    coach.completedReps[0].signals.every((signal) => signal.status === "good"),
    true,
  );
});

test("counts only complete split-squat and lunge cycles", async () => {
  const { createUnilateralTracker, updateUnilateralTracker } =
    await vite.ssrLoadModule("/lib/unilateral-repetition.ts");
  const run = (angles) =>
    angles.reduce(
      (tracker, angle) => updateUnilateralTracker(tracker, angle),
      createUnilateralTracker(),
    );

  const complete = run([165, 158, 147, 132, 114, 106, 115, 125, 143, 156]);
  const partial = run([165, 147, 130, 118, 126, 145, 156]);
  const midRepStart = run([130, 108, 120, 145, 158]);

  assert.equal(complete.repetitions, 1);
  assert.equal(complete.phase, "standing");
  assert.equal(partial.repetitions, 0);
  assert.equal(midRepStart.repetitions, 0);
});

test("scores Bulgarian split squats with single-leg coaching", async () => {
  const { createUnilateralTracker, updateUnilateralTracker } =
    await vite.ssrLoadModule("/lib/unilateral-repetition.ts");
  const { createUnilateralCoach, updateUnilateralCoach } =
    await vite.ssrLoadModule("/lib/unilateral-coaching.ts");
  const kneeAngles = [165, 158, 147, 132, 112, 100, 103, 118, 136, 151, 157];
  let tracker = createUnilateralTracker();
  let coach = createUnilateralCoach();

  kneeAngles.forEach((knee, index) => {
    tracker = updateUnilateralTracker(tracker, knee);
    coach = updateUnilateralCoach(
      coach,
      tracker.phase,
      tracker.repetitions,
      {
        side: "left",
        knee,
        hip: knee + 12,
        torsoLean: index >= 2 && index <= 8 ? 24 : 10,
        confidence: 0.93,
      },
      index * 0.3,
      "bulgarian_split_squat",
    );
  });

  assert.equal(coach.completedReps.length, 1);
  assert.equal(coach.completedReps[0].score, 100);
  assert.equal(coach.completedReps[0].rating, "Strong");
  assert.deepEqual(
    coach.completedReps[0].signals.map((signal) => signal.area),
    ["Range", "Torso", "Tempo"],
  );
});

test("counts only complete bench press cycles", async () => {
  const { createPressTracker, updatePressTracker } = await vite.ssrLoadModule(
    "/lib/press-repetition.ts",
  );
  const run = (angles) =>
    angles.reduce(
      (tracker, angle) => updatePressTracker(tracker, angle),
      createPressTracker(),
    );

  const complete = run([170, 160, 144, 130, 118, 105, 116, 130, 145, 158]);
  const partial = run([170, 150, 144, 132, 124, 132, 146, 158]);
  const midRepStart = run([120, 100, 118, 138, 158]);

  assert.equal(complete.repetitions, 1);
  assert.equal(complete.phase, "locked-out");
  assert.equal(partial.repetitions, 0);
  assert.equal(midRepStart.repetitions, 0);
});

test("scores bench presses with range, wrist, and tempo coaching", async () => {
  const { createPressTracker, updatePressTracker } = await vite.ssrLoadModule(
    "/lib/press-repetition.ts",
  );
  const { createPressCoach, updatePressCoach } = await vite.ssrLoadModule(
    "/lib/press-coaching.ts",
  );
  const elbowAngles = [170, 160, 144, 130, 112, 95, 102, 120, 135, 150, 158];
  let tracker = createPressTracker();
  let coach = createPressCoach();

  elbowAngles.forEach((elbow, index) => {
    tracker = updatePressTracker(tracker, elbow);
    coach = updatePressCoach(
      coach,
      tracker.phase,
      tracker.repetitions,
      {
        side: "right",
        elbow,
        shoulder: 95,
        wristOffset: index === 5 ? 48 : 12,
        torsoLean: 90,
        confidence: 0.94,
      },
      index * 0.3,
      "flat_bench_press",
    );
  });

  assert.equal(coach.completedReps.length, 1);
  assert.equal(coach.completedReps[0].score, 77);
  assert.equal(coach.completedReps[0].minimumElbowAngle, 95);
  assert.equal(coach.completedReps[0].wristOffsetAtBottom, 48);
  assert.deepEqual(
    coach.completedReps[0].signals.map((signal) => signal.area),
    ["Range", "Wrist position", "Tempo"],
  );
  assert.equal(coach.completedReps[0].signals[1].status, "adjust");
});

test("scores overhead presses with range, torso, and tempo coaching", async () => {
  const { createPressTracker, updatePressTracker } = await vite.ssrLoadModule(
    "/lib/press-repetition.ts",
  );
  const { createPressCoach, updatePressCoach } = await vite.ssrLoadModule(
    "/lib/press-coaching.ts",
  );
  const elbowAngles = [170, 160, 144, 130, 112, 100, 106, 122, 136, 150, 158];
  let tracker = createPressTracker();
  let coach = createPressCoach();

  elbowAngles.forEach((elbow, index) => {
    tracker = updatePressTracker(tracker, elbow);
    coach = updatePressCoach(
      coach,
      tracker.phase,
      tracker.repetitions,
      {
        side: "left",
        elbow,
        shoulder: 110,
        wristOffset: 14,
        torsoLean: index === 6 ? 30 : 10,
        confidence: 0.93,
      },
      index * 0.3,
      "barbell_overhead_press",
    );
  });

  assert.equal(coach.completedReps.length, 1);
  assert.equal(coach.completedReps[0].score, 77);
  assert.equal(coach.completedReps[0].maximumTorsoLean, 30);
  assert.deepEqual(
    coach.completedReps[0].signals.map((signal) => signal.area),
    ["Range", "Torso", "Tempo"],
  );
  assert.equal(coach.completedReps[0].signals[1].status, "adjust");
});

test("scores dips with elbow range, torso stability, and tempo coaching", async () => {
  const { createPressTracker, updatePressTracker } = await vite.ssrLoadModule(
    "/lib/press-repetition.ts",
  );
  const { createPressCoach, updatePressCoach } = await vite.ssrLoadModule(
    "/lib/press-coaching.ts",
  );

  const run = (torsoLeanAt) => {
    const elbowAngles = [170, 160, 144, 130, 112, 95, 104, 120, 136, 150, 158];
    let tracker = createPressTracker();
    let coach = createPressCoach();

    elbowAngles.forEach((elbow, index) => {
      tracker = updatePressTracker(tracker, elbow);
      coach = updatePressCoach(
        coach,
        tracker.phase,
        tracker.repetitions,
        {
          side: "right",
          elbow,
          shoulder: 45,
          wristOffset: 10,
          torsoLean: torsoLeanAt(index),
          confidence: 0.95,
        },
        index * 0.3,
        "triceps_dip",
      );
    });

    return coach.completedReps[0];
  };

  const stable = run((index) => 14 + (index % 2));
  const shifting = run((index) => index === 5 ? 39 : 14);

  assert.equal(stable.score, 100);
  assert.equal(stable.minimumElbowAngle, 95);
  assert.equal(stable.torsoLeanRange, 1);
  assert.equal(shifting.score, 77);
  assert.equal(shifting.torsoLeanRange, 25);
  assert.deepEqual(
    shifting.signals.map((signal) => signal.area),
    ["Range", "Torso stability", "Tempo"],
  );
  assert.equal(shifting.signals[1].status, "adjust");
});

test("counts only complete adductor and abductor machine cycles", async () => {
  const { createHipMachineTracker, updateHipMachineTracker } =
    await vite.ssrLoadModule("/lib/hip-machine-repetition.ts");

  const run = (values, exerciseId) =>
    values.reduce(
      (tracker, value) => updateHipMachineTracker(tracker, value, exerciseId),
      createHipMachineTracker(),
    );

  const adductor = run(
    [180, 160, 140, 124, 100, 84, 75, 95, 111, 135, 151],
    "adductor_machine",
  );
  const partialAdductor = run(
    [180, 160, 140, 124, 105, 95, 111, 135, 151],
    "adductor_machine",
  );
  const abductor = run(
    [70, 85, 116, 140, 155, 170, 145, 129, 105, 88],
    "abductor_machine",
  );
  const partialAbductor = run(
    [70, 85, 116, 135, 145, 129, 105, 88],
    "abductor_machine",
  );

  assert.equal(adductor.repetitions, 1);
  assert.equal(partialAdductor.repetitions, 0);
  assert.equal(abductor.repetitions, 1);
  assert.equal(partialAbductor.repetitions, 0);
});

test("scores hip-machine reps with range, knee symmetry, and tempo coaching", async () => {
  const { createHipMachineTracker, updateHipMachineTracker } =
    await vite.ssrLoadModule("/lib/hip-machine-repetition.ts");
  const { createHipMachineCoach, updateHipMachineCoach } =
    await vite.ssrLoadModule("/lib/hip-machine-coaching.ts");

  const run = (asymmetryAt) => {
    const separations = [180, 160, 140, 124, 100, 84, 75, 95, 111, 135, 151];
    let tracker = createHipMachineTracker();
    let coach = createHipMachineCoach();

    separations.forEach((kneeSeparation, index) => {
      tracker = updateHipMachineTracker(
        tracker,
        kneeSeparation,
        "adductor_machine",
      );
      coach = updateHipMachineCoach(
        coach,
        tracker.phase,
        tracker.repetitions,
        {
          side: "bilateral",
          kneeSeparation,
          leftKneeDistance: kneeSeparation / 2,
          rightKneeDistance: kneeSeparation / 2,
          kneeAsymmetry: asymmetryAt(index),
          confidence: 0.95,
        },
        index * 0.3,
        "adductor_machine",
      );
    });

    return coach.completedReps[0];
  };

  const stable = run(() => 4);
  const uneven = run((index) => index === 5 ? 40 : 4);

  assert.equal(stable.score, 100);
  assert.equal(stable.minimumKneeSeparation, 75);
  assert.equal(stable.maximumKneeSeparation, 151);
  assert.equal(stable.kneeSeparationRange, 76);
  assert.equal(stable.maximumKneeAsymmetry, 4);
  assert.equal(uneven.score, 80);
  assert.equal(uneven.maximumKneeAsymmetry, 40);
  assert.deepEqual(
    uneven.signals.map((signal) => signal.area),
    ["Range", "Knee symmetry", "Tempo"],
  );
  assert.equal(uneven.signals[1].status, "adjust");
});

test("counts only complete row cycles", async () => {
  const { createRowTracker, updateRowTracker } = await vite.ssrLoadModule(
    "/lib/row-repetition.ts",
  );
  const run = (angles) =>
    angles.reduce(
      (tracker, angle) => updateRowTracker(tracker, angle),
      createRowTracker(),
    );

  const complete = run([170, 160, 141, 128, 108, 96, 106, 120, 136, 151]);
  const partial = run([170, 150, 141, 130, 116, 124, 139, 151]);
  const midRepStart = run([125, 102, 116, 134, 151]);

  assert.equal(complete.repetitions, 1);
  assert.equal(complete.phase, "extended");
  assert.equal(partial.repetitions, 0);
  assert.equal(midRepStart.repetitions, 0);
});

test("scores rows with range, torso stability, and tempo coaching", async () => {
  const { createRowTracker, updateRowTracker } = await vite.ssrLoadModule(
    "/lib/row-repetition.ts",
  );
  const { createRowCoach, updateRowCoach } = await vite.ssrLoadModule(
    "/lib/row-coaching.ts",
  );
  const elbowAngles = [170, 160, 141, 128, 108, 95, 104, 120, 136, 151];
  let tracker = createRowTracker();
  let coach = createRowCoach();

  elbowAngles.forEach((elbow, index) => {
    tracker = updateRowTracker(tracker, elbow);
    coach = updateRowCoach(
      coach,
      tracker.phase,
      tracker.repetitions,
      {
        side: "right",
        elbow,
        shoulder: 85,
        wristOffset: 10,
        torsoLean: index === 5 ? 52 : 30,
        confidence: 0.94,
      },
      index * 0.3,
      "bent_over_row",
    );
  });

  assert.equal(coach.completedReps.length, 1);
  assert.equal(coach.completedReps[0].score, 77);
  assert.equal(coach.completedReps[0].minimumElbowAngle, 95);
  assert.equal(coach.completedReps[0].torsoLeanRange, 22);
  assert.deepEqual(
    coach.completedReps[0].signals.map((signal) => signal.area),
    ["Range", "Torso stability", "Tempo"],
  );
  assert.equal(coach.completedReps[0].signals[1].status, "adjust");
});

test("counts only complete vertical-pull cycles", async () => {
  const { createVerticalPullTracker, updateVerticalPullTracker } =
    await vite.ssrLoadModule("/lib/vertical-pull-repetition.ts");
  const run = (angles) =>
    angles.reduce(
      (tracker, angle) => updateVerticalPullTracker(tracker, angle),
      createVerticalPullTracker(),
    );

  const complete = run([170, 160, 141, 128, 108, 96, 106, 120, 136, 151]);
  const partial = run([170, 150, 141, 130, 116, 124, 139, 151]);
  const midRepStart = run([125, 102, 116, 134, 151]);

  assert.equal(complete.repetitions, 1);
  assert.equal(complete.phase, "extended");
  assert.equal(partial.repetitions, 0);
  assert.equal(midRepStart.repetitions, 0);
});

test("scores vertical pulls with range, torso stability, and tempo coaching", async () => {
  const { createVerticalPullTracker, updateVerticalPullTracker } =
    await vite.ssrLoadModule("/lib/vertical-pull-repetition.ts");
  const { createVerticalPullCoach, updateVerticalPullCoach } =
    await vite.ssrLoadModule("/lib/vertical-pull-coaching.ts");
  const elbowAngles = [170, 160, 141, 128, 108, 95, 104, 120, 136, 151];
  let tracker = createVerticalPullTracker();
  let coach = createVerticalPullCoach();

  elbowAngles.forEach((elbow, index) => {
    tracker = updateVerticalPullTracker(tracker, elbow);
    coach = updateVerticalPullCoach(
      coach,
      tracker.phase,
      tracker.repetitions,
      {
        side: "left",
        elbow,
        shoulder: 110,
        wristOffset: 8,
        torsoLean: index === 5 ? 35 : 10,
        confidence: 0.94,
      },
      index * 0.3,
      "pull_up",
    );
  });

  assert.equal(coach.completedReps.length, 1);
  assert.equal(coach.completedReps[0].score, 77);
  assert.equal(coach.completedReps[0].minimumElbowAngle, 95);
  assert.equal(coach.completedReps[0].torsoLeanRange, 25);
  assert.deepEqual(
    coach.completedReps[0].signals.map((signal) => signal.area),
    ["Range", "Torso stability", "Tempo"],
  );
  assert.equal(coach.completedReps[0].signals[1].status, "adjust");
});

test("counts only complete leg-extension and leg-curl cycles", async () => {
  const { createKneeIsolationTracker, updateKneeIsolationTracker } =
    await vite.ssrLoadModule("/lib/knee-isolation-repetition.ts");
  const run = (exerciseId, angles) =>
    angles.reduce(
      (tracker, angle) =>
        updateKneeIsolationTracker(tracker, angle, exerciseId),
      createKneeIsolationTracker(),
    );

  const extension = run(
    "leg_extension",
    [95, 105, 121, 140, 156, 162, 150, 140, 120, 108],
  );
  const curl = run(
    "leg_curl",
    [170, 160, 141, 125, 104, 96, 110, 120, 140, 151],
  );
  const partialExtension = run(
    "leg_extension",
    [95, 121, 140, 148, 140, 120, 108],
  );
  const midRepCurl = run("leg_curl", [130, 102, 120, 142, 152]);

  assert.equal(extension.repetitions, 1);
  assert.equal(extension.phase, "start");
  assert.equal(curl.repetitions, 1);
  assert.equal(curl.phase, "start");
  assert.equal(partialExtension.repetitions, 0);
  assert.equal(midRepCurl.repetitions, 0);
});

test("scores knee isolation with range, thigh stability, and tempo coaching", async () => {
  const { createKneeIsolationTracker, updateKneeIsolationTracker } =
    await vite.ssrLoadModule("/lib/knee-isolation-repetition.ts");
  const { createKneeIsolationCoach, updateKneeIsolationCoach } =
    await vite.ssrLoadModule("/lib/knee-isolation-coaching.ts");

  const run = (exerciseId, kneeAngles, hipAt) => {
    let tracker = createKneeIsolationTracker();
    let coach = createKneeIsolationCoach();

    kneeAngles.forEach((knee, index) => {
      tracker = updateKneeIsolationTracker(tracker, knee, exerciseId);
      coach = updateKneeIsolationCoach(
        coach,
        tracker.phase,
        tracker.repetitions,
        {
          side: "right",
          knee,
          hip: hipAt(index),
          torsoLean: 8,
          confidence: 0.95,
        },
        index * 0.3,
        exerciseId,
      );
    });

    return coach.completedReps[0];
  };

  const extension = run(
    "leg_extension",
    [95, 105, 121, 140, 156, 162, 150, 140, 120, 108],
    (index) => 92 + (index % 2),
  );
  const curl = run(
    "leg_curl",
    [170, 160, 141, 125, 104, 96, 110, 120, 140, 151],
    (index) => index === 5 ? 118 : 92,
  );

  assert.equal(extension.score, 100);
  assert.equal(extension.maximumKneeAngle, 162);
  assert.equal(extension.hipAngleRange, 1);
  assert.equal(curl.score, 77);
  assert.equal(curl.minimumKneeAngle, 96);
  assert.equal(curl.hipAngleRange, 26);
  assert.deepEqual(
    curl.signals.map((signal) => signal.area),
    ["Range", "Thigh stability", "Tempo"],
  );
  assert.equal(curl.signals[1].status, "adjust");
});

test("counts only complete curl, pushdown, and triceps-extension cycles", async () => {
  const { createArmIsolationTracker, updateArmIsolationTracker } =
    await vite.ssrLoadModule("/lib/arm-isolation-repetition.ts");
  const run = (exerciseId, angles) =>
    angles.reduce(
      (tracker, angle) =>
        updateArmIsolationTracker(tracker, angle, exerciseId),
      createArmIsolationTracker(),
    );

  const curl = run(
    "biceps_curl",
    [170, 155, 139, 110, 80, 62, 70, 85, 110, 140, 151],
  );
  const pushdown = run(
    "triceps_pushdown",
    [90, 100, 116, 135, 156, 162, 150, 140, 120, 98],
  );
  const extension = run(
    "triceps_extension",
    [170, 155, 139, 120, 100, 93, 100, 112, 130, 151],
  );
  const partialCurl = run(
    "biceps_curl",
    [170, 139, 110, 85, 100, 125, 151],
  );
  const midRepPushdown = run("triceps_pushdown", [125, 155, 140, 112, 98]);

  assert.equal(curl.repetitions, 1);
  assert.equal(curl.phase, "start");
  assert.equal(pushdown.repetitions, 1);
  assert.equal(pushdown.phase, "start");
  assert.equal(extension.repetitions, 1);
  assert.equal(extension.phase, "start");
  assert.equal(partialCurl.repetitions, 0);
  assert.equal(midRepPushdown.repetitions, 0);
});

test("scores arm isolation with range, upper-arm stability, and tempo coaching", async () => {
  const { createArmIsolationTracker, updateArmIsolationTracker } =
    await vite.ssrLoadModule("/lib/arm-isolation-repetition.ts");
  const { createArmIsolationCoach, updateArmIsolationCoach } =
    await vite.ssrLoadModule("/lib/arm-isolation-coaching.ts");

  const run = (exerciseId, elbowAngles, shoulderAt) => {
    let tracker = createArmIsolationTracker();
    let coach = createArmIsolationCoach();

    elbowAngles.forEach((elbow, index) => {
      tracker = updateArmIsolationTracker(tracker, elbow, exerciseId);
      coach = updateArmIsolationCoach(
        coach,
        tracker.phase,
        tracker.repetitions,
        {
          side: "left",
          elbow,
          shoulder: shoulderAt(index),
          wristOffset: 8,
          torsoLean: 10,
          confidence: 0.95,
        },
        index * 0.3,
        exerciseId,
      );
    });

    return coach.completedReps[0];
  };

  const curl = run(
    "biceps_curl",
    [170, 155, 139, 110, 80, 62, 70, 85, 110, 140, 151],
    (index) => 24 + (index % 2),
  );
  const pushdown = run(
    "triceps_pushdown",
    [90, 100, 116, 135, 156, 162, 150, 140, 120, 98],
    (index) => index === 5 ? 49 : 24,
  );

  assert.equal(curl.score, 100);
  assert.equal(curl.minimumElbowAngle, 62);
  assert.equal(curl.shoulderAngleRange, 1);
  assert.equal(pushdown.score, 77);
  assert.equal(pushdown.maximumElbowAngle, 162);
  assert.equal(pushdown.shoulderAngleRange, 25);
  assert.deepEqual(
    pushdown.signals.map((signal) => signal.area),
    ["Range", "Upper-arm stability", "Tempo"],
  );
  assert.equal(pushdown.signals[1].status, "adjust");
});

test("counts only complete crunch, reverse-crunch, and leg-raise cycles", async () => {
  const { createCoreFlexionTracker, updateCoreFlexionTracker } =
    await vite.ssrLoadModule("/lib/core-flexion-repetition.ts");
  const run = (exerciseId, angles) =>
    angles.reduce(
      (tracker, angle) =>
        updateCoreFlexionTracker(tracker, angle, exerciseId),
      createCoreFlexionTracker(),
    );

  const crunch = run(
    "crunch",
    [160, 145, 131, 110, 94, 100, 112, 130, 146],
  );
  const reverseCrunch = run(
    "reverse_crunch",
    [115, 105, 94, 75, 58, 67, 77, 95, 106],
  );
  const legRaise = run(
    "leg_raise",
    [165, 150, 134, 110, 88, 96, 107, 135, 151],
  );
  const partial = run(
    "crunch",
    [160, 145, 131, 115, 102, 112, 132, 146],
  );
  const midRepStart = run(
    "leg_raise",
    [120, 88, 105, 135, 151],
  );

  assert.equal(crunch.repetitions, 1);
  assert.equal(crunch.phase, "start");
  assert.equal(reverseCrunch.repetitions, 1);
  assert.equal(reverseCrunch.phase, "start");
  assert.equal(legRaise.repetitions, 1);
  assert.equal(legRaise.phase, "start");
  assert.equal(partial.repetitions, 0);
  assert.equal(midRepStart.repetitions, 0);
});

test("scores core flexion with range, body stability, and tempo coaching", async () => {
  const { createCoreFlexionTracker, updateCoreFlexionTracker } =
    await vite.ssrLoadModule("/lib/core-flexion-repetition.ts");
  const { createCoreFlexionCoach, updateCoreFlexionCoach } =
    await vite.ssrLoadModule("/lib/core-flexion-coaching.ts");

  const run = (exerciseId, hipAngles, kneeAt, torsoAt) => {
    let tracker = createCoreFlexionTracker();
    let coach = createCoreFlexionCoach();

    hipAngles.forEach((hip, index) => {
      tracker = updateCoreFlexionTracker(tracker, hip, exerciseId);
      coach = updateCoreFlexionCoach(
        coach,
        tracker.phase,
        tracker.repetitions,
        {
          side: "left",
          knee: kneeAt(index),
          hip,
          torsoLean: torsoAt(index),
          confidence: 0.95,
        },
        index * 0.3,
        exerciseId,
      );
    });

    return coach.completedReps[0];
  };

  const crunch = run(
    "crunch",
    [160, 145, 131, 110, 94, 100, 112, 130, 146],
    (index) => 90 + (index % 2),
    () => 75,
  );
  const reverseCrunch = run(
    "reverse_crunch",
    [115, 105, 94, 75, 58, 67, 77, 95, 106],
    () => 92,
    (index) => index === 4 ? 35 : 10,
  );

  assert.equal(crunch.score, 100);
  assert.equal(crunch.minimumHipAngle, 94);
  assert.equal(crunch.bodyPositionRange, 1);
  assert.equal(reverseCrunch.score, 80);
  assert.equal(reverseCrunch.minimumHipAngle, 58);
  assert.equal(reverseCrunch.bodyPositionRange, 25);
  assert.deepEqual(
    reverseCrunch.signals.map((signal) => signal.area),
    ["Range", "Body stability", "Tempo"],
  );
  assert.equal(reverseCrunch.signals[1].status, "adjust");
});

test("counts only complete standing and seated calf-raise cycles", async () => {
  const { createCalfIsolationTracker, updateCalfIsolationTracker } =
    await vite.ssrLoadModule("/lib/calf-isolation-repetition.ts");
  const run = (exerciseId, angles) =>
    angles.reduce(
      (tracker, angle) =>
        updateCalfIsolationTracker(tracker, angle, exerciseId),
      createCalfIsolationTracker(),
    );

  const standing = run(
    "standing_calf_raise",
    [108, 115, 123, 130, 134, 136, 130, 125, 118, 112],
  );
  const seated = run(
    "seated_calf_raise",
    [138, 145, 151, 158, 161, 164, 157, 153, 148, 142],
  );
  const partial = run(
    "standing_calf_raise",
    [108, 115, 123, 129, 125, 118, 112],
  );
  const midRepStart = run(
    "standing_calf_raise",
    [125, 135, 125, 112],
  );

  assert.equal(standing.repetitions, 1);
  assert.equal(standing.phase, "start");
  assert.equal(seated.repetitions, 1);
  assert.equal(seated.phase, "start");
  assert.equal(partial.repetitions, 0);
  assert.equal(midRepStart.repetitions, 0);
});

test("scores calf raises with ankle range, knee stability, and tempo coaching", async () => {
  const { createCalfIsolationTracker, updateCalfIsolationTracker } =
    await vite.ssrLoadModule("/lib/calf-isolation-repetition.ts");
  const { createCalfIsolationCoach, updateCalfIsolationCoach } =
    await vite.ssrLoadModule("/lib/calf-isolation-coaching.ts");

  const run = (exerciseId, ankleAngles, kneeAt) => {
    let tracker = createCalfIsolationTracker();
    let coach = createCalfIsolationCoach();

    ankleAngles.forEach((ankle, index) => {
      tracker = updateCalfIsolationTracker(tracker, ankle, exerciseId);
      coach = updateCalfIsolationCoach(
        coach,
        tracker.phase,
        tracker.repetitions,
        {
          side: "right",
          knee: kneeAt(index),
          ankle,
          confidence: 0.95,
        },
        index * 0.3,
        exerciseId,
      );
    });

    return coach.completedReps[0];
  };

  const standing = run(
    "standing_calf_raise",
    [108, 115, 123, 130, 134, 136, 130, 125, 118, 112],
    (index) => 175 + (index % 2),
  );
  const seated = run(
    "seated_calf_raise",
    [138, 145, 151, 158, 161, 164, 157, 153, 148, 142],
    (index) => index === 5 ? 110 : 90,
  );

  assert.equal(standing.score, 100);
  assert.equal(standing.minimumAnkleAngle, 112);
  assert.equal(standing.maximumAnkleAngle, 136);
  assert.equal(standing.ankleAngleRange, 24);
  assert.equal(seated.score, 80);
  assert.equal(seated.bodyPositionRange, 20);
  assert.deepEqual(
    seated.signals.map((signal) => signal.area),
    ["Range", "Knee stability", "Tempo"],
  );
  assert.equal(seated.signals[1].status, "adjust");
});

test("counts only complete lateral-raise cycles", async () => {
  const { createShoulderIsolationTracker, updateShoulderIsolationTracker } =
    await vite.ssrLoadModule("/lib/shoulder-isolation-repetition.ts");
  const run = (angles) =>
    angles.reduce(
      (tracker, angle) =>
        updateShoulderIsolationTracker(tracker, angle, "lateral_raise"),
      createShoulderIsolationTracker(),
    );

  const complete = run([15, 25, 41, 60, 72, 80, 62, 55, 35, 20]);
  const partial = run([15, 25, 41, 60, 66, 55, 35, 20]);
  const midRepStart = run([50, 75, 55, 20]);

  assert.equal(complete.repetitions, 1);
  assert.equal(complete.phase, "start");
  assert.equal(partial.repetitions, 0);
  assert.equal(midRepStart.repetitions, 0);
});

test("scores lateral raises with arm range, elbow stability, and tempo coaching", async () => {
  const { createShoulderIsolationTracker, updateShoulderIsolationTracker } =
    await vite.ssrLoadModule("/lib/shoulder-isolation-repetition.ts");
  const { createShoulderIsolationCoach, updateShoulderIsolationCoach } =
    await vite.ssrLoadModule("/lib/shoulder-isolation-coaching.ts");

  const run = (elbowAt) => {
    const shoulderAngles = [15, 25, 41, 60, 72, 80, 62, 55, 35, 20];
    let tracker = createShoulderIsolationTracker();
    let coach = createShoulderIsolationCoach();

    shoulderAngles.forEach((shoulder, index) => {
      tracker = updateShoulderIsolationTracker(
        tracker,
        shoulder,
        "lateral_raise",
      );
      coach = updateShoulderIsolationCoach(
        coach,
        tracker.phase,
        tracker.repetitions,
        {
          side: "left",
          elbow: elbowAt(index),
          shoulder,
          wristOffset: 0,
          torsoLean: 0,
          confidence: 0.95,
        },
        index * 0.3,
      );
    });

    return coach.completedReps[0];
  };

  const stable = run((index) => 170 + (index % 2));
  const drifting = run((index) => index === 5 ? 130 : 170);

  assert.equal(stable.score, 100);
  assert.equal(stable.minimumShoulderAngle, 20);
  assert.equal(stable.shoulderAngleRange, 60);
  assert.equal(stable.bodyPositionRange, 1);
  assert.equal(drifting.score, 80);
  assert.equal(drifting.bodyPositionRange, 40);
  assert.deepEqual(
    drifting.signals.map((signal) => signal.area),
    ["Range", "Elbow stability", "Tempo"],
  );
  assert.equal(drifting.signals[1].status, "adjust");
});

test("counts only complete pectoral-fly cycles", async () => {
  const { createChestIsolationTracker, updateChestIsolationTracker } =
    await vite.ssrLoadModule("/lib/chest-isolation-repetition.ts");
  const run = (spacing) =>
    spacing.reduce(
      (tracker, value) => updateChestIsolationTracker(tracker, value),
      createChestIsolationTracker(),
    );

  const complete = run([200, 180, 149, 130, 108, 90, 115, 130, 155, 180]);
  const partial = run([200, 180, 149, 130, 115, 130, 155, 180]);
  const midRepStart = run([145, 100, 135, 180]);

  assert.equal(complete.repetitions, 1);
  assert.equal(complete.phase, "start");
  assert.equal(partial.repetitions, 0);
  assert.equal(midRepStart.repetitions, 0);
});

test("scores pectoral flyes with closure range, elbow stability, and tempo coaching", async () => {
  const { createChestIsolationTracker, updateChestIsolationTracker } =
    await vite.ssrLoadModule("/lib/chest-isolation-repetition.ts");
  const { createChestIsolationCoach, updateChestIsolationCoach } =
    await vite.ssrLoadModule("/lib/chest-isolation-coaching.ts");

  const run = (elbowAt) => {
    const spacing = [200, 180, 149, 130, 108, 90, 115, 130, 155, 180];
    let tracker = createChestIsolationTracker();
    let coach = createChestIsolationCoach();

    spacing.forEach((wristSeparation, index) => {
      tracker = updateChestIsolationTracker(tracker, wristSeparation);
      const elbowAverage = elbowAt(index);
      coach = updateChestIsolationCoach(
        coach,
        tracker.phase,
        tracker.repetitions,
        {
          side: "bilateral",
          leftElbow: elbowAverage,
          rightElbow: elbowAverage,
          elbowAverage,
          wristSeparation,
          confidence: 0.95,
        },
        index * 0.3,
      );
    });

    return coach.completedReps[0];
  };

  const stable = run((index) => 160 + (index % 2));
  const drifting = run((index) => index === 5 ? 120 : 160);

  assert.equal(stable.score, 100);
  assert.equal(stable.minimumWristSeparation, 90);
  assert.equal(stable.maximumWristSeparation, 180);
  assert.equal(stable.wristSeparationRange, 90);
  assert.equal(drifting.score, 80);
  assert.equal(drifting.bodyPositionRange, 40);
  assert.deepEqual(
    drifting.signals.map((signal) => signal.area),
    ["Range", "Elbow stability", "Tempo"],
  );
  assert.equal(drifting.signals[1].status, "adjust");
});

test("counts only complete rear-delt-fly cycles", async () => {
  const {
    createRearShoulderIsolationTracker,
    updateRearShoulderIsolationTracker,
  } = await vite.ssrLoadModule("/lib/rear-shoulder-isolation-repetition.ts");
  const run = (spacing) =>
    spacing.reduce(
      (tracker, value) => updateRearShoulderIsolationTracker(tracker, value),
      createRearShoulderIsolationTracker(),
    );

  const complete = run([100, 115, 141, 165, 191, 210, 185, 160, 135, 110]);
  const partial = run([100, 115, 141, 165, 185, 160, 135, 110]);
  const midRepStart = run([145, 200, 155, 110]);

  assert.equal(complete.repetitions, 1);
  assert.equal(complete.phase, "start");
  assert.equal(partial.repetitions, 0);
  assert.equal(midRepStart.repetitions, 0);
});

test("scores rear-delt flyes with opening range, elbow stability, and tempo coaching", async () => {
  const {
    createRearShoulderIsolationTracker,
    updateRearShoulderIsolationTracker,
  } = await vite.ssrLoadModule("/lib/rear-shoulder-isolation-repetition.ts");
  const {
    createRearShoulderIsolationCoach,
    updateRearShoulderIsolationCoach,
  } = await vite.ssrLoadModule("/lib/rear-shoulder-isolation-coaching.ts");

  const run = (elbowAt) => {
    const spacing = [100, 115, 141, 165, 191, 210, 185, 160, 135, 110];
    let tracker = createRearShoulderIsolationTracker();
    let coach = createRearShoulderIsolationCoach();

    spacing.forEach((wristSeparation, index) => {
      tracker = updateRearShoulderIsolationTracker(tracker, wristSeparation);
      const elbowAverage = elbowAt(index);
      coach = updateRearShoulderIsolationCoach(
        coach,
        tracker.phase,
        tracker.repetitions,
        {
          side: "bilateral",
          leftElbow: elbowAverage,
          rightElbow: elbowAverage,
          elbowAverage,
          wristSeparation,
          confidence: 0.95,
        },
        index * 0.3,
      );
    });

    return coach.completedReps[0];
  };

  const stable = run((index) => 160 + (index % 2));
  const drifting = run((index) => index === 5 ? 120 : 160);

  assert.equal(stable.score, 100);
  assert.equal(stable.minimumWristSeparation, 110);
  assert.equal(stable.maximumWristSeparation, 210);
  assert.equal(stable.wristSeparationRange, 100);
  assert.equal(drifting.score, 80);
  assert.equal(drifting.bodyPositionRange, 40);
  assert.deepEqual(
    drifting.signals.map((signal) => signal.area),
    ["Range", "Elbow stability", "Tempo"],
  );
  assert.equal(drifting.signals[1].status, "adjust");
});

test("counts only complete straight-arm pull cycles", async () => {
  const { createStraightArmPullTracker, updateStraightArmPullTracker } =
    await vite.ssrLoadModule("/lib/straight-arm-pull-repetition.ts");
  const run = (angles) =>
    angles.reduce(
      (tracker, value) => updateStraightArmPullTracker(tracker, value),
      createStraightArmPullTracker(),
    );

  const complete = run([160, 150, 124, 100, 74, 60, 85, 101, 130, 151]);
  const partial = run([160, 150, 124, 100, 80, 101, 130, 151]);
  const midRepStart = run([120, 70, 110, 155]);

  assert.equal(complete.repetitions, 1);
  assert.equal(complete.phase, "start");
  assert.equal(partial.repetitions, 0);
  assert.equal(midRepStart.repetitions, 0);
});

test("scores lat prayers with shoulder range, elbow stability, and tempo coaching", async () => {
  const { createStraightArmPullTracker, updateStraightArmPullTracker } =
    await vite.ssrLoadModule("/lib/straight-arm-pull-repetition.ts");
  const { createStraightArmPullCoach, updateStraightArmPullCoach } =
    await vite.ssrLoadModule("/lib/straight-arm-pull-coaching.ts");

  const run = (elbowAt) => {
    const shoulderAngles = [160, 150, 124, 100, 74, 60, 85, 101, 130, 151];
    let tracker = createStraightArmPullTracker();
    let coach = createStraightArmPullCoach();

    shoulderAngles.forEach((shoulder, index) => {
      tracker = updateStraightArmPullTracker(tracker, shoulder);
      const elbow = elbowAt(index);
      coach = updateStraightArmPullCoach(
        coach,
        tracker.phase,
        tracker.repetitions,
        {
          side: "left",
          elbow,
          shoulder,
          wristOffset: 0,
          torsoLean: 20,
          confidence: 0.95,
        },
        index * 0.3,
      );
    });

    return coach.completedReps[0];
  };

  const stable = run((index) => 160 + (index % 2));
  const drifting = run((index) => index === 4 ? 120 : 160);

  assert.equal(stable.score, 100);
  assert.equal(stable.minimumShoulderAngle, 60);
  assert.equal(stable.shoulderAngleRange, 91);
  assert.equal(stable.bodyPositionRange, 1);
  assert.equal(drifting.score, 80);
  assert.equal(drifting.bodyPositionRange, 40);
  assert.deepEqual(
    drifting.signals.map((signal) => signal.area),
    ["Range", "Elbow stability", "Tempo"],
  );
  assert.equal(drifting.signals[1].status, "adjust");
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});
