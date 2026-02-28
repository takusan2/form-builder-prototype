// =============================================
// 設問タイプ
// =============================================

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "matrix_single"
  | "matrix_multiple"
  | "rating_scale"
  | "open_text"
  | "ranking"
  | "number_input";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "単一選択",
  multiple_choice: "複数選択",
  matrix_single: "マトリクス（単一）",
  matrix_multiple: "マトリクス（複数）",
  rating_scale: "評価スケール",
  open_text: "自由記述",
  ranking: "ランキング",
  number_input: "数値入力",
};

// =============================================
// 選択肢・行列
// =============================================

export interface Choice {
  id: string;
  text: string;
  value: string; // 送信時の値
  isExclusive?: boolean; // 排他選択肢（「上記のいずれでもない」等）
}

export interface MatrixRow {
  id: string;
  text: string;
}

export interface MatrixColumn {
  id: string;
  text: string;
  value: string;
  isExclusive?: boolean; // 排他列（「当てはまるものはない」等）
}

// =============================================
// バリデーション
// =============================================

export interface ValidationRule {
  required?: boolean;
  minSelect?: number; // 複数選択の最小
  maxSelect?: number; // 複数選択の最大
  minLength?: number; // テキスト最小文字数
  maxLength?: number; // テキスト最大文字数
  minValue?: number; // 数値最小
  maxValue?: number; // 数値最大
  pattern?: string; // 正規表現パターン
  patternMessage?: string; // パターン不一致時メッセージ
}

// =============================================
// 設問
// =============================================

export interface CarryForward {
  /** 参照元の設問ID */
  questionId: string;
  /** "selected"=選択されたもの, "not_selected"=選択されなかったもの */
  mode: "selected" | "not_selected";
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  description?: string;
  required: boolean;
  choices?: Choice[];
  matrixRows?: MatrixRow[];
  matrixColumns?: MatrixColumn[];
  ratingMin?: number;
  ratingMax?: number;
  ratingMinLabel?: string;
  ratingMaxLabel?: string;
  validation?: ValidationRule;
  displayCondition?: DisplayCondition;
  randomizeChoices?: boolean;
  /** 選択肢引き継ぎ（キャリーフォワード） */
  carryForward?: CarryForward;
}

// =============================================
// ページ
// =============================================

export interface SurveyPage {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  branchingRules?: BranchingRule[];
}

// =============================================
// 条件分岐
// =============================================

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "greater_equal"
  | "less_equal"
  | "is_answered"
  | "is_not_answered";

export interface Condition {
  id: string;
  questionId: string;
  operator: ConditionOperator;
  value: string | string[] | number;
}

export interface ConditionGroup {
  id: string;
  connector: "and" | "or";
  conditions: Condition[];
  groups?: ConditionGroup[]; // ネスト可能
}

export type BranchingAction =
  | { type: "go_to_page"; pageId: string }
  | { type: "skip_to_end" }
  | { type: "disqualify" };

export interface BranchingRule {
  id: string;
  conditionGroup: ConditionGroup;
  action: BranchingAction;
  priority: number;
}

export interface DisplayCondition {
  conditionGroup: ConditionGroup;
  behavior: "show" | "hide";
}

// =============================================
// クオータ
// =============================================

export type QuotaConditionType = "choice" | "numeric";

export type NumericOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_equal"
  | "less_equal";

export const NUMERIC_OPERATOR_LABELS: Record<NumericOperator, string> = {
  equals: "=",
  not_equals: "≠",
  greater_than: ">",
  less_than: "<",
  greater_equal: "≥",
  less_equal: "≤",
};

export interface QuotaCondition {
  questionId: string;
  conditionType: QuotaConditionType; // "choice" | "numeric"
  // choice用
  selectedValues?: string[];
  // numeric用
  operator?: NumericOperator;
  value?: number;
}

export type QuotaAction = "close" | "disqualify";

export interface Quota {
  id: string;
  name: string;
  conditions: QuotaCondition[];
  limit: number;
  currentCount: number;
  action: QuotaAction;
  enabled: boolean;
}

// =============================================
// 計算変数（外部ロジック）
// =============================================

export interface ComputedVariableInput {
  /** 参照する設問ID */
  questionId: string;
  /** 外部APIに送るパラメータ名 */
  paramName: string;
}

export interface ComputedVariableOutput {
  /** APIレスポンスから取り出すキー */
  responseKey: string;
  /** 内部で使う変数ID（分岐・クオータの条件で参照） */
  variableId: string;
  /** 表示ラベル */
  label: string;
}

export interface ComputedVariable {
  id: string;
  /** 表示名 */
  name: string;
  /** 呼び出すエンドポイントURL */
  endpoint: string;
  /** いつ呼び出すか */
  trigger: {
    type: "on_page_leave";
    pageId: string;
  };
  /** 送信する回答データのマッピング */
  inputMapping: ComputedVariableInput[];
  /** レスポンスから取り出す変数のマッピング */
  outputMapping: ComputedVariableOutput[];
  /** API障害時のフォールバック値 (variableId -> value) */
  fallbackValues?: Record<string, string>;
  /** タイムアウト(ms) デフォルト5000 */
  timeout?: number;
  enabled: boolean;
}

// =============================================
// サーベイ構造
// =============================================

export interface SurveyStructure {
  pages: SurveyPage[];
}

export type SurveyStatus = "draft" | "published" | "closed";

export interface RedirectSettings {
  /** 回答完了後のリダイレクトURL */
  completionUrl?: string;
  /** 対象外(disqualify)時のリダイレクトURL */
  disqualifyUrl?: string;
  /** クオータ上限到達時のリダイレクトURL */
  quotaFullUrl?: string;
  /** リダイレクトURLにURLパラメータを引き継ぐか */
  passParams?: boolean;
}

export interface RespondentSettings {
  /** 必須URLパラメータ名リスト（これがないとアンケートにアクセス不可） */
  requiredParams?: string[];
  /** 回答者識別に使うURLパラメータ名（respondentUidとして保存） */
  identifierParam?: string;
  /** 同一識別子での重複回答を防止するか */
  preventDuplicate?: boolean;
}

export interface SurveySettings {
  showProgressBar?: boolean;
  allowBack?: boolean;
  randomizePages?: boolean;
  completionMessage?: string;
  disqualifyMessage?: string;
  redirect?: RedirectSettings;
  respondent?: RespondentSettings;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  status: SurveyStatus;
  settings: SurveySettings;
  structure: SurveyStructure;
  quotas: Quota[];
  computedVariables: ComputedVariable[];
  createdAt: string;
  updatedAt: string;
}

// =============================================
// 回答データ
// =============================================

export type AnswerValue = string | string[] | number | Record<string, string>;

export interface ResponseData {
  [questionId: string]: AnswerValue;
}

// =============================================
// Webhook
// =============================================

export interface WebhookConfig {
  id: string;
  surveyId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  secret: string;
  enabled: boolean;
  retryCount: number;
  retryInterval: number;
}

export interface WebhookPayload {
  event: "response.completed" | "response.disqualified";
  surveyId: string;
  respondent: {
    uid?: string;
    params: Record<string, string>; // URLクエリパラメータを全て格納
  };
  data: ResponseData;
  metadata: {
    completedAt: string;
    duration: number; // seconds
    pageHistory: string[];
  };
}
