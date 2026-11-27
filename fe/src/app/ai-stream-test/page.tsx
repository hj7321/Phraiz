"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhraizAppHeader } from "@/components/layout/PhraizAppHeader";
import { ParaphraseStreamPanel } from "@/components/ai/ParaphraseStreamPanel";
import { PdfSummaryStreamPanel } from "@/components/ai/PdfSummaryStreamPanel";
import { CitationExtractPanel } from "@/components/ai/CitationExtractPanel";
import { WorkspacePanel } from "@/components/ai/WorkspacePanel";
import { QuotaStatusBar, type PlanTier } from "@/components/ai/QuotaStatusBar";

type TabId = "paraphrase" | "pdf" | "citation" | "workspace";

const TAB_META: Record<TabId, { title: string; desc: string }> = {
  paraphrase: {
    title: "AI 패러프레이징",
    desc: "5단계 정밀 변형 강도와 어절 단위 Diff로 학술 문체를 다듬습니다.",
  },
  pdf: {
    title: "Gemini 네이티브 PDF 요약",
    desc: "2단 논문·표·수식을 깨짐 없이 직접 해석해 마크다운으로 실시간 요약합니다.",
  },
  citation: {
    title: "하이브리드 인용 생성",
    desc: "Zotero 무료 추출, Crossref DOI 공식 검증, LLM 구조화 폴백으로 환각 없는 인용문을 만듭니다.",
  },
  workspace: {
    title: "통합 워크스페이스 DB",
    desc: "프로젝트 폴더별로 패러프레이징·요약·인용 작업물을 한곳에서 관리합니다.",
  },
};

function WorkbenchContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") as TabId | null;
  const currentTab: TabId =
    rawTab && rawTab in TAB_META ? rawTab : "paraphrase";

  const [tier, setTier] = useState<PlanTier>("PRO");
  const [quotaRefresh, setQuotaRefresh] = useState(0);

  useEffect(() => {
    setQuotaRefresh((n) => n + 1);
  }, [currentTab]);

  const meta = TAB_META[currentTab];

  return (
    <div className="min-h-screen bg-slate-50">
      <PhraizAppHeader />

      <main className="p-4 md:p-6">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-4">
            <h1 className="text-lg font-bold tracking-tight text-slate-950">
              {meta.title}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">{meta.desc}</p>

            <QuotaStatusBar
              tier={tier}
              onChangeTier={setTier}
              refreshTrigger={quotaRefresh}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            {currentTab === "paraphrase" && (
              <ParaphraseStreamPanel
                tier={tier}
                onQuotaUpdated={() => setQuotaRefresh((n) => n + 1)}
              />
            )}
            {currentTab === "pdf" && (
              <PdfSummaryStreamPanel
                tier={tier}
                onQuotaUpdated={() => setQuotaRefresh((n) => n + 1)}
              />
            )}
            {currentTab === "citation" && <CitationExtractPanel />}
            {currentTab === "workspace" && <WorkspacePanel />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AiStreamTestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          로딩 중...
        </div>
      }
    >
      <WorkbenchContent />
    </Suspense>
  );
}
