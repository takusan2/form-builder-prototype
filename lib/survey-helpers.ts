import type { Survey, SurveySettings, SurveyStructure, Quota, ComputedVariable } from "@/lib/types/survey";
import type { Survey as PrismaSurvey } from "@/lib/generated/prisma/client";

export function parseSurvey(raw: PrismaSurvey): Survey {
  // 後方互換: conditionType が無い古いデータに "choice" を補完
  const rawQuotas = (raw.quotas as unknown as Quota[]) || [];
  const quotas = rawQuotas.map((q) => ({
    ...q,
    conditions: (q.conditions || []).map((c) => ({
      ...c,
      conditionType: c.conditionType || "choice" as const,
    })),
  }));

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    status: raw.status as Survey["status"],
    settings: raw.settings as unknown as SurveySettings,
    structure: raw.structure as unknown as SurveyStructure,
    quotas,
    computedVariables: (raw.computedVariables as unknown as ComputedVariable[]) || [],
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

export function serializeSurvey(survey: Partial<Survey>) {
  const data: Record<string, unknown> = {};
  if (survey.title !== undefined) data.title = survey.title;
  if (survey.description !== undefined) data.description = survey.description;
  if (survey.status !== undefined) data.status = survey.status;
  if (survey.settings !== undefined) data.settings = survey.settings;
  if (survey.structure !== undefined) data.structure = survey.structure;
  if (survey.quotas !== undefined) data.quotas = survey.quotas;
  if (survey.computedVariables !== undefined) data.computedVariables = survey.computedVariables;
  return data;
}
