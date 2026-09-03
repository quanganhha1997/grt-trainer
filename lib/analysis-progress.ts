import type { AnalysisHistoryRecord } from "@/lib/analysis-history";

export type ProgressChartPoint = {
  id: string;
  score: number;
  x: number;
  y: number;
};

export type AnalysisProgressSummary = {
  checkCount: number;
  totalRepetitions: number;
  averageScore: number;
  bestScore: number;
  scoreChange: number | null;
  recurringFocus: string | null;
  chartPoints: ProgressChartPoint[];
};

const CHART_LEFT = 4;
const CHART_RIGHT = 96;
const CHART_TOP = 4;
const CHART_BOTTOM = 36;

export function calculateAnalysisProgress(
  history: AnalysisHistoryRecord[],
): AnalysisProgressSummary | null {
  if (history.length === 0) return null;

  const chronological = [...history].reverse();
  const scoreTotal = history.reduce(
    (total, record) => total + record.averageScore,
    0,
  );
  const focusCounts = history.reduce<Record<string, number>>(
    (counts, record) => {
      if (record.primaryFocus) {
        counts[record.primaryFocus] = (counts[record.primaryFocus] ?? 0) + 1;
      }
      return counts;
    },
    {},
  );
  const recurringFocus =
    Object.entries(focusCounts).sort(
      ([firstFocus, firstCount], [secondFocus, secondCount]) =>
        secondCount - firstCount || firstFocus.localeCompare(secondFocus),
    )[0]?.[0] ?? null;
  const chartPoints = chronological.map((record, index) => {
    const progress =
      chronological.length === 1 ? 0.5 : index / (chronological.length - 1);

    return {
      id: record.id,
      score: record.averageScore,
      x: CHART_LEFT + progress * (CHART_RIGHT - CHART_LEFT),
      y:
        CHART_TOP +
        ((100 - record.averageScore) / 100) * (CHART_BOTTOM - CHART_TOP),
    };
  });

  return {
    checkCount: history.length,
    totalRepetitions: history.reduce(
      (total, record) => total + record.repetitions,
      0,
    ),
    averageScore: Math.round(scoreTotal / history.length),
    bestScore: Math.max(...history.map((record) => record.averageScore)),
    scoreChange:
      history.length > 1
        ? history[0].averageScore - history[history.length - 1].averageScore
        : null,
    recurringFocus,
    chartPoints,
  };
}
