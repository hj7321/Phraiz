"use client";

import { useState } from "react";

const GUIDE_TABS = [
  {
    id: "canvas",
    label: "통합 캔버스",
    title: "한 화면에서 논문 요약 → 교정 → 인용까지",
    steps: [
      "좌측 패널에 논문 PDF를 드래그해 요약한 뒤 [에디터로 삽입]을 누르세요.",
      "중앙 에디터에서 다듬고 싶은 문장을 마우스로 드래그하면 상단 패러프레이징 버튼이 활성화됩니다.",
      "우측 인용 서랍에 논문 URL(DOI·arXiv 등)을 추가하고 [본문 인용 삽입]과 [참고문헌 추가]를 클릭하세요.",
      "작성이 끝나면 상단 [워크스페이스 저장]으로 DB에 보관하거나 [.md 내보내기]로 내려받을 수 있습니다.",
    ],
  },
  {
    id: "paraphrase",
    label: "5단계 패러프레이징",
    title: "강도 1~5단계와 어절 Diff 활용법",
    steps: [
      "1단계(최소 교정)는 맞춤법·조사만 다듬고, 5단계(전면 재작성)는 문단 흐름까지 새롭게 재구성합니다.",
      "변환이 끝나면 빨간 취소선(삭제)과 초록 하이라이트(추가), 어절 변경률(%)로 수정 폭을 바로 검수할 수 있습니다.",
      "경량 모델(Haiku 5.5)은 1~2단계 빠른 교정에, 주력 모델(Sonnet 5.5)은 3~5단계 학술 문체 재구성에 적합합니다.",
    ],
  },
  {
    id: "pdf",
    label: "Gemini PDF 요약",
    title: "표·수식·2단 논문을 깨짐 없이 요약",
    steps: [
      "최대 20MB PDF를 점선 영역에 드래그하거나 클릭해 첨부하세요.",
      "텍스트 추출기(PDFBox) 없이 Gemini 2.5 Flash가 PDF를 직접 읽어 표와 수식 수치를 보존합니다.",
      "우측 상단 [마크다운 뷰어 / 원문(Raw)] 토글로 표 렌더링과 복사용 마크다운을 자유롭게 전환하세요.",
    ],
  },
  {
    id: "citation",
    label: "하이브리드 인용",
    title: "환각 없는 3단계 인용 검증 파이프라인",
    steps: [
      "1차로 무료 Zotero 서버에서 서지정보를 추출하고, DOI가 있으면 Crossref 공식 DB로 실존 여부를 검증합니다.",
      "Zotero가 지원하지 않는 일반 웹페이지만 경량 LLM JSON 폴백으로 메타데이터를 복구합니다.",
      "추출된 논문은 추가 API 호출 없이 APA · MLA · Chicago · IEEE · BibTeX 5종 형식으로 즉시 전환됩니다.",
    ],
  },
] as const;

export function HelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [activeId, setActiveId] =
    useState<(typeof GUIDE_TABS)[number]["id"]>("canvas");
  if (!open) return null;

  const current = GUIDE_TABS.find((t) => t.id === activeId) ?? GUIDE_TABS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-600" />
            <h2 className="text-base font-bold text-slate-950">
              Phraiz v2.0 사용 가이드
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            닫기 ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-slate-50/70 px-6 py-3">
          {GUIDE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeId === tab.id
                  ? "bg-violet-700 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-950"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          <h3 className="text-sm font-bold text-slate-900">{current.title}</h3>
          <ol className="mt-4 space-y-3">
            {current.steps.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm leading-relaxed text-slate-600"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-50 font-mono text-[11px] font-bold text-violet-700">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-xs text-slate-500">
          <span>
            FREE: 월 50크레딧(Haiku) · PRO: 월 1,000크레딧(Sonnet + PDF)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-950 px-3.5 py-1.5 font-semibold text-white hover:bg-violet-700"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
