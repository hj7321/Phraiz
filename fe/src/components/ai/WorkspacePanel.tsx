"use client";

import { useEffect, useState } from "react";

type ItemType = "PARAPHRASE" | "SUMMARY" | "CITATION";

interface Folder {
  id: number;
  name: string;
  itemCount: number;
  createdAt: string;
}

interface WorkspaceItem {
  id: number;
  folderId: number | null;
  itemType: ItemType;
  title: string;
  inputPayload: string;
  outputPayload: string;
  modelUsed?: string;
  tokensUsed?: number;
  createdAt: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const TYPE_BADGE: Record<ItemType, string> = {
  PARAPHRASE: "bg-blue-100 text-blue-800",
  SUMMARY: "bg-teal-100 text-teal-800",
  CITATION: "bg-amber-100 text-amber-800",
};

export function WorkspacePanel() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<ItemType | "ALL">("ALL");
  const [newFolderName, setNewFolderName] = useState("");
  const [sampleTitle, setSampleTitle] = useState("");
  const [sampleType, setSampleType] = useState<ItemType>("PARAPHRASE");
  const [sampleOutput, setSampleOutput] = useState("");

  const fetchAll = async () => {
    const [fRes, iRes] = await Promise.all([
      fetch(`${API_BASE}/api/v2/workspace/folders`),
      fetch(
        `${API_BASE}/api/v2/workspace/items?${new URLSearchParams({
          ...(selectedFolderId ? { folderId: String(selectedFolderId) } : {}),
          ...(filterType !== "ALL" ? { type: filterType } : {}),
        }).toString()}`,
      ),
    ]);
    if (fRes.ok) setFolders((await fRes.json()) as Folder[]);
    if (iRes.ok) setItems((await iRes.json()) as WorkspaceItem[]);
  };

  useEffect(() => {
    void fetchAll();
  }, [selectedFolderId, filterType]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await fetch(`${API_BASE}/api/v2/workspace/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });
    setNewFolderName("");
    void fetchAll();
  };

  const handleSaveSample = async () => {
    if (!sampleTitle.trim() || !sampleOutput.trim()) return;
    await fetch(`${API_BASE}/api/v2/workspace/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folderId: selectedFolderId,
        itemType: sampleType,
        title: sampleTitle.trim(),
        inputPayload: "(테스트 입력)",
        outputPayload: sampleOutput.trim(),
        modelUsed: "manual-save",
      }),
    });
    setSampleTitle("");
    setSampleOutput("");
    void fetchAll();
  };

  const handleDeleteItem = async (id: number) => {
    await fetch(`${API_BASE}/api/v2/workspace/items/${id}`, {
      method: "DELETE",
    });
    void fetchAll();
  };

  return (
    <div className="grid w-full grid-cols-1 gap-6 p-6 md:grid-cols-12">
      {/* 좌측: 통합 폴더 사이드바 */}
      <div className="space-y-4 md:col-span-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="새 프로젝트 폴더명..."
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleCreateFolder()}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            추가
          </button>
        </div>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
              selectedFolderId === null
                ? "bg-blue-50 font-semibold text-blue-700"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>전체 작업물</span>
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFolderId(f.id)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                selectedFolderId === f.id
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="truncate">{f.name}</span>
              <span className="text-xs text-slate-400">{f.itemCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 우측: 통합 작업물 저장 테스트 & 목록 */}
      <div className="space-y-5 md:col-span-8">
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-600">
            단일 테이블(`workspace_items`) 빠른 저장 테스트
          </div>
          <div className="flex gap-2">
            <select
              value={sampleType}
              onChange={(e) => setSampleType(e.target.value as ItemType)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
            >
              <option value="PARAPHRASE">패러프레이징</option>
              <option value="SUMMARY">PDF 요약</option>
              <option value="CITATION">인용</option>
            </select>
            <input
              type="text"
              value={sampleTitle}
              onChange={(e) => setSampleTitle(e.target.value)}
              placeholder="작업물 제목..."
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
            />
          </div>
          <textarea
            value={sampleOutput}
            onChange={(e) => setSampleOutput(e.target.value)}
            placeholder="저장할 결과 내용..."
            rows={2}
            className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSaveSample()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              현재 폴더에 저장
            </button>
          </div>
        </div>

        {/* 타입 필터 */}
        <div className="flex gap-2">
          {(["ALL", "PARAPHRASE", "SUMMARY", "CITATION"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                filterType === t
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 작업물 목록 */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              저장된 작업물이 없습니다. 위에서 하나 저장해 보세요.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-white p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[item.itemType]}`}
                    >
                      {item.itemType}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {item.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteItem(item.id)}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    삭제
                  </button>
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-slate-600">
                  {item.outputPayload}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
