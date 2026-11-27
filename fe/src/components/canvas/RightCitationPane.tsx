"use client";

import { useState } from "react";

export interface CitationItem {
  source: string;
  doiVerified: boolean;
  type: string;
  title: string;
  authors: string[];
  containerTitle?: string;
  issuedYear?: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url: string;
  apaPreview: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function buildInTextCitation(item: CitationItem): string {
  const year = item.issuedYear ?? "n.d.";
  if (!item.authors || item.authors.length === 0) {
    return `(${item.title.slice(0, 24)}, ${year})`;
  }
  const firstLastName = item.authors[0].split(",")[0].trim();
  if (item.authors.length === 1) return `(${firstLastName}, ${year})`;
  if (item.authors.length === 2) {
    const secondLastName = item.authors[1].split(",")[0].trim();
    return `(${firstLastName} & ${secondLastName}, ${year})`;
  }
  return `(${firstLastName} et al., ${year})`;
}

export function RightCitationPane({
  onInsertInText,
  onAppendReference,
}: {
  onInsertInText: (inText: string) => void;
  onAppendReference: (fullCitation: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<CitationItem[]>([]);

  const handleExtract = async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v2/ai/citation/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error(`인용 추출 실패 (HTTP ${res.status})`);
      const data = (await res.json()) as CitationItem;
      setLibrary((prev) => [data, ...prev]);
      setUrl("");
    } catch (err) {
      setError((err as Error).message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="flex h-full flex-col rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">3. 인용 서랍</h2>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            Zotero + Crossref
          </span>
        </div>

        <div className="mt-2.5 flex gap-1.5">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleExtract();
            }}
            placeholder="DOI, arXiv, 논문 URL 입력..."
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleExtract()}
            disabled={!url.trim() || loading}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {loading ? "..." : "추가"}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {library.length === 0 ? (
          <p className="px-1 py-4 text-xs leading-relaxed text-slate-400">
            논문 URL을 추가하면 여기에 참고문헌이 쌓입니다. 클릭 한 번으로 본문 내 인용{" "}
            <code>(LeCun et al., 2015)</code>과 하단 참고문헌 목록을 바로 삽입할 수 있습니다.
          </p>
        ) : (
          library.map((item, idx) => (
            <div
              key={`${item.url}-${idx}`}
              className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  {item.source}
                </span>
                {item.doiVerified && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    DOI 검증됨
                  </span>
                )}
              </div>

              <div className="font-semibold text-slate-900 line-clamp-2">{item.title}</div>
              <div className="text-[11px] text-slate-500">
                {item.authors.slice(0, 2).join("; ")}
                {item.authors.length > 2 ? " et al." : ""} ({item.issuedYear ?? "n.d."})
              </div>

              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onInsertInText(` ${buildInTextCitation(item)}`)}
                  className="flex-1 rounded bg-blue-600 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                >
                  본문 인용 삽입
                </button>
                <button
                  type="button"
                  onClick={() => onAppendReference(item.apaPreview)}
                  className="flex-1 rounded border border-slate-300 bg-white py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                >
                  참고문헌 추가
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
