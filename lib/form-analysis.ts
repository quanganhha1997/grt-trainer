import type { BodySide } from "./pose-geometry";

export type FormCoachingSignal = {
  area: string;
  status: "good" | "adjust";
  message: string;
  timestampSeconds: number;
};

export type FormRepAnalysis = {
  repetition: number;
  score: number;
  rating: "Strong" | "Good" | "Needs attention";
  minimumKneeAngle: number;
  maximumKneeAngle?: number;
  minimumHipAngle: number;
  maximumHipAngle?: number;
  hipAngleRange?: number;
  maximumTorsoLean: number;
  minimumElbowAngle?: number;
  maximumElbowAngle?: number;
  minimumShoulderAngle?: number;
  shoulderAngleRange?: number;
  minimumAnkleAngle?: number;
  maximumAnkleAngle?: number;
  ankleAngleRange?: number;
  wristOffsetAtBottom?: number;
  minimumWristSeparation?: number;
  maximumWristSeparation?: number;
  wristSeparationRange?: number;
  torsoLeanRange?: number;
  bodyPositionRange?: number;
  minimumKneeSeparation?: number;
  maximumKneeSeparation?: number;
  kneeSeparationRange?: number;
  maximumKneeAsymmetry?: number;
  durationSeconds: number;
  sampleCount: number;
  startedAtSeconds: number;
  completedAtSeconds: number;
  reviewAtSeconds: number;
  signals: FormCoachingSignal[];
};

export type LowerBodyAngleSummary = {
  kind: "lower-body";
  side: BodySide;
  sampleCount: number;
  minimumKnee: number;
  minimumHip: number;
  maximumTorsoLean: number;
};

export type PressAngleSummary = {
  kind: "press";
  side: BodySide;
  sampleCount: number;
  minimumElbow: number;
  minimumShoulder: number;
  wristOffsetAtBottom: number;
  minimumTorsoLean: number;
  maximumTorsoLean: number;
  torsoLeanRange: number;
};

export type RowAngleSummary = {
  kind: "row";
  side: BodySide;
  sampleCount: number;
  minimumElbow: number;
  minimumShoulder: number;
  minimumTorsoLean: number;
  maximumTorsoLean: number;
  torsoLeanRange: number;
};

export type VerticalPullAngleSummary = {
  kind: "vertical-pull";
  side: BodySide;
  sampleCount: number;
  minimumElbow: number;
  minimumShoulder: number;
  minimumTorsoLean: number;
  maximumTorsoLean: number;
  torsoLeanRange: number;
};

export type KneeIsolationAngleSummary = {
  kind: "knee-isolation";
  side: BodySide;
  sampleCount: number;
  minimumKnee: number;
  maximumKnee: number;
  minimumHip: number;
  maximumHip: number;
  hipAngleRange: number;
};

export type ArmIsolationAngleSummary = {
  kind: "arm-isolation";
  side: BodySide;
  sampleCount: number;
  minimumElbow: number;
  maximumElbow: number;
  minimumShoulder: number;
  maximumShoulder: number;
  shoulderAngleRange: number;
};

export type CoreFlexionAngleSummary = {
  kind: "core-flexion";
  side: BodySide;
  sampleCount: number;
  minimumHip: number;
  maximumHip: number;
  hipAngleRange: number;
  minimumKnee: number;
  maximumKnee: number;
  minimumTorsoLean: number;
  maximumTorsoLean: number;
  torsoLeanRange: number;
};

export type CalfIsolationAngleSummary = {
  kind: "calf-isolation";
  side: BodySide;
  sampleCount: number;
  minimumAnkle: number;
  maximumAnkle: number;
  ankleAngleRange: number;
  minimumKnee: number;
  maximumKnee: number;
  kneeAngleRange: number;
};

export type ShoulderIsolationAngleSummary = {
  kind: "shoulder-isolation";
  side: BodySide;
  sampleCount: number;
  minimumShoulder: number;
  maximumShoulder: number;
  shoulderAngleRange: number;
  minimumElbow: number;
  maximumElbow: number;
  elbowAngleRange: number;
};

export type StraightArmPullAngleSummary = {
  kind: "straight-arm-pull";
  side: BodySide;
  sampleCount: number;
  minimumShoulder: number;
  maximumShoulder: number;
  shoulderAngleRange: number;
  minimumElbow: number;
  maximumElbow: number;
  elbowAngleRange: number;
};

export type ChestIsolationAngleSummary = {
  kind: "chest-isolation";
  side: "bilateral";
  sampleCount: number;
  minimumWristSeparation: number;
  maximumWristSeparation: number;
  wristSeparationRange: number;
  minimumElbow: number;
  maximumElbow: number;
  elbowAngleRange: number;
};

export type RearShoulderIsolationAngleSummary = {
  kind: "rear-shoulder-isolation";
  side: "bilateral";
  sampleCount: number;
  minimumWristSeparation: number;
  maximumWristSeparation: number;
  wristSeparationRange: number;
  minimumElbow: number;
  maximumElbow: number;
  elbowAngleRange: number;
};

export type HipMachineAngleSummary = {
  kind: "hip-machine";
  side: "bilateral";
  sampleCount: number;
  minimumKneeSeparation: number;
  maximumKneeSeparation: number;
  kneeSeparationRange: number;
  maximumKneeAsymmetry: number;
};

export type FormAngleSummary =
  | LowerBodyAngleSummary
  | PressAngleSummary
  | RowAngleSummary
  | VerticalPullAngleSummary
  | KneeIsolationAngleSummary
  | ArmIsolationAngleSummary
  | CoreFlexionAngleSummary
  | CalfIsolationAngleSummary
  | ShoulderIsolationAngleSummary
  | StraightArmPullAngleSummary
  | ChestIsolationAngleSummary
  | RearShoulderIsolationAngleSummary
  | HipMachineAngleSummary;
