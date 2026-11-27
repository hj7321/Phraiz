"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiStream } from "@/hooks/useAiStream";
import { saveWorkspaceHistory } from "@/lib/workspaceApi";

type SummaryMode =
  | "one-line"
  | "bullet"
  | "academic-abstract"
  | "keyword"
  | "section";

const SUMMARY_MODES: { id: SummaryMode; label: string }[] = [
  { id: "bullet", label: "핵심 불릿" },
  { id: "academic-abstract", label: "학술 초록" },
  { id: "section", label: "섹션별 요약" },
  { id: "keyword", label: "키워드 정리" },
  { id: "one-line", label: "한 줄 요약" },
];

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function PdfSummaryStreamPanel({
  accessToken,
  tier = "PRO",
  onQuotaUpdated,
}: {
  accessToken?: string;
  tier?: "FREE" | "PRO";
  onQuotaUpdated?: () => void;
}) {
  const searchParams = useSearchParams();
  const itemIdParam = searchParams.get("itemId");

  const [file, setFile] = useState<File | null>(null);
  const [restoredFileName, setRestoredFileName] = useState<string | null>(null);
  const [restoredOutput, setRestoredOutput] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<SummaryMode>("academic-abstract");
  const [viewMode, setViewMode] = useState<"markdown" | "raw">("markdown");
  // 현재 파일+모드 조합으로 이미 요약을 마쳤는지 추적 (중복 요청 방지)
  const [completedKey, setCompletedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { output, isStreaming, error, meta, start, stop, reset } =
    useAiStream<FormData>("/api/v2/ai/summary/pdf/stream");

  const activeOutput = output || restoredOutput;
  const currentRunKey = file ? `${file.name}:${file.size}:${mode}` : null;
  const isAlreadySummarized =
    !isStreaming &&
    Boolean(activeOutput) &&
    ((currentRunKey !== null && completedKey === currentRunKey) ||
      (file === null && restoredOutput !== ""));

  // 히스토리에서 PDF 요약 항목을 클릭해 넘어온 경우 복원
  useEffect(() => {
    if (!itemIdParam) return;
    fetch(`${API_BASE}/api/v2/workspace/items?type=SUMMARY`)
      .then((r) => (r.ok ? r.json() : []))
      .then(
        (
          items: Array<{
            id: number;
            title: string;
            inputPayload: string;
            outputPayload: string;
          }>,
        ) => {
          const found = items.find((it) => String(it.id) === itemIdParam);
          if (!found) return;
          reset();
          setFile(null);
          setRestoredFileName(found.title);
          setRestoredOutput(found.outputPayload);
          const modeMatch = found.inputPayload?.match(/\(([^)]+)\)$/)?.[1] as
            | SummaryMode
            | undefined;
          if (modeMatch && SUMMARY_MODES.some((m) => m.id === modeMatch)) {
            setMode(modeMatch);
          }
        },
      )
      .catch(() => {});
  }, [itemIdParam, reset]);

  const prevStreaming = useRef(false);
  useEffect(() => {
    if (prevStreaming.current && !isStreaming && output && !error && file) {
      setCompletedKey(`${file.name}:${file.size}:${mode}`);
      void saveWorkspaceHistory({
        itemType: "SUMMARY",
        title: file.name,
        inputPayload: `${file.name} (${mode})`,
        outputPayload: output,
        modelUsed: meta?.model ?? "summary-pdf",
        tokensUsed: meta?.usage?.total_tokens,
      });
    }
    prevStreaming.current = isStreaming;
  }, [isStreaming, output, error, file, mode, meta]);

  const selectPdfFile = (candidate: File | null) => {
    if (!candidate) return;
    const isPdf =
      candidate.type === "application/pdf" ||
      candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFileError("PDF 형식의 파일만 첨부할 수 있습니다.");
      return;
    }
    if (candidate.size > 20 * 1024 * 1024) {
      setFileError("PDF 파일은 최대 20MB까지 업로드할 수 있습니다.");
      return;
    }
    setFileError(null);
    setFile(candidate);
    setRestoredFileName(null);
    setRestoredOutput("");
    setCompletedKey(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    selectPdfFile(dropped);
  };

  const handleSubmit = () => {
    if (!file || isStreaming || isAlreadySummarized) return;
    setRestoredOutput("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    void start(formData, accessToken, { "X-Plan-Tier": tier }, onQuotaUpdated);
  };

  return (
    <div className="w-full space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex flex-wrap gap-2">
          {SUMMARY_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                mode === m.id
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("markdown")}
            className={`rounded px-2.5 py-1 font-medium transition ${
              viewMode === "markdown"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            마크다운 뷰어
          </button>
          <button
            type="button"
            onClick={() => setViewMode("raw")}
            className={`rounded px-2.5 py-1 font-medium transition ${
              viewMode === "raw"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            원문(Raw)
          </button>
        </div>
      </div>

      {/* 드래그 앤 드롭 + 클릭 가능한 중앙 정렬 업로드 박스 */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex min-h-[148px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-6 text-center transition ${
          isDragging
            ? "border-teal-500 bg-teal-50/70"
            : "border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-slate-100/70"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => selectPdfFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />

        <span className="rounded-md bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
          {file || restoredFileName
            ? "다른 PDF 파일 선택"
            : "PDF 파일 선택 또는 여기로 드래그"}
        </span>

        <p className="mt-2.5 text-xs text-slate-500">
          최대 20MB PDF · PDFBox 텍스트 추출 없이 Gemini 2.5 Flash가 표·수식·2단
          레이아웃을 직접 읽습니다.
        </p>

        {file && (
          <p className="mt-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
            첨부됨: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}

        {!file && restoredFileName && (
          <p className="mt-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            히스토리에서 불러온 파일: {restoredFileName} (모드 변경 후
            재요약하려면 파일을 다시 첨부하세요)
          </p>
        )}

        {fileError && (
          <p className="mt-2 text-xs font-medium text-red-600">{fileError}</p>
        )}
      </div>

      <div className="min-h-[260px] rounded-lg border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-900">
        {!activeOutput ? (
          <span className="text-slate-400">
            {isStreaming
              ? "Gemini가 PDF 문서를 분석해 실시간 요약 중입니다..."
              : "논문이나 자료 PDF를 드래그해 올리고 요약 시작을 눌러주세요."}
          </span>
        ) : viewMode === "raw" ? (
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800">
            {activeOutput}
          </pre>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="mb-3 mt-4 text-xl font-bold text-slate-900">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-2 mt-5 border-b border-slate-200 pb-1 text-lg font-bold text-slate-900">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1.5 mt-4 text-base font-semibold text-slate-800">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-3 leading-7 text-slate-800">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 list-disc space-y-1 pl-5 text-slate-800">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 list-decimal space-y-1 pl-5 text-slate-800">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="leading-6">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-slate-900">
                  {children}
                </strong>
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
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-teal-800">
                  {children}
                </code>
              ),
            }}
          >
            {activeOutput}
          </ReactMarkdown>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {meta && (
            <span>
              모델: {meta.model} · 지연: {(meta.latencyMs / 1000).toFixed(2)}s
              {meta.usage?.total_tokens
                ? ` · 토큰: ${meta.usage.total_tokens}`
                : ""}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {activeOutput && !isStreaming && (
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(activeOutput)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              마크다운 복사
            </button>
          )}
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white"
            >
              요약 중단
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || isAlreadySummarized}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isAlreadySummarized ? "요약 완료" : "Gemini PDF 요약 시작"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
