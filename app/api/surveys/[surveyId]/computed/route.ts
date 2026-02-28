import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSurvey } from "@/lib/survey-helpers";
import type { ComputedVariable, ResponseData } from "@/lib/types/survey";

/**
 * POST /api/surveys/[surveyId]/computed
 *
 * ページ離脱時に計算変数を実行するサーバーサイドプロキシ。
 * - クライアントからは回答データとページIDを送る
 * - サーバー側で外部APIを呼び出す（CORS問題なし、URL非公開）
 * - 結果の変数値を返す
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  const body = await request.json();
  const { pageId, answers } = body as {
    pageId: string;
    answers: ResponseData;
  };

  const raw = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!raw) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const survey = parseSurvey(raw);
  const variables = survey.computedVariables || [];

  // このページ離脱時にトリガーされる有効な変数を抽出
  const triggered = variables.filter(
    (v) =>
      v.enabled &&
      v.trigger.type === "on_page_leave" &&
      v.trigger.pageId === pageId
  );

  if (triggered.length === 0) {
    return NextResponse.json({ variables: {} });
  }

  const results: Record<string, string> = {};

  for (const cv of triggered) {
    const cvResult = await callExternalApi(cv, answers);
    for (const [variableId, value] of Object.entries(cvResult)) {
      results[`_cv.${variableId}`] = value;
    }
  }

  return NextResponse.json({ variables: results });
}

async function callExternalApi(
  cv: ComputedVariable,
  answers: ResponseData
): Promise<Record<string, string>> {
  // 入力パラメータを構築
  const body: Record<string, unknown> = {};
  for (const input of cv.inputMapping) {
    body[input.paramName] = answers[input.questionId] ?? null;
  }

  const timeout = cv.timeout || 5000;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(cv.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[ComputedVariable] ${cv.name}: HTTP ${res.status}`);
      return applyFallback(cv);
    }

    const json = await res.json();

    const result: Record<string, string> = {};
    for (const output of cv.outputMapping) {
      const val = json[output.responseKey];
      result[output.variableId] = val !== undefined ? String(val) : "";
    }

    return result;
  } catch (err) {
    console.warn(`[ComputedVariable] ${cv.name}: fetch failed`, err);
    return applyFallback(cv);
  }
}

function applyFallback(cv: ComputedVariable): Record<string, string> {
  if (!cv.fallbackValues) return {};
  return { ...cv.fallbackValues };
}
