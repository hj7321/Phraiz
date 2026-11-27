"use client";

import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiStream } from "@/hooks/useAiStream";
import { computeWordDiff } from "@/lib/wordDiff";
import type { PlanTier } from "@/components/ai/QuotaStatusBar";

type ParaphraseMode =
  | "standard"
  | "academic"
  | "fluency"
  | "creative"
  | "experimental";

interface ParaphrasePayload {
  text: string;
  mode: ParaphraseMode;
  strengthLevel: number;
  fastMode: boolean;
}

const MODES: { id: ParaphraseMode; label: string }[] = [
  { id: "academic", label: "학술" },
  { id: "standard", label: "표준" },
  { id: "fluency", label: "유창성" },
  { id: "creative", label: "창의적" },
  { id: "experimental", label: "실험적" },
];

export function CenterEditorPane({
  content,
  onChangeContent,
  tier,
  onQuotaUpdated,
  editorRef,
}: {
  content: string;
  onChangeContent: (next: string) => void;
  tier: PlanTier;
  onQuotaUpdated: () => void;
  editorRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const [selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [mode, setMode] = useState<ParaphraseMode>("academic");
  const [strengthLevel, setStrengthLevel] = useState(3);
  const [previewMode, setPreviewMode] = useState(false);

  const { output, isStreaming, error, meta, start, stop, reset } =
    useAiStream<ParaphrasePayload>("/api/v2/ai/paraphrase/stream");

  const diffSummary = useMemo(() => {
    if (!selectedText || !output || isStreaming) return null;
    return computeWordDiff(selectedText, output);
  }, [selectedText, output, isStreaming]);

  const handleSelectCapture = () => {
    const el = editorRef.current;
    if (!el) return;
    const startIdx = el.selectionStart;
    const endIdx = el.selectionEnd;
    if (endIdx > startIdx) {
      const slice = content.slice(startIdx, endIdx).trim();
      if (slice.length >= 2) {
        setSelectionRange({ start: startIdx, end: endIdx });
        setSelectedText(content.slice(startIdx, endIdx));
      }
    }
  };

  const handleRunParaphrase = () => {
    if (!selectedText.trim() || isStreaming) return;
    void start(
      { text: selectedText, mode, strengthLevel, fastMode: false },
      undefined,
      { "X-Plan-Tier": tier },
      onQuotaUpdated,
    );
  };

  const handleApplyReplacement = () => {
    if (!selectionRange || !output) return;
    const updated =
      content.slice(0, selectionRange.start) +
      output +
      content.slice(selectionRange.end);
    onChangeContent(updated);
    setSelectionRange(null);
    setSelectedText("");
    reset();
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white">
      {/* 에디터 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            2. 통합 글쓰기 에디터
          </h2>
          <span className="text-xs text-slate-400">
            {content.length}자 · {wordCount}어절
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPreviewMode((v) => !v)}
          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {previewMode ? "편집기로 돌아가기" : "마크다운 미리보기"}
        </button>
      </div>

      {/* 드래그 선택 시 활성화되는 인라인 패러프레이징 툴바 */}
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  mode === m.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {m.label}
              </button>
            ))}

            <div className="ml-2 flex items-center gap-1">
              <span className="text-[11px] text-slate-500">강도</span>
              {[1, 2, 3, 4, 5].map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setStrengthLevel(lv)}
                  className={`h-6 w-6 rounded text-xs font-semibold ${
                    strengthLevel === lv
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white"
            >
              생성 중단
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunParaphrase}
              disabled={!selectedText.trim()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {selectedText.trim()
                ? `선택 구간(${selectedText.length}자) 패러프레이징`
                : "문장을 드래그해 선택하세요"}
            </button>
          )}
        </div>

        {/* 인라인 Diff 결과 & 본문 교체 카드 */}
        {(output || isStreaming || error) && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3 text-xs">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-800">
                  패러프레이징 제안 ({strengthLevel}단계)
                </span>
                {diffSummary && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-800">
                    어절 변경률 {diffSummary.changeRatio}%
                  </span>
                )}
                {meta && (
                  <span className="text-[11px] text-slate-400">
                    {meta.model} · {(meta.latencyMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                {output && !isStreaming && (
                  <button
                    type="button"
                    onClick={handleApplyReplacement}
                    className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                  >
                    본문에 반영
                  </button>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
                >
                  닫기
                </button>
              </div>
            </div>

            {error ? (
              <p className="text-red-600">{error}</p>
            ) : diffSummary ? (
              <div className="leading-relaxed whitespace-pre-wrap text-slate-900">
                {diffSummary.tokens.map((tok, idx) =>
                  tok.type === "removed" ? (
                    <span
                      key={idx}
                      className="bg-red-100 text-red-700 line-through decoration-red-400"
                    >
                      {tok.value}
                    </span>
                  ) : tok.type === "added" ? (
                    <span
                      key={idx}
                      className="bg-emerald-100 font-medium text-emerald-900"
                    >
                      {tok.value}
                    </span>
                  ) : (
                    <span key={idx}>{tok.value}</span>
                  ),
                )}
              </div>
            ) : (
              <div className="leading-relaxed whitespace-pre-wrap text-slate-800">
                {output || "생성 중..."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 본문 에디터 또는 미리보기 */}
      <div
        className={`flex-1 min-h-0 ${previewMode ? "overflow-y-auto p-4" : "overflow-hidden"}`}
      >
        {previewMode ? (
          <div className="text-sm leading-relaxed text-slate-800">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="mb-3 mt-4 border-b border-slate-200 pb-1.5 text-2xl font-bold text-slate-900">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-2.5 mt-6 border-b border-slate-100 pb-1 text-lg font-bold text-slate-900">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-base font-semibold text-slate-800">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-3 leading-7 text-slate-800">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 list-disc space-y-1.5 pl-5 text-slate-800">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-slate-800">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="leading-6">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-900">
                    {children}
                  </strong>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-3 border-l-4 border-blue-300 bg-slate-50 py-2 pl-4 italic text-slate-700">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-4 border-slate-200" />,
                table: ({ children }) => (
                  <div className="my-4 overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 text-xs">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-slate-100">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-900">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-slate-300 px-3 py-2 text-slate-700">
                    {children}
                  </td>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-blue-800">
                    {children}
                  </code>
                ),
              }}
            >
              {content || "_작성된 내용이 없습니다._"}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => onChangeContent(e.target.value)}
            onMouseUp={handleSelectCapture}
            onKeyUp={handleSelectCapture}
            placeholder="여기에 논문·보고서 초안을 작성하거나 왼쪽 PDF 요약 결과를 삽입하세요. 다듬고 싶은 문장을 드래그하면 위쪽 패러프레이징 버튼이 즉시 활성화됩니다."
            className="h-full w-full resize-none overflow-y-auto p-4 text-sm leading-7 text-slate-900 focus:outline-none"
          />
        )}
      </div>
    </section>
  );
}
