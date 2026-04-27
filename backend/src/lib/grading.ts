export type GradingBand = {
  grade: string;
  minScore: number;
  maxScore: number;
  aggregate: number;
};

export type ReportDivision = "Division 1" | "Division 2" | "Division 3" | "Division 4" | "F9";

export const DEFAULT_GRADING_SCALE: GradingBand[] = [
  { grade: "D1", minScore: 90, maxScore: 100, aggregate: 1 },
  { grade: "D2", minScore: 80, maxScore: 89.99, aggregate: 2 },
  { grade: "C3", minScore: 75, maxScore: 79.99, aggregate: 3 },
  { grade: "C4", minScore: 70, maxScore: 74.99, aggregate: 4 },
  { grade: "C5", minScore: 65, maxScore: 69.99, aggregate: 5 },
  { grade: "C6", minScore: 60, maxScore: 64.99, aggregate: 6 },
  { grade: "P7", minScore: 50, maxScore: 59.99, aggregate: 7 },
  { grade: "P8", minScore: 40, maxScore: 49.99, aggregate: 8 },
  { grade: "F9", minScore: 0, maxScore: 39.99, aggregate: 9 },
];

export function parseGradingScale(raw: string | null | undefined): GradingBand[] {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_GRADING_SCALE;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_GRADING_SCALE;
    const rows: GradingBand[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") return DEFAULT_GRADING_SCALE;
      const obj = entry as Record<string, unknown>;
      const grade = typeof obj.grade === "string" ? obj.grade.trim().toUpperCase() : "";
      const minScore = Number(obj.minScore);
      const maxScore = Number(obj.maxScore);
      const aggregate = Number(obj.aggregate);
      if (!grade) return DEFAULT_GRADING_SCALE;
      if (!Number.isFinite(minScore) || !Number.isFinite(maxScore) || !Number.isFinite(aggregate)) {
        return DEFAULT_GRADING_SCALE;
      }
      if (minScore < 0 || maxScore > 100 || minScore > maxScore) return DEFAULT_GRADING_SCALE;
      if (aggregate < 1 || aggregate > 99) return DEFAULT_GRADING_SCALE;
      rows.push({
        grade,
        minScore: Number(minScore.toFixed(2)),
        maxScore: Number(maxScore.toFixed(2)),
        aggregate: Math.trunc(aggregate),
      });
    }
    if (rows.length === 0) return DEFAULT_GRADING_SCALE;
    return rows.sort((a, b) => b.minScore - a.minScore || a.aggregate - b.aggregate);
  } catch {
    return DEFAULT_GRADING_SCALE;
  }
}

export function gradeForScore(score: number, scale: GradingBand[]): GradingBand {
  const safe = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const hit = scale.find((band) => safe >= band.minScore && safe <= band.maxScore);
  if (hit) return hit;
  return scale[scale.length - 1] ?? DEFAULT_GRADING_SCALE[DEFAULT_GRADING_SCALE.length - 1];
}

export function expectedSubjectCountForClassName(className: string): number {
  const token = className.trim().toUpperCase();
  if (token.startsWith("KG")) return 5;
  if (/^P[1-3]\b/.test(token)) return 6;
  if (/^P[4-7]\b/.test(token)) return 4;
  return 4;
}

export function divisionForAggregate(
  totalAggregate: number,
  expectedSubjectCount: number,
): ReportDivision | null {
  if (!Number.isFinite(totalAggregate) || !Number.isFinite(expectedSubjectCount)) return null;
  const subjects = Math.max(1, Math.trunc(expectedSubjectCount));
  const agg = Math.max(0, Math.round(totalAggregate));
  if (agg < subjects) return null;
  if (agg <= subjects * 3) return "Division 1";
  if (agg <= subjects * 6) return "Division 2";
  if (agg <= subjects * 8) return "Division 3";
  if (agg <= subjects * 9) return "Division 4";
  return "F9";
}

export function passRateThresholdFromScale(scale: GradingBand[]): number {
  const passBand = [...scale]
    .filter((x) => x.aggregate <= 8)
    .sort((a, b) => a.minScore - b.minScore)[0];
  return passBand?.minScore ?? 50;
}
