"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Survey, Question } from "@/lib/types/survey";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface ResponseRow {
  id: string;
  status: string;
  respondentUid: string | null;
  respondentParams: Record<string, string>;
  data: Record<string, unknown>;
  duration: number;
  completedAt: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ResponsesPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<ResponseRow | null>(
    null
  );

  const allQuestions: (Question & { pageTitle: string })[] = survey
    ? survey.structure.pages.flatMap((p) =>
        p.questions.map((q) => ({ ...q, pageTitle: p.title }))
      )
    : [];

  // キャリーフォワード設問のmatrixRows/choicesを参照元から解決するヘルパー
  const resolveQuestion = (q: Question & { pageTitle: string }): Question & { pageTitle: string } => {
    const cf = q.carryForward;
    if (!cf) return q;
    const source = allQuestions.find((sq) => sq.id === cf.questionId);
    if (!source) return q;
    const sourceChoices = source.choices || [];
    if (q.type === "matrix_single" || q.type === "matrix_multiple") {
      return {
        ...q,
        matrixRows: sourceChoices.map((c) => ({ id: c.value, text: c.text })),
      };
    }
    if (q.type === "single_choice" || q.type === "multiple_choice") {
      return { ...q, choices: sourceChoices };
    }
    return q;
  };

  const fetchResponses = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/surveys/${surveyId}/responses?page=${page}&limit=50`
        );
        const json = await res.json();
        setResponses(json.responses || []);
        setPagination(json.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      } catch {
        toast.error("回答の取得に失敗しました");
      }
      setLoading(false);
    },
    [surveyId]
  );

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((r) => r.json())
      .then(setSurvey);
    fetchResponses();
  }, [surveyId, fetchResponses]);

  const handleReset = async () => {
    if (
      !confirm(
        `全${pagination.total}件の回答データとクオータカウンターを削除します。この操作は元に戻せません。実行しますか？`
      )
    )
      return;
    try {
      const res = await fetch(`/api/surveys/${surveyId}/responses/reset`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success("回答データをリセットしました");
      fetchResponses(1);
    } catch {
      toast.error("リセットに失敗しました");
    }
  };

  const handleExport = (format: string) => {
    window.open(
      `/api/surveys/${surveyId}/responses/export?format=${format}`,
      "_blank"
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この回答を削除しますか？")) return;
    try {
      const res = await fetch(
        `/api/surveys/${surveyId}/responses/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("回答を削除しました");
      fetchResponses(pagination.page);
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAnswer = (val: unknown, question?: Question & { pageTitle: string }): string => {
    if (val === undefined || val === null) return "-";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object" && val !== null) {
      const entries = Object.entries(val as Record<string, unknown>);
      // マトリクス設問: rowId→行テキスト, colValue→列テキストに変換
      if (question && (question.type === "matrix_single" || question.type === "matrix_multiple")) {
        const rowMap = new Map(question.matrixRows?.map((r) => [r.id, r.text]) || []);
        const colMap = new Map(question.matrixColumns?.map((c) => [c.value, c.text]) || []);
        return entries
          .map(([rowId, colVal]) => {
            const rowText = rowMap.get(rowId) || rowId;
            const colValues = String(colVal).split(",").filter(Boolean);
            const colTexts = colValues.map((v) => colMap.get(v) || v);
            return `${rowText}: ${colTexts.join(", ")}`;
          })
          .join(" / ");
      }
      return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
    }
    return String(val);
  };

  if (!survey) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">回答一覧</h2>
          <p className="text-sm text-muted-foreground">
            全 {pagination.total} 件の回答
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchResponses(pagination.page)}
            disabled={loading}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            更新
          </Button>
          <Select onValueChange={handleExport}>
            <SelectTrigger className="w-44">
              <Download className="mr-2 h-4 w-4" />
              <SelectValue placeholder="エクスポート" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV形式</SelectItem>
              <SelectItem value="xlsx">Excel形式 (XLSX)</SelectItem>
            </SelectContent>
          </Select>
          {pagination.total > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              全削除してロック解除
            </Button>
          )}
        </div>
      </div>

      {/* テーブル */}
      {responses.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            まだ回答がありません
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-24">ステータス</TableHead>
                    <TableHead>回答者</TableHead>
                    {allQuestions.slice(0, 3).map((q) => (
                      <TableHead key={q.id} className="max-w-40 truncate">
                        {q.text || "(無題)"}
                      </TableHead>
                    ))}
                    {allQuestions.length > 3 && (
                      <TableHead className="text-center text-muted-foreground">
                        +{allQuestions.length - 3}
                      </TableHead>
                    )}
                    <TableHead className="w-20">所要時間</TableHead>
                    <TableHead className="w-36">回答日時</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">
                        {(pagination.page - 1) * pagination.limit + i + 1}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "completed" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {r.status === "completed" ? "完了" : "対象外"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.respondentUid || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {allQuestions.slice(0, 3).map((q) => (
                        <TableCell
                          key={q.id}
                          className="max-w-40 truncate text-sm"
                        >
                          {formatAnswer(r.data[q.id], resolveQuestion(q))}
                        </TableCell>
                      ))}
                      {allQuestions.length > 3 && (
                        <TableCell className="text-center text-xs text-muted-foreground">
                          ...
                        </TableCell>
                      )}
                      <TableCell className="text-sm tabular-nums">
                        {formatDuration(r.duration)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {formatDate(r.completedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setSelectedResponse(r)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDelete(r.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <CardHeader className="flex flex-row items-center justify-between border-t py-3">
              <p className="text-sm text-muted-foreground">
                {(pagination.page - 1) * pagination.limit + 1} -{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                / {pagination.total}件
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchResponses(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchResponses(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          )}
        </Card>
      )}

      {/* 回答詳細ダイアログ */}
      <Dialog
        open={!!selectedResponse}
        onOpenChange={(open) => !open && setSelectedResponse(null)}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>回答詳細</DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ステータス: </span>
                  <Badge
                    variant={
                      selectedResponse.status === "completed"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {selectedResponse.status === "completed"
                      ? "完了"
                      : "対象外"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">回答者: </span>
                  {selectedResponse.respondentUid || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">所要時間: </span>
                  {formatDuration(selectedResponse.duration)}
                </div>
                <div>
                  <span className="text-muted-foreground">回答日時: </span>
                  {formatDate(selectedResponse.completedAt)}
                </div>
              </div>

              {Object.keys(selectedResponse.respondentParams || {}).length >
                0 && (
                <div className="rounded-md border p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    URLパラメータ
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedResponse.respondentParams).map(
                      ([k, v]) => (
                        <Badge key={k} variant="outline" className="text-xs">
                          {k}={v}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {allQuestions.map((q) => {
                  const resolved = resolveQuestion(q);
                  const answer = selectedResponse.data[q.id];
                  return (
                    <div key={q.id} className="rounded-md border p-3">
                      <p className="mb-1 text-xs text-muted-foreground">
                        {q.pageTitle}
                      </p>
                      <p className="mb-2 text-sm font-medium">{q.text}</p>
                      <p className="text-sm">
                        {formatAnswer(answer, resolved)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
