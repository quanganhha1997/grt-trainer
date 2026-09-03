export type ScanQualityLevel = "high" | "usable" | "low";

export type ScanQualityInput = {
  attemptedFrames: number;
  poseFrames: number;
  measurableFrames: number;
  averageConfidence: number;
  leftSideSamples: number;
  rightSideSamples: number;
  maximumVisibleLandmarks: number;
};

export type ScanQualityResult = {
  level: ScanQualityLevel;
  score: number;
  allowCoaching: boolean;
  poseCoverage: number;
  measurementCoverage: number;
  sideConsistency: number;
  averageConfidence: number;
  issues: string[];
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return clamp(numerator / denominator);
}

export function evaluateScanQuality(
  input: ScanQualityInput,
): ScanQualityResult {
  const poseCoverage = ratio(input.poseFrames, input.attemptedFrames);
  const measurementCoverage = ratio(
    input.measurableFrames,
    input.poseFrames,
  );
  const sideSamples = input.leftSideSamples + input.rightSideSamples;
  const sideConsistency = ratio(
    Math.max(input.leftSideSamples, input.rightSideSamples),
    sideSamples,
  );
  const averageConfidence = clamp(input.averageConfidence);
  const score = Math.round(
    (poseCoverage * 0.3 +
      measurementCoverage * 0.3 +
      averageConfidence * 0.25 +
      sideConsistency * 0.15) *
      100,
  );

  const issues: string[] = [];

  if (input.attemptedFrames < 10) {
    issues.push("Use a longer clip with at least one complete repetition.");
  }
  if (poseCoverage < 0.75) {
    issues.push("Keep your full body visible throughout the recording.");
  }
  if (measurementCoverage < 0.75) {
    issues.push("Keep one shoulder, hip, knee, and ankle clearly visible.");
  }
  if (averageConfidence < 0.7) {
    issues.push("Use brighter, even lighting and a less cluttered background.");
  }
  if (sideConsistency < 0.85) {
    issues.push("Stay in a fixed side view without turning toward the camera.");
  }
  if (input.maximumVisibleLandmarks < 24) {
    issues.push("Move the camera back so your head and feet remain in frame.");
  }

  const hasCriticalIssue =
    input.attemptedFrames < 10 ||
    poseCoverage < 0.45 ||
    measurementCoverage < 0.5 ||
    averageConfidence < 0.55 ||
    sideConsistency < 0.65 ||
    input.maximumVisibleLandmarks < 18;
  const level: ScanQualityLevel = hasCriticalIssue
    ? "low"
    : score >= 85
      ? "high"
      : score >= 65
        ? "usable"
        : "low";

  return {
    level,
    score,
    allowCoaching: level !== "low",
    poseCoverage,
    measurementCoverage,
    sideConsistency,
    averageConfidence,
    issues,
  };
}

export function formatScanQualityLevel(level: ScanQualityLevel) {
  switch (level) {
    case "high":
      return "High";
    case "usable":
      return "Usable";
    case "low":
      return "Low";
  }
}
