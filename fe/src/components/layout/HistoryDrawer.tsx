"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ItemType = "PARAPHRASE" | "SUMMARY" | "CITATION";

interface Folder {
  id: number;
  name: string;
  itemCount: number;
}

export interface HistoryItem {
  id: number;
  folderId: number | null;
  itemType: ItemType;
  title: string;
  inputPayload?: string;
  outputPayload: string;
  modelUsed?: string;
  createdAt: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function getBadgeInfo(item: HistoryItem): {
  label: string;
  style: string;
  actionLabel: string;
  targetUrl: string;
} {
  if (item.modelUsed === "unified-canvas") {
    return {
      label: "통합 캔버스",
      style: "bg-violet-50 text-violet-700",
      actionLabel: "통합 캔버스에서 열기 →",
      targetUrl: `/workspace?itemId=${item.id}`,
    };
  }
  switch (item.itemType) {
    case "SUMMARY":
      return {
        label: "PDF 요약",
        style: "bg-teal-50 text-teal-700",
        actionLabel: "PDF 요약에서 열기 →",
        targetUrl: `/ai-stream-test?tab=pdf&itemId=${item.id}`,
      };
    case "CITATION":
      return {
        label: "인용",
        style: "bg-amber-50 text-amber-800",
        actionLabel: "인용 생성에서 열기 →",
        targetUrl: `/ai-stream-test?tab=citation&itemId=${item.id}`,
      };
    default:
      return {
        label: "패러프레이징",
        style: "bg-blue-50 text-blue-700",
        actionLabel: "패러프레이징에서 열기 →",
        targetUrl: `/ai-stream-test?tab=paraphrase&itemId=${item.id}`,
      };
  }
}

export function HistoryDrawer({
  open,
  onClose,
  onSelectItem,
}: {
  open: boolean;
  onClose: () => void;
  onSelectItem?: (item: HistoryItem) => void;
}) {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [newFolder, setNewFolder] = useState("");

  const loadData = async () => {
    try {
      const [fRes, iRes] = await Promise.all([
        fetch(`${API_BASE}/api/v2/workspace/folders`),
        fetch(
          `${API_BASE}/api/v2/workspace/items${folderId ? `?folderId=${folderId}` : ""}`,
        ),
      ]);
      if (fRes.ok) setFolders((await fRes.json()) as Folder[]);
      if (iRes.ok) setItems((await iRes.json()) as HistoryItem[]);
    } catch {
      // ignore if backend offline
    }
  };

  useEffect(() => {
    if (open) void loadData();
  }, [open, folderId]);

  const handleAddFolder = async () => {
    if (!newFolder.trim()) return;
    await fetch(`${API_BASE}/api/v2/workspace/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolder.trim() }),
    });
    setNewFolder("");
    void loadData();
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_BASE}/api/v2/workspace/items/${id}`, {
      method: "DELETE",
    });
    void loadData();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex bg-slate-950/30 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-80 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <span className="text-sm font-bold text-slate-950">
            히스토리 · 프로젝트 폴더
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-100 p-3">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddFolder();
              }}
              placeholder="새 폴더 이름..."
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-violet-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleAddFolder()}
              className="rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
            >
              추가
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFolderId(null)}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                folderId === null
                  ? "bg-violet-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              전체
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFolderId(f.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                  folderId === f.id
                    ? "bg-violet-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.name} ({f.itemCount})
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {items.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">
              저장된 히스토리가 없습니다.
            </p>
          ) : (
            items.map((item) => {
              const badge = getBadgeInfo(item);
              const isCanvasOnCanvasPage =
                onSelectItem && item.modelUsed === "unified-canvas";

              return (
                <div
                  key={item.id}
                  className="group rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 transition hover:border-violet-300 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.style}`}
                    >
                      {badge.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="text-[11px] text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="mt-1.5 text-xs font-bold text-slate-900 line-clamp-1">
                    {item.title}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                    {item.outputPayload}
                  </p>
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCanvasOnCanvasPage) {
                          onSelectItem(item);
                        } else {
                          router.push(badge.targetUrl);
                        }
                        onClose();
                      }}
                      className="text-[11px] font-semibold text-violet-700 hover:underline"
                    >
                      {badge.actionLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard.writeText(item.outputPayload)
                      }
                      className="text-[11px] text-slate-500 hover:text-slate-900"
                    >
                      복사
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
