"use client";

import { useRef, useState, type DragEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiStream } from "@/hooks/useAiStream";
import type { PlanTier } from "@/components/ai/QuotaStatusBar";

type SummaryMode = "bullet" | "academic-abstract" | "section" | "keyword" | "one-line";

const MODES: { id: SummaryMode; label: string }[] = [
  { id: "academic-abstract", label: "초록" },
  { id: "bullet", label: "불릿" },
  { id: "section", label: "섹션" },
  { id: "keyword", label: "키워드" },
  { id: "one-line", label: "한줄" },
];

export function LeftPdfSummaryPane({
  tier,
  onQuotaUpdated,
  onInsertToEditor,
}: {
  tier: PlanTier;
  onQuotaUpdated: () => void;
  onInsertToEditor: (snippet: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<SummaryMode>("bullet");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { output, isStreaming, error, start, stop } =
    useAiStream<FormData>("/api/v2/ai/summary/pdf/stream");

  const selectPdf = (candidate: File | null) => {
    if (!candidate) return;
    const isPdf =
      candidate.type === "application/pdf" ||
      candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFileError("PDF 파일만 첨부할 수 있습니다.");
      return;
    }
    if (candidate.size > 20 * 1024 * 1024) {
      setFileError("20MB 이하 PDF만 지원합니다.");
      return;
    }
    setFileError(null);
    setFile(candidate);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    selectPdf(e.dataTransfer.files?.[0] ?? null);
  };

  const handleRun = () => {
    if (!file || isStreaming) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", mode);
    void start(fd, undefined, { "X-Plan-Tier": tier }, onQuotaUpdated);
  };

  return (
    <aside className="flex h-full flex-col rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">1. 논문 PDF 요약</h2>
          <span className="rounded bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
            Gemini 2.5
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded px-2 py-1 text-xs font-medium transition ${
                mode === m.id
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-3 py-4 text-center transition ${
            isDragging
              ? "border-teal-500 bg-teal-50"
              : "border-slate-300 bg-slate-50 hover:border-teal-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => selectPdf(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <span className="text-xs font-semibold text-slate-700">
            {file ? "다른 PDF로 변경" : "PDF 드래그 또는 클릭"}
          </span>
          {file && (
            <span className="mt-1 max-w-full truncate rounded bg-teal-100 px-2 py-0.5 text-[11px] text-teal-800">
              {file.name}
            </span>
          )}
          {fileError && <span className="mt-1 text-[11px] text-red-600">{fileError}</span>}
        </div>

        <div className="mt-2 flex gap-2">
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="w-full rounded-md bg-slate-800 py-1.5 text-xs font-semibold text-white"
            >
              요약 중단
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRun}
              disabled={!file}
              className="w-full rounded-md bg-teal-600 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              PDF 요약 시작
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto border-t border-slate-100 p-4 text-xs leading-relaxed text-slate-800">
        {!output ? (
          <p className="text-slate-400">
            논문 PDF를 요약한 뒤 &ldquo;에디터로 삽입&rdquo; 버튼으로 초안에 바로 반영할 수 있습니다.
          </p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="mb-2 mt-3 text-sm font-bold text-slate-900">{children}</h1>,
              h2: ({ children }) => <h2 className="mb-1.5 mt-3 text-xs font-bold text-slate-900">{children}</h2>,
              p: ({ children }) => <p className="mb-2 leading-5">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300 text-[11px]">{children}</table>
                </div>
              ),
              th: ({ children }) => <th className="border border-slate-300 bg-slate-100 px-1.5 py-1 text-left">{children}</th>,
              td: ({ children }) => <td className="border border-slate-300 px-1.5 py-1">{children}</td>,
            }}
          >
            {output}
          </ReactMarkdown>
        )}
      </div>

      {output && !isStreaming && (
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={() => onInsertToEditor(`\n\n${output}\n`)}
            className="w-full rounded-md border border-teal-600 bg-teal-50 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
          >
            요약 내용 에디터로 삽입 →
          </button>
        </div>
      )}
    </aside>
  );
}
