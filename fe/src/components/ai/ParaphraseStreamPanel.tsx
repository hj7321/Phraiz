"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAiStream } from "@/hooks/useAiStream";
import { computeWordDiff } from "@/lib/wordDiff";
import { saveWorkspaceHistory } from "@/lib/workspaceApi";

type ParaphraseMode =
  | "standard"
  | "academic"
  | "creative"
  | "fluency"
  | "experimental";

interface ParaphrasePayload {
  text: string;
  mode: ParaphraseMode;
  strengthLevel: number;
  fastMode: boolean;
}

const MODES: { id: ParaphraseMode; label: string }[] = [
  { id: "standard", label: "표준" },
  { id: "academic", label: "학술" },
  { id: "fluency", label: "유창성" },
  { id: "creative", label: "창의적" },
  { id: "experimental", label: "실험적" },
];

const STRENGTH_STEPS = [
  { level: 1, title: "1단계", desc: "최소 교정 (맞춤법·조사)" },
  { level: 2, title: "2단계", desc: "어휘 다듬기 (20~35%)" },
  { level: 3, title: "3단계", desc: "균형 재작성 (40~55%)" },
  { level: 4, title: "4단계", desc: "구조 재구성 (60~75%)" },
  { level: 5, title: "5단계", desc: "전면 재작성 (80%+)" },
];

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function makeRunKey(
  text: string,
  mode: ParaphraseMode,
  strengthLevel: number,
  fastMode: boolean,
) {
  return `${text.trim()}|${mode}|${strengthLevel}|${fastMode}`;
}

export function ParaphraseStreamPanel({
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

  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [restoredOutput, setRestoredOutput] = useState("");
  const [mode, setMode] = useState<ParaphraseMode>("academic");
  const [strengthLevel, setStrengthLevel] = useState(3);
  const [fastMode, setFastMode] = useState(false);
  const [showDiff, setShowDiff] = useState(true);

  // 중복 실행 방지: 마지막 완료(또는 히스토리 복원) 상태 키와 출처 추적
  const [completedKey, setCompletedKey] = useState<string | null>(null);
  const [completedOrigin, setCompletedOrigin] = useState<
    "history" | "run" | null
  >(null);

  // 실행 시점의 설정 스냅샷 (히스토리 저장 시 정확히 기록)
  const lastRunRef = useRef<ParaphrasePayload | null>(null);

  const { output, isStreaming, error, meta, start, stop, reset } =
    useAiStream<ParaphrasePayload>("/api/v2/ai/paraphrase/stream");

  const activeOutput = output || restoredOutput;
  const currentKey = makeRunKey(text, mode, strengthLevel, fastMode);
  const isLocked =
    !isStreaming && Boolean(activeOutput) && completedKey === currentKey;

  // 히스토리에서 패러프레이징 항목 클릭 시 원문 + 모드 + 단계 + 경량 여부 + 결과(Diff) 모두 복원
  useEffect(() => {
    if (!itemIdParam) return;
    fetch(`${API_BASE}/api/v2/workspace/items?type=PARAPHRASE`)
      .then((r) => (r.ok ? r.json() : []))
      .then(
        (
          items: Array<{
            id: number;
            inputPayload: string;
            outputPayload: string;
            modelUsed?: string;
          }>,
        ) => {
          const found = items.find(
            (it) =>
              String(it.id) === itemIdParam &&
              it.modelUsed !== "unified-canvas",
          );
          if (!found) return;

          reset();
          let parsedText = found.inputPayload;
          let parsedMode: ParaphraseMode = "academic";
          let parsedStrength = 3;
          let parsedFast = false;

          try {
            const obj = JSON.parse(
              found.inputPayload,
            ) as Partial<ParaphrasePayload>;
            if (typeof obj.text === "string") {
              parsedText = obj.text;
              if (obj.mode && MODES.some((m) => m.id === obj.mode)) {
                parsedMode = obj.mode;
              }
              if (
                typeof obj.strengthLevel === "number" &&
                obj.strengthLevel >= 1 &&
                obj.strengthLevel <= 5
              ) {
                parsedStrength = obj.strengthLevel;
              }
              if (typeof obj.fastMode === "boolean") {
                parsedFast = obj.fastMode;
              }
            }
          } catch {
            // 기존 일반 텍스트 형식 히스토리 하위 호환
          }

          setText(parsedText);
          setSubmittedText(parsedText);
          setMode(parsedMode);
          setStrengthLevel(parsedStrength);
          setFastMode(parsedFast);
          setRestoredOutput(found.outputPayload);
          setCompletedKey(
            makeRunKey(parsedText, parsedMode, parsedStrength, parsedFast),
          );
          setCompletedOrigin("history");
        },
      )
      .catch(() => {});
  }, [itemIdParam, reset]);

  const prevStreaming = useRef(false);
  useEffect(() => {
    if (prevStreaming.current && !isStreaming && output && !error) {
      const snap = lastRunRef.current ?? {
        text: submittedText,
        mode,
        strengthLevel,
        fastMode,
      };
      setCompletedKey(
        makeRunKey(snap.text, snap.mode, snap.strengthLevel, snap.fastMode),
      );
      setCompletedOrigin("run");

      void saveWorkspaceHistory({
        itemType: "PARAPHRASE",
        title: `[${snap.strengthLevel}단계] ${snap.text.slice(0, 24)}...`,
        inputPayload: JSON.stringify(snap),
        outputPayload: output,
        modelUsed: meta?.model,
        tokensUsed: meta?.usage?.total_tokens,
      });
    }
    prevStreaming.current = isStreaming;
  }, [
    isStreaming,
    output,
    error,
    submittedText,
    mode,
    strengthLevel,
    fastMode,
    meta,
  ]);

  const diffSummary = useMemo(() => {
    if (!submittedText || !activeOutput || isStreaming) return null;
    return computeWordDiff(submittedText, activeOutput);
  }, [submittedText, activeOutput, isStreaming]);

  const handleSubmit = () => {
    if (!text.trim() || isStreaming || isLocked) return;
    const payload: ParaphrasePayload = {
      text,
      mode,
      strengthLevel,
      fastMode,
    };
    lastRunRef.current = payload;
    setRestoredOutput("");
    setSubmittedText(text);
    void start(payload, accessToken, { "X-Plan-Tier": tier }, onQuotaUpdated);
  };

  const currentStep = STRENGTH_STEPS[strengthLevel - 1];

  return (
    <div className="w-full space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                mode === m.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={fastMode}
              onChange={(e) => setFastMode(e.target.checked)}
            />
            <span>경량 모델 (Haiku 5.5)</span>
          </label>

          <div className="group relative inline-flex items-center">
            <button
              type="button"
              aria-label="모델 차이 안내"
              className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[11px] font-bold text-slate-500 hover:border-blue-500 hover:text-blue-600"
            >
              ?
            </button>
            <div className="pointer-events-none invisible absolute right-0 top-6 z-20 w-72 rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="font-semibold text-white">
                주력 vs 경량 모델 차이
              </div>
              <p className="mt-1.5 text-slate-300">
                <strong className="text-blue-300">
                  해제 · 주력 (Sonnet 5.5):
                </strong>{" "}
                정교한 한국어 학술 문체와 3~5단계 고강도 구조 재구성에
                최적화되어 있습니다.
              </p>
              <p className="mt-1.5 text-slate-300">
                <strong className="text-emerald-300">
                  체크 · 경량 (Haiku 5.5):
                </strong>{" "}
                응답 속도가 훨씬 빠르고 API 원가가 약 20배 저렴해 1~2단계
                맞춤법·유창성 교정에 적합합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-800">
            변형 강도 (5단계)
          </span>
          <span className="font-medium text-blue-700">
            {currentStep.title} · {currentStep.desc}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {STRENGTH_STEPS.map((step) => {
            const active = strengthLevel === step.level;
            return (
              <button
                key={step.level}
                type="button"
                onClick={() => setStrengthLevel(step.level)}
                className={`rounded-lg border px-2 py-2 text-center transition ${
                  active
                    ? "border-blue-600 bg-blue-50 font-semibold text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="text-sm">{step.title}</div>
                <div className="mt-0.5 truncate text-[11px] opacity-80">
                  {step.desc.split(" (")[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-slate-500">원문 입력</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="패러프레이징할 문장을 입력하세요..."
            className="min-h-[260px] w-full rounded-lg border border-slate-300 p-4 text-sm leading-relaxed focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>변환 결과</span>
              {diffSummary && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-800">
                  어절 변경률 {diffSummary.changeRatio}%
                </span>
              )}
            </div>
            {diffSummary && (
              <button
                type="button"
                onClick={() => setShowDiff((v) => !v)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {showDiff ? "최종 문장만 보기" : "변경점(Diff) 보기"}
              </button>
            )}
          </div>

          <div className="min-h-[260px] rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-900">
            {!activeOutput ? (
              <span className="text-slate-400">
                {isStreaming
                  ? "실시간 생성 중..."
                  : "변환 결과가 실시간으로 표시됩니다."}
              </span>
            ) : showDiff && diffSummary ? (
              <div>
                {diffSummary.tokens.map((tok, idx) => {
                  if (tok.type === "removed") {
                    return (
                      <span
                        key={idx}
                        className="bg-red-100 text-red-700 line-through decoration-red-400"
                      >
                        {tok.value}
                      </span>
                    );
                  }
                  if (tok.type === "added") {
                    return (
                      <span
                        key={idx}
                        className="bg-emerald-100 font-medium text-emerald-900"
                      >
                        {tok.value}
                      </span>
                    );
                  }
                  return <span key={idx}>{tok.value}</span>;
                })}
              </div>
            ) : (
              activeOutput
            )}
          </div>
        </div>
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
              결과 복사
            </button>
          )}
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white"
            >
              생성 중단
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() || isLocked}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isLocked
                ? completedOrigin === "history"
                  ? "히스토리 완료"
                  : "변환 완료"
                : "패러프레이징 시작"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
