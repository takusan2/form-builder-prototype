import type { Quota, QuotaCondition, ResponseData } from "@/lib/types/survey";

/**
 * 個々のクオータ条件を評価
 */
function evaluateCondition(condition: QuotaCondition, answers: ResponseData): boolean {
  const answer = answers[condition.questionId];
  if (answer === undefined || answer === null) return false;

  if (condition.conditionType === "numeric") {
    const numAnswer = Number(answer);
    if (isNaN(numAnswer)) return false;
    const target = condition.value ?? 0;

    switch (condition.operator) {
      case "equals":        return numAnswer === target;
      case "not_equals":    return numAnswer !== target;
      case "greater_than":  return numAnswer > target;
      case "less_than":     return numAnswer < target;
      case "greater_equal": return numAnswer >= target;
      case "less_equal":    return numAnswer <= target;
      default: return false;
    }
  }

  // choice 型（デフォルト・後方互換）
  const selectedValues = condition.selectedValues || [];
  if (selectedValues.length === 0) return false;

  if (Array.isArray(answer)) {
    return selectedValues.some((v) => answer.includes(v));
  }
  return selectedValues.includes(String(answer));
}

/**
 * 回答データが特定のクオータ条件にマッチするか判定
 */
export function matchesQuota(quota: Quota, answers: ResponseData): boolean {
  if (!quota.enabled) return false;
  return quota.conditions.every((cond) => evaluateCondition(cond, answers));
}

/**
 * 該当するクオータのうち上限に達しているものを返す
 */
export function findExceededQuotas(
  quotas: Quota[],
  answers: ResponseData,
  counters: Map<string, number>
): Quota[] {
  return quotas.filter((quota) => {
    if (!quota.enabled) return false;
    if (!matchesQuota(quota, answers)) return false;
    const currentCount = counters.get(quota.id) ?? 0;
    return currentCount >= quota.limit;
  });
}

/**
 * 回答データにマッチする有効なクオータIDのリストを返す
 */
export function getMatchingQuotaIds(
  quotas: Quota[],
  answers: ResponseData
): string[] {
  return quotas
    .filter((quota) => quota.enabled && matchesQuota(quota, answers))
    .map((q) => q.id);
}
