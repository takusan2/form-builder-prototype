import type { Question, Choice, MatrixRow, ResponseData } from "@/lib/types/survey";

/**
 * 参照元設問の回答から選択された値のリストを取得
 */
function getSelectedValues(
  sourceQuestion: Question,
  answers: ResponseData
): string[] {
  const answer = answers[sourceQuestion.id];
  if (!answer) return [];

  // multiple_choice: 配列 or カンマ区切り文字列
  if (Array.isArray(answer)) return answer.map(String);
  if (typeof answer === "string") {
    // single_choice は単一値
    if (
      sourceQuestion.type === "single_choice" ||
      sourceQuestion.type === "multiple_choice"
    ) {
      return answer.split(",").filter(Boolean);
    }
    return [answer];
  }

  return [];
}

/**
 * キャリーフォワードを適用して選択肢をフィルタ
 * - single_choice / multiple_choice → choices をフィルタ
 * - matrix_single / matrix_multiple → matrixRows をフィルタ（参照元の選択肢がそのまま行になる）
 */
export function resolveCarryForward(
  question: Question,
  allQuestions: Question[],
  answers: ResponseData
): Question {
  const cf = question.carryForward;
  if (!cf) return question;

  const sourceQuestion = allQuestions.find((q) => q.id === cf.questionId);
  if (!sourceQuestion) return question;

  const selectedValues = getSelectedValues(sourceQuestion, answers);
  const sourceChoices = sourceQuestion.choices || [];

  // フィルタ: selected=選択されたもの, not_selected=選択されなかったもの
  const filteredChoices =
    cf.mode === "selected"
      ? sourceChoices.filter((c) => selectedValues.includes(c.value))
      : sourceChoices.filter((c) => !selectedValues.includes(c.value));

  // マトリクス設問の場合: 選択肢→行に変換
  if (
    question.type === "matrix_single" ||
    question.type === "matrix_multiple"
  ) {
    const matrixRows: MatrixRow[] = filteredChoices.map((c) => ({
      id: c.value, // 行IDに選択肢のvalueを使う（回答データとの整合性）
      text: c.text,
    }));
    return {
      ...question,
      matrixRows,
      // matrixColumns は設問自身に定義されたものをそのまま使う
    };
  }

  // 選択肢設問の場合: そのままフィルタした選択肢を使う
  if (
    question.type === "single_choice" ||
    question.type === "multiple_choice"
  ) {
    return {
      ...question,
      choices: filteredChoices,
    };
  }

  return question;
}
