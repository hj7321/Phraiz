"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { saveWorkspaceHistory } from "@/lib/workspaceApi";

interface CitationMetadata {
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

type CitationStyle = "APA" | "MLA" | "Chicago" | "IEEE" | "BibTeX";

const STYLES: CitationStyle[] = ["APA", "MLA", "Chicago", "IEEE", "BibTeX"];

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const SOURCE_LABELS: Record<string, string> = {
  ZOTERO: "Zotero 무료 추출",
  ZOTERO_CROSSREF: "Zotero + Crossref 공식 검증",
  CROSSREF: "Crossref 공식 검증",
  LLM_FALLBACK: "LLM 구조화 폴백",
};

function formatCitation(meta: CitationMetadata, style: CitationStyle): string {
  const authors = meta.authors ?? [];
  const link = meta.doi ? `https://doi.org/${meta.doi}` : meta.url;

  switch (style) {
    case "APA":
      return meta.apaPreview;

    case "MLA": {
      const authorPart =
        authors.length === 0
          ? ""
          : authors.length === 1
            ? `${authors[0]}. `
            : authors.length === 2
              ? `${authors[0]}, and ${authors[1]}. `
              : `${authors[0]}, et al. `;
      const container = meta.containerTitle ? `${meta.containerTitle}` : "";
      const vol = meta.volume ? `, vol. ${meta.volume}` : "";
      const num = meta.issue ? `, no. ${meta.issue}` : "";
      const yr = meta.issuedYear ? `, ${meta.issuedYear}` : "";
      const pp = meta.pages ? `, pp. ${meta.pages}` : "";
      const mid = container
        ? `${container}${vol}${num}${yr}${pp}. `
        : yr
          ? `${meta.issuedYear}. `
          : "";
      return `${authorPart}"${meta.title}." ${mid}${link}`.trim();
    }

    case "Chicago": {
      const authorPart = authors.length > 0 ? `${authors.join(", ")}. ` : "";
      const container = meta.containerTitle ? `${meta.containerTitle} ` : "";
      const volIssue = meta.volume
        ? `${meta.volume}${meta.issue ? `, no. ${meta.issue}` : ""} `
        : "";
      const yr = meta.issuedYear ? `(${meta.issuedYear})` : "(n.d.)";
      const pp = meta.pages ? `: ${meta.pages}` : "";
      return `${authorPart}"${meta.title}." ${container}${volIssue}${yr}${pp}. ${link}`.trim();
    }

    case "IEEE": {
      const authorPart =
        authors.length === 0
          ? ""
          : authors.length <= 3
            ? `${authors.join(", ")}, `
            : `${authors[0]} et al., `;
      const container = meta.containerTitle ? `${meta.containerTitle}, ` : "";
      const vol = meta.volume ? `vol. ${meta.volume}, ` : "";
      const num = meta.issue ? `no. ${meta.issue}, ` : "";
      const pp = meta.pages ? `pp. ${meta.pages}, ` : "";
      const yr = meta.issuedYear ? `${meta.issuedYear}. ` : "";
      const doiPart = meta.doi
        ? `doi: ${meta.doi}.`
        : `[Online]. Available: ${meta.url}`;
      return `[1] ${authorPart}"${meta.title}," ${container}${vol}${num}${pp}${yr}${doiPart}`.trim();
    }

    case "BibTeX": {
      const entryType =
        meta.type === "article-journal"
          ? "article"
          : meta.type === "paper-conference"
            ? "inproceedings"
            : meta.type === "book"
              ? "book"
              : "misc";
      const firstAuthorSlug =
        (authors[0] ?? "ref")
          .split(/[,\s]+/)[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "ref";
      const citeKey = `${firstAuthorSlug}${meta.issuedYear ?? "nd"}`;
      const lines = [`@${entryType}{${citeKey},`, `  title = {${meta.title}},`];
      if (authors.length > 0)
        lines.push(`  author = {${authors.join(" and ")}},`);
      if (meta.containerTitle) {
        const field = entryType === "article" ? "journal" : "howpublished";
        lines.push(`  ${field} = {${meta.containerTitle}},`);
      }
      if (meta.issuedYear) lines.push(`  year = {${meta.issuedYear}},`);
      if (meta.volume) lines.push(`  volume = {${meta.volume}},`);
      if (meta.issue) lines.push(`  number = {${meta.issue}},`);
      if (meta.pages) lines.push(`  pages = {${meta.pages}},`);
      if (meta.doi) lines.push(`  doi = {${meta.doi}},`);
      lines.push(`  url = {${meta.url}}`);
      lines.push("}");
      return lines.join("\n");
    }
  }
}

export function CitationExtractPanel() {
  const searchParams = useSearchParams();
  const itemIdParam = searchParams.get("itemId");

  const [url, setUrl] = useState("");
  const [style, setStyle] = useState<CitationStyle>("APA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CitationMetadata | null>(null);
  const [copied, setCopied] = useState(false);

  const formatted = useMemo(() => {
    if (!result) return "";
    return formatCitation(result, style);
  }, [result, style]);

  const extractByUrl = useCallback(
    async (targetUrl: string, shouldSaveHistory: boolean) => {
      if (!targetUrl.trim()) return;
      setLoading(true);
      setError(null);
      setResult(null);
      setCopied(false);

      try {
        const res = await fetch(`${API_BASE}/api/v2/ai/citation/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl.trim() }),
        });
        if (!res.ok) {
          throw new Error(`인용 추출 실패 (HTTP ${res.status})`);
        }
        const data = (await res.json()) as CitationMetadata;
        setResult(data);
        if (shouldSaveHistory) {
          void saveWorkspaceHistory({
            itemType: "CITATION",
            title: data.title,
            inputPayload: targetUrl.trim(),
            outputPayload: formatCitation(data, style),
            modelUsed: data.source,
          });
        }
      } catch (err) {
        setError((err as Error).message || "오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [style],
  );

  // 히스토리에서 인용 항목 클릭 시 URL 복원 + 중복 저장 없이 메타데이터 재조회
  useEffect(() => {
    if (!itemIdParam) return;
    fetch(`${API_BASE}/api/v2/workspace/items?type=CITATION`)
      .then((r) => (r.ok ? r.json() : []))
      .then((items: Array<{ id: number; inputPayload: string }>) => {
        const found = items.find((it) => String(it.id) === itemIdParam);
        if (found?.inputPayload) {
          setUrl(found.inputPayload);
          void extractByUrl(found.inputPayload, false);
        }
      })
      .catch(() => {});
  }, [itemIdParam]);

  const handleExtract = () => {
    if (!url.trim() || loading) return;
    void extractByUrl(url, true);
  };

  const handleCopy = async () => {
    if (!formatted) return;
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="w-full space-y-5 p-6">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="논문(DOI 포함 URL, DBpia, arXiv 등) 또는 웹페이지 URL 입력..."
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleExtract}
          disabled={!url.trim() || loading}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "추출 중..." : "인용 추출"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-slate-500">
          인용 형식:
        </span>
        {STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStyle(s);
              setCopied(false);
            }}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              style === s
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
              {SOURCE_LABELS[result.source] ?? result.source}
            </span>
            {result.doiVerified && (
              <span className="rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">
                DOI 실존 검증 완료
              </span>
            )}
          </div>

          <div className="space-y-1 text-sm text-slate-700">
            <div className="text-base font-bold text-slate-900">
              {result.title}
            </div>
            {result.authors.length > 0 && (
              <div>저자: {result.authors.join("; ")}</div>
            )}
            <div>
              출처: {result.containerTitle ?? "-"} (
              {result.issuedYear ?? "연도 미상"})
              {result.doi ? ` · DOI: ${result.doi}` : ""}
            </div>
          </div>

          <div className="rounded-md bg-slate-50 p-3.5 text-sm text-slate-900">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {style} 형식 미리보기
              </span>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {copied ? "복사됨!" : "인용문 복사"}
              </button>
            </div>
            {style === "BibTeX" ? (
              <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-slate-800">
                {formatted}
              </pre>
            ) : (
              <p className="leading-relaxed">{formatted}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
