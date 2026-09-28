import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type BodySide = "left" | "right";

export type SquatAngles = {
  side: BodySide;
  knee: number;
  hip: number;
  torsoLean: number;
  confidence: number;
};

export type CalfRaiseAngles = {
  side: BodySide;
  knee: number;
  ankle: number;
  confidence: number;
};

export type PressAngles = {
  side: BodySide;
  elbow: number;
  shoulder: number;
  wristOffset: number;
  torsoLean: number;
  confidence: number;
};

export type FlyAngles = {
  side: "bilateral";
  leftElbow: number;
  rightElbow: number;
  elbowAverage: number;
  wristSeparation: number;
  confidence: number;
};

export type HipMachineAngles = {
  side: "bilateral";
  kneeSeparation: number;
  leftKneeDistance: number;
  rightKneeDistance: number;
  kneeAsymmetry: number;
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

type PressLandmarkIndices = {
  shoulder: number;
  elbow: number;
  wrist: number;
  hip: number;
};

type CalfRaiseLandmarkIndices = {
  hip: number;
  knee: number;
  ankle: number;
  foot: number;
};

const SIDE_INDICES: Record<BodySide, SideLandmarkIndices> = {
  left: { shoulder: 11, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, hip: 24, knee: 26, ankle: 28 },
};

const PRESS_SIDE_INDICES: Record<BodySide, PressLandmarkIndices> = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24 },
};

const CALF_RAISE_SIDE_INDICES: Record<BodySide, CalfRaiseLandmarkIndices> = {
  left: { hip: 23, knee: 25, ankle: 27, foot: 31 },
  right: { hip: 24, knee: 26, ankle: 28, foot: 32 },
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

function pressSideConfidence(
  landmarks: NormalizedLandmark[],
  indices: PressLandmarkIndices,
) {
  const points = [
    landmarks[indices.shoulder],
    landmarks[indices.elbow],
    landmarks[indices.wrist],
    landmarks[indices.hip],
  ];

  if (points.some((point) => !point)) return 0;
  return Math.min(...points.map((point) => point.visibility ?? 0));
}

function flyConfidence(landmarks: NormalizedLandmark[]) {
  const points = [11, 12, 13, 14, 15, 16].map((index) => landmarks[index]);
  if (points.some((point) => !point)) return 0;
  return Math.min(...points.map((point) => point.visibility ?? 0));
}

function hipMachineConfidence(landmarks: NormalizedLandmark[]) {
  const points = [11, 12, 23, 24, 25, 26].map((index) => landmarks[index]);
  if (points.some((point) => !point)) return 0;
  return Math.min(...points.map((point) => point.visibility ?? 0));
}

function calfRaiseSideConfidence(
  landmarks: NormalizedLandmark[],
  indices: CalfRaiseLandmarkIndices,
) {
  const points = [
    landmarks[indices.hip],
    landmarks[indices.knee],
    landmarks[indices.ankle],
    landmarks[indices.foot],
  ];

  if (points.some((point) => !point)) return 0;
  return Math.min(...points.map((point) => point.visibility ?? 0));
}

function calculatePressSideAngles(
  landmarks: NormalizedLandmark[],
  side: BodySide,
  videoWidth: number,
  videoHeight: number,
): PressAngles | null {
  const indices = PRESS_SIDE_INDICES[side];
  const confidence = pressSideConfidence(landmarks, indices);
  const shoulder = toPixelPoint(landmarks[indices.shoulder], videoWidth, videoHeight);
  const elbow = toPixelPoint(landmarks[indices.elbow], videoWidth, videoHeight);
  const wrist = toPixelPoint(landmarks[indices.wrist], videoWidth, videoHeight);
  const hip = toPixelPoint(landmarks[indices.hip], videoWidth, videoHeight);
  const elbowAngle = calculateAngleDegrees(shoulder, elbow, wrist);
  const shoulderAngle = calculateAngleDegrees(hip, shoulder, elbow);
  const forearmLength = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);
  const torsoLean = calculateTorsoLeanDegrees(shoulder, hip);

  if (
    elbowAngle === null ||
    shoulderAngle === null ||
    torsoLean === null ||
    forearmLength === 0
  ) {
    return null;
  }

  return {
    side,
    elbow: elbowAngle,
    shoulder: shoulderAngle,
    wristOffset: (Math.abs(wrist.x - elbow.x) / forearmLength) * 100,
    torsoLean,
    confidence,
  };
}

function calculateSideAngles(
  landmarks: NormalizedLandmark[],
  side: BodySide,
  videoWidth: number,
  videoHeight: number,
): SquatAngles | null {
  const indices = SIDE_INDICES[side];
  const confidence = sideConfidence(landmarks, indices);
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

function calculateCalfRaiseSideAngles(
  landmarks: NormalizedLandmark[],
  side: BodySide,
  videoWidth: number,
  videoHeight: number,
): CalfRaiseAngles | null {
  const indices = CALF_RAISE_SIDE_INDICES[side];
  const confidence = calfRaiseSideConfidence(landmarks, indices);
  const hip = toPixelPoint(landmarks[indices.hip], videoWidth, videoHeight);
  const knee = toPixelPoint(landmarks[indices.knee], videoWidth, videoHeight);
  const ankle = toPixelPoint(landmarks[indices.ankle], videoWidth, videoHeight);
  const foot = toPixelPoint(landmarks[indices.foot], videoWidth, videoHeight);
  const kneeAngle = calculateAngleDegrees(hip, knee, ankle);
  const ankleAngle = calculateAngleDegrees(knee, ankle, foot);

  if (kneeAngle === null || ankleAngle === null) return null;

  return {
    side,
    knee: kneeAngle,
    ankle: ankleAngle,
    confidence,
  };
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

  return calculateSideAngles(landmarks, side, videoWidth, videoHeight);
}

export function calculateUnilateralAngles(
  landmarks: NormalizedLandmark[] | undefined,
  videoWidth: number,
  videoHeight: number,
  preferGroundedLeg = false,
  minimumVisibility = 0.5,
): SquatAngles | null {
  if (!landmarks || videoWidth <= 0 || videoHeight <= 0) return null;

  const candidates = (["left", "right"] as const)
    .map((side) => calculateSideAngles(landmarks, side, videoWidth, videoHeight))
    .filter(
      (angles): angles is SquatAngles =>
        angles !== null && angles.confidence >= minimumVisibility,
    );

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (preferGroundedLeg) {
    const leftAnkleY = landmarks[SIDE_INDICES.left.ankle]?.y;
    const rightAnkleY = landmarks[SIDE_INDICES.right.ankle]?.y;
    if (
      typeof leftAnkleY === "number" &&
      typeof rightAnkleY === "number" &&
      Math.abs(leftAnkleY - rightAnkleY) >= 0.03
    ) {
      const groundedSide: BodySide = leftAnkleY > rightAnkleY ? "left" : "right";
      return candidates.find((candidate) => candidate.side === groundedSide) ?? candidates[0];
    }
  }

  return [...candidates].sort((first, second) => {
    const kneeDifference = first.knee - second.knee;
    return Math.abs(kneeDifference) >= 3
      ? kneeDifference
      : second.confidence - first.confidence;
  })[0];
}

export function calculatePressAngles(
  landmarks: NormalizedLandmark[] | undefined,
  videoWidth: number,
  videoHeight: number,
  minimumVisibility = 0.5,
): PressAngles | null {
  if (!landmarks || videoWidth <= 0 || videoHeight <= 0) return null;

  const leftConfidence = pressSideConfidence(landmarks, PRESS_SIDE_INDICES.left);
  const rightConfidence = pressSideConfidence(landmarks, PRESS_SIDE_INDICES.right);
  const side: BodySide = leftConfidence >= rightConfidence ? "left" : "right";
  const confidence = Math.max(leftConfidence, rightConfidence);

  if (confidence < minimumVisibility) return null;

  return calculatePressSideAngles(landmarks, side, videoWidth, videoHeight);
}

export function calculateLateralRaiseAngles(
  landmarks: NormalizedLandmark[] | undefined,
  videoWidth: number,
  videoHeight: number,
  preferredSide: BodySide | null = null,
  minimumVisibility = 0.5,
): PressAngles | null {
  if (!landmarks || videoWidth <= 0 || videoHeight <= 0) return null;

  const candidates = (["left", "right"] as const)
    .map((side) =>
      calculatePressSideAngles(landmarks, side, videoWidth, videoHeight),
    )
    .filter(
      (angles): angles is PressAngles =>
        angles !== null && angles.confidence >= minimumVisibility,
    );

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const preferred = preferredSide
    ? candidates.find((candidate) => candidate.side === preferredSide)
    : null;
  const other = preferred
    ? candidates.find((candidate) => candidate.side !== preferred.side)
    : null;

  if (preferred && (!other || other.shoulder <= preferred.shoulder + 10)) {
    return preferred;
  }

  return [...candidates].sort((first, second) => {
    const shoulderDifference = second.shoulder - first.shoulder;
    return Math.abs(shoulderDifference) >= 5
      ? shoulderDifference
      : second.confidence - first.confidence;
  })[0];
}

export function calculateFlyAngles(
  landmarks: NormalizedLandmark[] | undefined,
  videoWidth: number,
  videoHeight: number,
  minimumVisibility = 0.5,
): FlyAngles | null {
  if (!landmarks || videoWidth <= 0 || videoHeight <= 0) return null;

  const confidence = flyConfidence(landmarks);
  if (confidence < minimumVisibility) return null;

  const leftShoulder = toPixelPoint(landmarks[11], videoWidth, videoHeight);
  const rightShoulder = toPixelPoint(landmarks[12], videoWidth, videoHeight);
  const leftElbow = toPixelPoint(landmarks[13], videoWidth, videoHeight);
  const rightElbow = toPixelPoint(landmarks[14], videoWidth, videoHeight);
  const leftWrist = toPixelPoint(landmarks[15], videoWidth, videoHeight);
  const rightWrist = toPixelPoint(landmarks[16], videoWidth, videoHeight);
  const leftElbowAngle = calculateAngleDegrees(
    leftShoulder,
    leftElbow,
    leftWrist,
  );
  const rightElbowAngle = calculateAngleDegrees(
    rightShoulder,
    rightElbow,
    rightWrist,
  );
  const shoulderSpan = Math.hypot(
    rightShoulder.x - leftShoulder.x,
    rightShoulder.y - leftShoulder.y,
  );
  const wristSpan = Math.hypot(
    rightWrist.x - leftWrist.x,
    rightWrist.y - leftWrist.y,
  );

  if (leftElbowAngle === null || rightElbowAngle === null || shoulderSpan === 0) {
    return null;
  }

  return {
    side: "bilateral",
    leftElbow: leftElbowAngle,
    rightElbow: rightElbowAngle,
    elbowAverage: (leftElbowAngle + rightElbowAngle) / 2,
    wristSeparation: (wristSpan / shoulderSpan) * 100,
    confidence,
  };
}

export function calculateHipMachineAngles(
  landmarks: NormalizedLandmark[] | undefined,
  videoWidth: number,
  videoHeight: number,
  minimumVisibility = 0.5,
): HipMachineAngles | null {
  if (!landmarks || videoWidth <= 0 || videoHeight <= 0) return null;

  const confidence = hipMachineConfidence(landmarks);
  if (confidence < minimumVisibility) return null;

  const leftHip = toPixelPoint(landmarks[23], videoWidth, videoHeight);
  const rightHip = toPixelPoint(landmarks[24], videoWidth, videoHeight);
  const leftKnee = toPixelPoint(landmarks[25], videoWidth, videoHeight);
  const rightKnee = toPixelPoint(landmarks[26], videoWidth, videoHeight);
  const hipSpan = Math.hypot(
    rightHip.x - leftHip.x,
    rightHip.y - leftHip.y,
  );
  if (hipSpan === 0) return null;

  const hipMidpointX = (leftHip.x + rightHip.x) / 2;
  const leftKneeDistance =
    (Math.abs(leftKnee.x - hipMidpointX) / hipSpan) * 100;
  const rightKneeDistance =
    (Math.abs(rightKnee.x - hipMidpointX) / hipSpan) * 100;

  return {
    side: "bilateral",
    kneeSeparation:
      (Math.abs(rightKnee.x - leftKnee.x) / hipSpan) * 100,
    leftKneeDistance,
    rightKneeDistance,
    kneeAsymmetry: Math.abs(leftKneeDistance - rightKneeDistance),
    confidence,
  };
}

export function calculateCalfRaiseAngles(
  landmarks: NormalizedLandmark[] | undefined,
  videoWidth: number,
  videoHeight: number,
  minimumVisibility = 0.5,
): CalfRaiseAngles | null {
  if (!landmarks || videoWidth <= 0 || videoHeight <= 0) return null;

  const leftConfidence = calfRaiseSideConfidence(
    landmarks,
    CALF_RAISE_SIDE_INDICES.left,
  );
  const rightConfidence = calfRaiseSideConfidence(
    landmarks,
    CALF_RAISE_SIDE_INDICES.right,
  );
  const side: BodySide = leftConfidence >= rightConfidence ? "left" : "right";
  const confidence = Math.max(leftConfidence, rightConfidence);

  if (confidence < minimumVisibility) return null;

  return calculateCalfRaiseSideAngles(
    landmarks,
    side,
    videoWidth,
    videoHeight,
  );
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

export function smoothPressAngles(
  previous: PressAngles | null,
  current: PressAngles,
  smoothingFactor = 0.25,
): PressAngles {
  const alpha = clamp(smoothingFactor, 0, 1);

  if (!previous || previous.side !== current.side) return current;

  return {
    side: current.side,
    elbow: previous.elbow + alpha * (current.elbow - previous.elbow),
    shoulder: previous.shoulder + alpha * (current.shoulder - previous.shoulder),
    wristOffset:
      previous.wristOffset + alpha * (current.wristOffset - previous.wristOffset),
    torsoLean:
      previous.torsoLean + alpha * (current.torsoLean - previous.torsoLean),
    confidence: current.confidence,
  };
}

export function smoothCalfRaiseAngles(
  previous: CalfRaiseAngles | null,
  current: CalfRaiseAngles,
  smoothingFactor = 0.25,
): CalfRaiseAngles {
  const alpha = clamp(smoothingFactor, 0, 1);

  if (!previous || previous.side !== current.side) return current;

  return {
    side: current.side,
    knee: previous.knee + alpha * (current.knee - previous.knee),
    ankle: previous.ankle + alpha * (current.ankle - previous.ankle),
    confidence: current.confidence,
  };
}

export function smoothFlyAngles(
  previous: FlyAngles | null,
  current: FlyAngles,
  smoothingFactor = 0.25,
): FlyAngles {
  const alpha = clamp(smoothingFactor, 0, 1);
  if (!previous) return current;

  return {
    side: "bilateral",
    leftElbow:
      previous.leftElbow + alpha * (current.leftElbow - previous.leftElbow),
    rightElbow:
      previous.rightElbow + alpha * (current.rightElbow - previous.rightElbow),
    elbowAverage:
      previous.elbowAverage + alpha * (current.elbowAverage - previous.elbowAverage),
    wristSeparation:
      previous.wristSeparation +
      alpha * (current.wristSeparation - previous.wristSeparation),
    confidence: current.confidence,
  };
}

export function smoothHipMachineAngles(
  previous: HipMachineAngles | null,
  current: HipMachineAngles,
  smoothingFactor = 0.25,
): HipMachineAngles {
  const alpha = clamp(smoothingFactor, 0, 1);
  if (!previous) return current;

  return {
    side: "bilateral",
    kneeSeparation:
      previous.kneeSeparation +
      alpha * (current.kneeSeparation - previous.kneeSeparation),
    leftKneeDistance:
      previous.leftKneeDistance +
      alpha * (current.leftKneeDistance - previous.leftKneeDistance),
    rightKneeDistance:
      previous.rightKneeDistance +
      alpha * (current.rightKneeDistance - previous.rightKneeDistance),
    kneeAsymmetry:
      previous.kneeAsymmetry +
      alpha * (current.kneeAsymmetry - previous.kneeAsymmetry),
    confidence: current.confidence,
  };
}
