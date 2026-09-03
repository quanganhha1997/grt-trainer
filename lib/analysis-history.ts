import type { ScanQualityLevel } from "@/lib/scan-quality";

export const ANALYSIS_HISTORY_KEY = "ai-personal-trainer.analysis-history.v1";
export const MAX_ANALYSIS_HISTORY_ITEMS = 8;

export type AnalysisHistoryRecord = {
  id: string;
  createdAt: string;
  exercise: "Bodyweight squat";
  repetitions: number;
  averageScore: number;
  captureQuality: ScanQualityLevel;
  captureQualityScore: number;
  primaryFocus: string | null;
  coachingCue: string;
  minimumKneeAngle: number | null;
  maximumTorsoLean: number | null;
};

type CreateAnalysisHistoryRecordInput = Omit<
  AnalysisHistoryRecord,
  "id" | "createdAt" | "exercise"
> & {
  id?: string;
  createdAt?: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isHistoryRecord(value: unknown): value is AnalysisHistoryRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<AnalysisHistoryRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    record.exercise === "Bodyweight squat" &&
    isFiniteNumber(record.repetitions) &&
    record.repetitions >= 0 &&
    isFiniteNumber(record.averageScore) &&
    record.averageScore >= 0 &&
    record.averageScore <= 100 &&
    (record.captureQuality === "high" ||
      record.captureQuality === "usable" ||
      record.captureQuality === "low") &&
    isFiniteNumber(record.captureQualityScore) &&
    record.captureQualityScore >= 0 &&
    record.captureQualityScore <= 100 &&
    (record.primaryFocus === null || typeof record.primaryFocus === "string") &&
    typeof record.coachingCue === "string" &&
    (record.minimumKneeAngle === null ||
      isFiniteNumber(record.minimumKneeAngle)) &&
    (record.maximumTorsoLean === null ||
      isFiniteNumber(record.maximumTorsoLean))
  );
}

export function createAnalysisHistoryRecord(
  input: CreateAnalysisHistoryRecordInput,
): AnalysisHistoryRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const id =
    input.id ??
    `squat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    createdAt,
    exercise: "Bodyweight squat",
    repetitions: input.repetitions,
    averageScore: input.averageScore,
    captureQuality: input.captureQuality,
    captureQualityScore: input.captureQualityScore,
    primaryFocus: input.primaryFocus,
    coachingCue: input.coachingCue,
    minimumKneeAngle: input.minimumKneeAngle,
    maximumTorsoLean: input.maximumTorsoLean,
  };
}

export function prependAnalysisHistory(
  history: AnalysisHistoryRecord[],
  record: AnalysisHistoryRecord,
) {
  return [record, ...history.filter((item) => item.id !== record.id)].slice(
    0,
    MAX_ANALYSIS_HISTORY_ITEMS,
  );
}

export function parseAnalysisHistory(value: string | null) {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isHistoryRecord).slice(0, MAX_ANALYSIS_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

export function getScoreChange(
  history: AnalysisHistoryRecord[],
  recordIndex: number,
) {
  const current = history[recordIndex];
  const previous = history[recordIndex + 1];
  if (!current || !previous) return null;
  return current.averageScore - previous.averageScore;
}
