"use client";

import { useEffect, useState } from "react";

export type PlanTier = "FREE" | "PRO";

interface QuotaStatus {
  memberId: string;
  tier: string;
  usedCredits: number;
  monthlyLimit: number;
  remainingCredits: number;
  premiumModelAllowed: boolean;
  pdfSummaryAllowed: boolean;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function QuotaStatusBar({
  tier,
  onChangeTier,
  refreshTrigger,
}: {
  tier: PlanTier;
  onChangeTier: (t: PlanTier) => void;
  refreshTrigger: number;
}) {
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  const loadQuota = async (targetTier: PlanTier) => {
    try {
      const res = await fetch(`${API_BASE}/api/v2/ai/quota`, {
        headers: { "X-Plan-Tier": targetTier },
      });
      if (res.ok) {
        setQuota((await res.json()) as QuotaStatus);
      }
    } catch {
      // ignore network error in status bar
    }
  };

  useEffect(() => {
    void loadQuota(tier);
  }, [tier, refreshTrigger]);

  const handleReset = async () => {
    const res = await fetch(`${API_BASE}/api/v2/ai/quota/reset`, {
      method: "POST",
      headers: { "X-Plan-Tier": tier },
    });
    if (res.ok) {
      setQuota((await res.json()) as QuotaStatus);
    }
  };

  const pct = quota
    ? Math.min(100, Math.round((quota.usedCredits / quota.monthlyLimit) * 100))
    : 0;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-700">테스트 요금제:</span>
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
          {(["FREE", "PRO"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChangeTier(t)}
              className={`rounded px-2.5 py-1 font-semibold transition ${
                tier === t
                  ? t === "PRO"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-slate-500">
          {tier === "FREE"
            ? "경량 모델(Haiku) 강제 · PDF 제한"
            : "주력 모델(Sonnet) · PDF 요약 허용"}
        </span>
      </div>

      {quota && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">
              월간 크레딧{" "}
              <strong className="text-slate-900">
                {quota.usedCredits} / {quota.monthlyLimit}
              </strong>
            </span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all ${
                  pct > 85 ? "bg-red-500" : "bg-blue-600"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleReset()}
            className="text-slate-500 underline hover:text-slate-800"
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
}
