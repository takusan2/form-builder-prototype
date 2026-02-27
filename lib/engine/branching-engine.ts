import type {
  Condition,
  ConditionGroup,
  BranchingRule,
  SurveyPage,
  Question,
  AnswerValue,
  ResponseData,
  DisplayCondition,
} from "@/lib/types/survey";

/**
 * 個々の条件を評価
 */
export function evaluateCondition(
  condition: Condition,
  answers: ResponseData
): boolean {
  const answer = answers[condition.questionId];

  switch (condition.operator) {
    case "is_answered":
      return answer !== undefined && answer !== null && answer !== "";
    case "is_not_answered":
      return answer === undefined || answer === null || answer === "";
    case "equals":
      if (Array.isArray(answer)) {
        return answer.includes(String(condition.value));
      }
      return String(answer) === String(condition.value);
    case "not_equals":
      if (Array.isArray(answer)) {
        return !answer.includes(String(condition.value));
      }
      return String(answer) !== String(condition.value);
    case "contains":
      if (Array.isArray(answer)) {
        if (Array.isArray(condition.value)) {
          return condition.value.some((v) => answer.includes(v));
        }
        return answer.includes(String(condition.value));
      }
      return String(answer).includes(String(condition.value));
    case "not_contains":
      if (Array.isArray(answer)) {
        if (Array.isArray(condition.value)) {
          return !condition.value.some((v) => answer.includes(v));
        }
        return !answer.includes(String(condition.value));
      }
      return !String(answer).includes(String(condition.value));
    case "greater_than":
      return Number(answer) > Number(condition.value);
    case "less_than":
      return Number(answer) < Number(condition.value);
    case "greater_equal":
      return Number(answer) >= Number(condition.value);
    case "less_equal":
      return Number(answer) <= Number(condition.value);
    default:
      return false;
  }
}

/**
 * 条件グループを再帰的に評価（AND/OR結合）
 */
export function evaluateConditionGroup(
  group: ConditionGroup,
  answers: ResponseData
): boolean {
  const conditionResults = group.conditions.map((c) =>
    evaluateCondition(c, answers)
  );

  const groupResults = (group.groups || []).map((g) =>
    evaluateConditionGroup(g, answers)
  );

  const allResults = [...conditionResults, ...groupResults];

  if (allResults.length === 0) return true;

  if (group.connector === "and") {
    return allResults.every(Boolean);
  } else {
    return allResults.some(Boolean);
  }
}

/**
 * ページの分岐ルールを評価して次のページIDを決定
 */
export function determineNextPage(
  currentPage: SurveyPage,
  pages: SurveyPage[],
  answers: ResponseData
): { type: "go_to_page"; pageId: string } | { type: "skip_to_end" } | { type: "disqualify" } | { type: "next" } {
  const rules = currentPage.branchingRules || [];
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (evaluateConditionGroup(rule.conditionGroup, answers)) {
      return rule.action;
    }
  }

  // Default: go to next page
  const currentIndex = pages.findIndex((p) => p.id === currentPage.id);
  if (currentIndex < pages.length - 1) {
    return { type: "next" };
  }
  return { type: "skip_to_end" };
}

/**
 * 設問の表示条件を評価し、表示すべき設問をフィルタ
 */
export function getVisibleQuestions(
  questions: Question[],
  answers: ResponseData
): Question[] {
  return questions.filter((q) => {
    if (!q.displayCondition) return true;
    return shouldShowQuestion(q.displayCondition, answers);
  });
}

function shouldShowQuestion(
  displayCondition: DisplayCondition,
  answers: ResponseData
): boolean {
  const result = evaluateConditionGroup(displayCondition.conditionGroup, answers);
  return displayCondition.behavior === "show" ? result : !result;
}
