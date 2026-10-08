export type GradingType = "fraction" | "whole_number" | null;
export type GradingUnit = "percentage" | "unitless" | null;

/** Formats a stored grade according to the instructor's chosen scheme for that assignment. */
export function formatGrade(
  grade: number | null,
  gradingType: GradingType,
  gradingUnit: GradingUnit,
  maxScore: number | null
): string | null {
  if (grade === null || grade === undefined) return null;
  if (gradingType === "fraction" && maxScore) return `${grade}/${maxScore}`;
  if (gradingType === "whole_number" && gradingUnit === "percentage") return `${grade}%`;
  return `${grade}`;
}
