"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HelpModal } from "./HelpModal";
import { HistoryDrawer, type HistoryItem } from "./HistoryDrawer";

const NAV_ITEMS = [
  { href: "/workspace", label: "통합 캔버스", path: "/workspace", tab: null },
  {
    href: "/ai-stream-test?tab=paraphrase",
    label: "패러프레이징",
    path: "/ai-stream-test",
    tab: "paraphrase",
  },
  {
    href: "/ai-stream-test?tab=pdf",
    label: "PDF 요약",
    path: "/ai-stream-test",
    tab: "pdf",
  },
  {
    href: "/ai-stream-test?tab=citation",
    label: "인용 생성",
    path: "/ai-stream-test",
    tab: "citation",
  },
];

function HeaderNavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "paraphrase";

  return (
    <nav className="hidden items-center gap-1 rounded-xl bg-slate-100/80 p-1 md:flex">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.path === "/workspace"
            ? pathname === "/workspace"
            : pathname === "/ai-stream-test" && activeTab === item.tab;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isActive
                ? "bg-white text-violet-700 shadow-xs"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PhraizAppHeader({
  onLoadHistoryItem,
}: {
  onLoadHistoryItem?: (item: HistoryItem) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
            >
              ☰ 히스토리
            </button>

            <Link href="/" className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-600" />
              <span className="text-base font-bold tracking-tight text-slate-950">
                Phraiz
              </span>
            </Link>
          </div>

          <Suspense fallback={null}>
            <HeaderNavLinks />
          </Suspense>

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700"
          >
            ? 도움말
          </button>
        </div>
      </header>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectItem={onLoadHistoryItem}
      />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
