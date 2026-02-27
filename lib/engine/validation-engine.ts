import type { Question, AnswerValue, ValidationRule } from "@/lib/types/survey";

export interface ValidationError {
  questionId: string;
  message: string;
}

export function validateQuestion(question: Question, answer: AnswerValue | undefined): string | null {
  const { validation } = question;

  // Required check
  if (question.required) {
    if (answer === undefined || answer === null || answer === "") {
      return "この設問は必須です";
    }
    if (Array.isArray(answer) && answer.length === 0) {
      return "この設問は必須です";
    }
    if (typeof answer === "object" && !Array.isArray(answer)) {
      const values = Object.values(answer);
      if (values.length === 0 || values.every((v) => v === "")) {
        return "この設問は必須です";
      }
    }
  }

  // If no answer and not required, skip further validation
  if (answer === undefined || answer === null || answer === "") return null;

  // Type-specific validation
  switch (question.type) {
    case "multiple_choice": {
      const selected = Array.isArray(answer) ? answer : [];
      if (validation?.minSelect && selected.length < validation.minSelect) {
        return `${validation.minSelect}つ以上選択してください`;
      }
      if (validation?.maxSelect && selected.length > validation.maxSelect) {
        return `${validation.maxSelect}つ以下で選択してください`;
      }
      break;
    }

    case "open_text": {
      const text = String(answer);
      if (validation?.minLength && text.length < validation.minLength) {
        return `${validation.minLength}文字以上入力してください`;
      }
      if (validation?.maxLength && text.length > validation.maxLength) {
        return `${validation.maxLength}文字以下で入力してください`;
      }
      if (validation?.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(text)) {
          return validation.patternMessage || "入力形式が正しくありません";
        }
      }
      break;
    }

    case "number_input": {
      const num = Number(answer);
      if (isNaN(num)) return "数値を入力してください";
      if (validation?.minValue !== undefined && num < validation.minValue) {
        return `${validation.minValue}以上の値を入力してください`;
      }
      if (validation?.maxValue !== undefined && num > validation.maxValue) {
        return `${validation.maxValue}以下の値を入力してください`;
      }
      break;
    }

    case "matrix_single":
    case "matrix_multiple": {
      if (question.required && question.matrixRows) {
        const matrixAnswers = answer as Record<string, string>;
        for (const row of question.matrixRows) {
          if (!matrixAnswers[row.id] || matrixAnswers[row.id] === "") {
            return `「${row.text}」に回答してください`;
          }
        }
      }
      break;
    }

    case "ranking": {
      if (question.required && question.choices) {
        const ranked = Array.isArray(answer) ? answer : [];
        if (ranked.length !== question.choices.length) {
          return "すべての項目を順位付けしてください";
        }
      }
      break;
    }
  }

  return null;
}

export function validatePage(
  questions: Question[],
  answers: Record<string, AnswerValue>
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const question of questions) {
    const error = validateQuestion(question, answers[question.id]);
    if (error) {
      errors.push({ questionId: question.id, message: error });
    }
  }
  return errors;
}
