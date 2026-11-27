"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhraizAppHeader } from "@/components/layout/PhraizAppHeader";
import { QuotaStatusBar, type PlanTier } from "@/components/ai/QuotaStatusBar";
import { LeftPdfSummaryPane } from "@/components/canvas/LeftPdfSummaryPane";
import { CenterEditorPane } from "@/components/canvas/CenterEditorPane";
import { RightCitationPane } from "@/components/canvas/RightCitationPane";
import { getWorkspaceHeaders } from "@/lib/workspaceApi";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const itemIdParam = searchParams.get("itemId");

  const [title, setTitle] = useState("새 학술 초안");
  const [content, setContent] = useState(
    "# 서론\n\n기존 RAG 시스템은 검색된 문서 조각들을 따로따로 점수 매기기 때문에, 하나씩 보면 질문이랑 관련 있어 보여도 다 합쳐놓으면 서로 말이 안 맞거나 내용이 끊기는 문제가 자주 생긴다.\n",
  );
  const [tier, setTier] = useState<PlanTier>("PRO");
  const [quotaRefresh, setQuotaRefresh] = useState(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!itemIdParam) return;
    fetch(`${API_BASE}/api/v2/workspace/items`, {
      headers: getWorkspaceHeaders(),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(
        (
          items: Array<{ id: number; title: string; outputPayload: string }>,
        ) => {
          const found = items.find((it) => String(it.id) === itemIdParam);
          if (found) {
            setTitle(found.title);
            setContent(found.outputPayload);
          }
        },
      )
      .catch(() => {});
  }, [itemIdParam]);

  const insertAtCursor = (snippet: string) => {
    const el = editorRef.current;
    if (!el) {
      setContent((prev) => prev + snippet);
      return;
    }

    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const prevScrollTop = el.scrollTop;
    const prevWindowY = window.scrollY;

    const next = content.slice(0, start) + snippet + content.slice(end);
    setContent(next);

    requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
      el.setSelectionRange(start + snippet.length, start + snippet.length);
      el.scrollTop = prevScrollTop;
      window.scrollTo({
        top: prevWindowY,
        behavior: "instant" as ScrollBehavior,
      });
    });
  };

  const appendReference = (fullCitation: string) => {
    setContent((prev) => {
      if (prev.includes(fullCitation)) return prev;
      if (prev.includes("## References")) {
        return `${prev.trimEnd()}\n- ${fullCitation}\n`;
      }
      return `${prev.trimEnd()}\n\n## References\n\n- ${fullCitation}\n`;
    });
  };

  const handleSaveToDb = async () => {
    setSaveMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/v2/workspace/items`, {
        method: "POST",
        headers: getWorkspaceHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          itemType: "PARAPHRASE",
          title: title.trim() || "제목 없는 초안",
          inputPayload: "Unified Canvas Draft",
          outputPayload: content,
          modelUsed: "unified-canvas",
        }),
      });
      if (!res.ok) throw new Error();
      setSaveMessage("통합 DB(workspace_items)에 저장되었습니다.");
      setTimeout(() => setSaveMessage(null), 2500);
    } catch {
      setSaveMessage("저장에 실패했습니다. 백엔드 실행 상태를 확인해 주세요.");
    }
  };

  const handleNewDraft = () => {
    if (
      content.trim().length > 0 &&
      !window.confirm("현재 에디터 내용을 비우고 새 글을 시작할까요?")
    ) {
      return;
    }
    setTitle("새 학술 초안");
    setContent("");
    setSaveMessage(null);
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.trim() || "phraiz-draft"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PhraizAppHeader
        onLoadHistoryItem={(item) => {
          setTitle(item.title);
          setContent(item.outputPayload);
        }}
      />

      <main className="p-4 md:p-6">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-violet-700 px-2.5 py-1 text-xs font-bold text-white">
                  Phraiz Canvas
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-b border-transparent text-lg font-bold text-slate-900 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {saveMessage && (
                  <span className="text-xs font-medium text-emerald-700">
                    {saveMessage}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleNewDraft}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  + 새 글
                </button>
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  .md 내보내기
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveToDb()}
                  className="rounded-lg bg-slate-950 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
                >
                  워크스페이스 저장
                </button>
              </div>
            </div>

            <QuotaStatusBar
              tier={tier}
              onChangeTier={setTier}
              refreshTrigger={quotaRefresh}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-250px)] lg:grid-cols-12">
            <div className="min-h-0 lg:col-span-3">
              <LeftPdfSummaryPane
                tier={tier}
                onQuotaUpdated={() => setQuotaRefresh((n) => n + 1)}
                onInsertToEditor={insertAtCursor}
              />
            </div>

            <div className="min-h-0 lg:col-span-6">
              <CenterEditorPane
                content={content}
                onChangeContent={setContent}
                tier={tier}
                onQuotaUpdated={() => setQuotaRefresh((n) => n + 1)}
                editorRef={editorRef}
              />
            </div>

            <div className="min-h-0 lg:col-span-3">
              <RightCitationPane
                onInsertInText={insertAtCursor}
                onAppendReference={appendReference}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UnifiedWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          로딩 중...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
