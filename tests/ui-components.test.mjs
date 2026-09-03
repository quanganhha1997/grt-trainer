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

test("uses the Grt white-first palette and precise button motion", async () => {
  const sourceCss = await readFile(path.join(root, "app", "globals.css"), "utf8");
  const { Button } = await vite.ssrLoadModule("/components/ui/button.tsx");
  const buttonHtml = renderToStaticMarkup(React.createElement(Button, null, "Analyze"));

  for (const color of ["#f7f7f3", "#111111", "#050505", "#ffffff", "#666666", "#d8d8d3", "#efefea"]) {
    assert.match(sourceCss, new RegExp(color, "i"));
  }

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

test("renders Grt navigation and the workout library foundation", async () => {
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
  assert.match(plannerHtml, /Simple routines\. Effective training\./);
  assert.match(plannerHtml, /Bodyweight squat/);
  assert.match(plannerHtml, /Selected routine/);
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

test("renders the v0.3 editorial feedback hierarchy after analysis", async () => {
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
  assert.ok(scoreIndex >= 0 && scoreIndex < goodIndex);
  assert.ok(goodIndex < fixIndex && fixIndex < nextIndex);
  assert.match(source, /Capture quality, joint measurements, and rep breakdown/);
  assert.match(sourceCss, /\.form-results-grid\s*\{[^}]*grid-template-columns:/s);
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
