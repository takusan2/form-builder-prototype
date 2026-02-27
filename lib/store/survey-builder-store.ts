import { create } from "zustand";
import { produce } from "immer";
import type {
  Survey,
  SurveyPage,
  Question,
  Choice,
  QuestionType,
  BranchingRule,
} from "@/lib/types/survey";
import { nanoid } from "nanoid";

interface HistoryEntry {
  structure: Survey["structure"];
}

interface SurveyBuilderState {
  survey: Survey | null;
  activePageId: string | null;
  activeQuestionId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isStructureLocked: boolean;

  // Undo/Redo
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setSurvey: (survey: Survey, responseCount?: number) => void;
  setActivePageId: (pageId: string | null) => void;
  setActiveQuestionId: (questionId: string | null) => void;

  // Page operations
  addPage: () => void;
  removePage: (pageId: string) => void;
  updatePage: (pageId: string, updates: Partial<SurveyPage>) => void;
  movePage: (fromIndex: number, toIndex: number) => void;

  // Question operations
  addQuestion: (pageId: string, type: QuestionType) => void;
  removeQuestion: (pageId: string, questionId: string) => void;
  updateQuestion: (pageId: string, questionId: string, updates: Partial<Question>) => void;
  moveQuestion: (
    fromPageId: string,
    toPageId: string,
    fromIndex: number,
    toIndex: number
  ) => void;

  // Choice operations
  addChoice: (pageId: string, questionId: string) => void;
  removeChoice: (pageId: string, questionId: string, choiceId: string) => void;
  updateChoice: (
    pageId: string,
    questionId: string,
    choiceId: string,
    updates: Partial<Choice>
  ) => void;
  moveChoice: (pageId: string, questionId: string, fromIndex: number, toIndex: number) => void;

  // Branching
  addBranchingRule: (pageId: string, rule: BranchingRule) => void;
  removeBranchingRule: (pageId: string, ruleId: string) => void;
  updateBranchingRule: (pageId: string, ruleId: string, updates: Partial<BranchingRule>) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Persistence
  markClean: () => void;
  saveSurvey: () => Promise<void>;
}

function pushHistory(state: SurveyBuilderState): Partial<SurveyBuilderState> {
  if (!state.survey) return {};
  const entry: HistoryEntry = {
    structure: JSON.parse(JSON.stringify(state.survey.structure)),
  };
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(entry);
  // Keep max 50 history entries
  if (newHistory.length > 50) newHistory.shift();
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
    isDirty: true,
  };
}

export const useSurveyBuilderStore = create<SurveyBuilderState>((set, get) => ({
  survey: null,
  activePageId: null,
  activeQuestionId: null,
  isDirty: false,
  isSaving: false,
  isStructureLocked: false,
  history: [],
  historyIndex: -1,

  setSurvey: (survey, responseCount) => {
    const entry: HistoryEntry = {
      structure: JSON.parse(JSON.stringify(survey.structure)),
    };
    set({
      survey,
      activePageId: survey.structure.pages[0]?.id ?? null,
      activeQuestionId: null,
      isDirty: false,
      isStructureLocked: (responseCount ?? 0) > 0,
      history: [entry],
      historyIndex: 0,
    });
  },

  setActivePageId: (pageId) => set({ activePageId: pageId, activeQuestionId: null }),
  setActiveQuestionId: (questionId) => set({ activeQuestionId: questionId }),

  // Page operations
  addPage: () =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        const newPage: SurveyPage = {
          id: nanoid(8),
          title: `ページ ${state.survey.structure.pages.length + 1}`,
          questions: [],
          branchingRules: [],
        };
        state.survey.structure.pages.push(newPage);
        state.activePageId = newPage.id;
      })
    ),

  removePage: (pageId) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        if (state.survey.structure.pages.length <= 1) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        const idx = state.survey.structure.pages.findIndex((p) => p.id === pageId);
        if (idx === -1) return;
        state.survey.structure.pages.splice(idx, 1);
        if (state.activePageId === pageId) {
          state.activePageId = state.survey.structure.pages[Math.max(0, idx - 1)]?.id ?? null;
        }
      })
    ),

  updatePage: (pageId, updates) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        Object.assign(page, updates);
      })
    ),

  movePage: (fromIndex, toIndex) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        const pages = state.survey.structure.pages;
        const [moved] = pages.splice(fromIndex, 1);
        pages.splice(toIndex, 0, moved);
      })
    ),

  // Question operations
  addQuestion: (pageId, type) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        const newQuestion: Question = {
          id: nanoid(8),
          type,
          text: "",
          required: true,
          ...(type === "single_choice" || type === "multiple_choice"
            ? {
                choices: [
                  { id: nanoid(8), text: "選択肢 1", value: "1" },
                  { id: nanoid(8), text: "選択肢 2", value: "2" },
                ],
              }
            : {}),
          ...(type === "rating_scale"
            ? { ratingMin: 1, ratingMax: 5, ratingMinLabel: "", ratingMaxLabel: "" }
            : {}),
          ...(type === "matrix_single" || type === "matrix_multiple"
            ? {
                matrixRows: [
                  { id: nanoid(8), text: "行 1" },
                  { id: nanoid(8), text: "行 2" },
                ],
                matrixColumns: [
                  { id: nanoid(8), text: "列 1", value: "1" },
                  { id: nanoid(8), text: "列 2", value: "2" },
                ],
              }
            : {}),
          ...(type === "number_input"
            ? { validation: { required: true, minValue: 0, maxValue: 100 } }
            : {}),
        };
        page.questions.push(newQuestion);
        state.activeQuestionId = newQuestion.id;
      })
    ),

  removeQuestion: (pageId, questionId) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        const idx = page.questions.findIndex((q) => q.id === questionId);
        if (idx !== -1) page.questions.splice(idx, 1);
        if (state.activeQuestionId === questionId) {
          state.activeQuestionId = null;
        }
      })
    ),

  updateQuestion: (pageId, questionId, updates) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page) return;
        const question = page.questions.find((q) => q.id === questionId);
        if (!question) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        Object.assign(question, updates);
      })
    ),

  moveQuestion: (fromPageId, toPageId, fromIndex, toIndex) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const fromPage = state.survey.structure.pages.find((p) => p.id === fromPageId);
        const toPage = state.survey.structure.pages.find((p) => p.id === toPageId);
        if (!fromPage || !toPage) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        const [moved] = fromPage.questions.splice(fromIndex, 1);
        toPage.questions.splice(toIndex, 0, moved);
      })
    ),

  // Choice operations
  addChoice: (pageId, questionId) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page) return;
        const question = page.questions.find((q) => q.id === questionId);
        if (!question || !question.choices) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        const num = question.choices.length + 1;
        question.choices.push({
          id: nanoid(8),
          text: `選択肢 ${num}`,
          value: String(num),
        });
      })
    ),

  removeChoice: (pageId, questionId, choiceId) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page) return;
        const question = page.questions.find((q) => q.id === questionId);
        if (!question || !question.choices) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        const idx = question.choices.findIndex((c) => c.id === choiceId);
        if (idx !== -1) question.choices.splice(idx, 1);
      })
    ),

  updateChoice: (pageId, questionId, choiceId, updates) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page) return;
        const question = page.questions.find((q) => q.id === questionId);
        if (!question || !question.choices) return;
        const choice = question.choices.find((c) => c.id === choiceId);
        if (!choice) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        Object.assign(choice, updates);
      })
    ),

  moveChoice: (pageId, questionId, fromIndex, toIndex) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page) return;
        const question = page.questions.find((q) => q.id === questionId);
        if (!question || !question.choices) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        const [moved] = question.choices.splice(fromIndex, 1);
        question.choices.splice(toIndex, 0, moved);
      })
    ),

  // Branching rules
  addBranchingRule: (pageId, rule) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        if (!page.branchingRules) page.branchingRules = [];
        page.branchingRules.push(rule);
      })
    ),

  removeBranchingRule: (pageId, ruleId) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page || !page.branchingRules) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        const idx = page.branchingRules.findIndex((r) => r.id === ruleId);
        if (idx !== -1) page.branchingRules.splice(idx, 1);
      })
    ),

  updateBranchingRule: (pageId, ruleId, updates) =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey) return;
        const page = state.survey.structure.pages.find((p) => p.id === pageId);
        if (!page || !page.branchingRules) return;
        const rule = page.branchingRules.find((r) => r.id === ruleId);
        if (!rule) return;
        const historyUpdate = pushHistory(state);
        Object.assign(state, historyUpdate);
        Object.assign(rule, updates);
      })
    ),

  // Undo/Redo
  undo: () =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey || state.historyIndex <= 0) return;
        state.historyIndex--;
        state.survey.structure = JSON.parse(
          JSON.stringify(state.history[state.historyIndex].structure)
        );
        state.isDirty = true;
      })
    ),

  redo: () =>
    set(
      produce((state: SurveyBuilderState) => {
        if (!state.survey || state.historyIndex >= state.history.length - 1) return;
        state.historyIndex++;
        state.survey.structure = JSON.parse(
          JSON.stringify(state.history[state.historyIndex].structure)
        );
        state.isDirty = true;
      })
    ),

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // Persistence
  markClean: () => set({ isDirty: false }),

  saveSurvey: async () => {
    const { survey } = get();
    if (!survey) return;
    set({ isSaving: true });
    try {
      const res = await fetch(`/api/surveys/${survey.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: survey.title,
          description: survey.description,
          settings: survey.settings,
          structure: survey.structure,
          quotas: survey.quotas,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      set({ isDirty: false, isSaving: false });
    } catch {
      set({ isSaving: false });
      throw new Error("Save failed");
    }
  },
}));
