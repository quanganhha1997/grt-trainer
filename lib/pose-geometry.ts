import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type BodySide = "left" | "right";

export type SquatAngles = {
  side: BodySide;
  knee: number;
  hip: number;
  torsoLean: number;
  confidence: number;
};

type PixelPoint = {
  x: number;
  y: number;
};

type SideLandmarkIndices = {
  shoulder: number;
  hip: number;
  knee: number;
  ankle: number;
};

const SIDE_INDICES: Record<BodySide, SideLandmarkIndices> = {
  left: { shoulder: 11, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, hip: 24, knee: 26, ankle: 28 },
};

function toPixelPoint(
  landmark: NormalizedLandmark,
  videoWidth: number,
  videoHeight: number,
): PixelPoint {
  return {
    x: landmark.x * videoWidth,
    y: landmark.y * videoHeight,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateAngleDegrees(
  first: PixelPoint,
  vertex: PixelPoint,
  third: PixelPoint,
) {
  const firstVector = {
    x: first.x - vertex.x,
    y: first.y - vertex.y,
  };
  const secondVector = {
    x: third.x - vertex.x,
    y: third.y - vertex.y,
  };
  const firstMagnitude = Math.hypot(firstVector.x, firstVector.y);
  const secondMagnitude = Math.hypot(secondVector.x, secondVector.y);

  if (firstMagnitude === 0 || secondMagnitude === 0) return null;

  const cosine = clamp(
    (firstVector.x * secondVector.x + firstVector.y * secondVector.y) /
      (firstMagnitude * secondMagnitude),
    -1,
    1,
  );

  return (Math.acos(cosine) * 180) / Math.PI;
}

function calculateTorsoLeanDegrees(shoulder: PixelPoint, hip: PixelPoint) {
  const horizontalDistance = shoulder.x - hip.x;
  const verticalDistance = shoulder.y - hip.y;
  const torsoLength = Math.hypot(horizontalDistance, verticalDistance);

  if (torsoLength === 0) return null;

  const verticalShare = clamp(Math.abs(verticalDistance) / torsoLength, 0, 1);
  return (Math.acos(verticalShare) * 180) / Math.PI;
}

function sideConfidence(
  landmarks: NormalizedLandmark[],
  indices: SideLandmarkIndices,
) {
  const points = [
    landmarks[indices.shoulder],
    landmarks[indices.hip],
    landmarks[indices.knee],
    landmarks[indices.ankle],
  ];

  if (points.some((point) => !point)) return 0;
  return Math.min(...points.map((point) => point.visibility ?? 0));
}

export function calculateSquatAngles(
  landmarks: NormalizedLandmark[] | undefined,
  videoWidth: number,
  videoHeight: number,
  minimumVisibility = 0.5,
): SquatAngles | null {
  if (!landmarks || videoWidth <= 0 || videoHeight <= 0) return null;

  const leftConfidence = sideConfidence(landmarks, SIDE_INDICES.left);
  const rightConfidence = sideConfidence(landmarks, SIDE_INDICES.right);
  const side: BodySide = leftConfidence >= rightConfidence ? "left" : "right";
  const confidence = Math.max(leftConfidence, rightConfidence);

  if (confidence < minimumVisibility) return null;

  const indices = SIDE_INDICES[side];
  const shoulder = toPixelPoint(
    landmarks[indices.shoulder],
    videoWidth,
    videoHeight,
  );
  const hip = toPixelPoint(landmarks[indices.hip], videoWidth, videoHeight);
  const knee = toPixelPoint(landmarks[indices.knee], videoWidth, videoHeight);
  const ankle = toPixelPoint(landmarks[indices.ankle], videoWidth, videoHeight);

  const kneeAngle = calculateAngleDegrees(hip, knee, ankle);
  const hipAngle = calculateAngleDegrees(shoulder, hip, knee);
  const torsoLean = calculateTorsoLeanDegrees(shoulder, hip);

  if (kneeAngle === null || hipAngle === null || torsoLean === null) return null;

  return {
    side,
    knee: kneeAngle,
    hip: hipAngle,
    torsoLean,
    confidence,
  };
}

export function smoothSquatAngles(
  previous: SquatAngles | null,
  current: SquatAngles,
  smoothingFactor = 0.25,
): SquatAngles {
  const alpha = clamp(smoothingFactor, 0, 1);

  if (!previous || previous.side !== current.side) return current;

  return {
    side: current.side,
    knee: previous.knee + alpha * (current.knee - previous.knee),
    hip: previous.hip + alpha * (current.hip - previous.hip),
    torsoLean:
      previous.torsoLean + alpha * (current.torsoLean - previous.torsoLean),
    confidence: current.confidence,
  };
}
