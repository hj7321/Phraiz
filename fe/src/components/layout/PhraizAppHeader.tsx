"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getWorkspaceProfile,
  resetToNewGuestWorkspace,
  saveWorkspaceProfile,
  WORKSPACE_CHANGED_EVENT,
  type WorkspaceProfile,
} from "@/lib/guestSession";
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<WorkspaceProfile>({
    memberId: "",
    nickname: "",
    isCustom: false,
  });
  const [nicknameInput, setNicknameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sync = () => {
      const current = getWorkspaceProfile();
      setProfile(current);
    };
    sync();
    window.addEventListener(WORKSPACE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, sync);
  }, []);

  const openProfileModal = () => {
    const current = getWorkspaceProfile();
    setProfile(current);
    setNicknameInput(current.nickname);
    setCodeInput(current.memberId.replace(/^ws-/, ""));
    setCopied(false);
    setProfileOpen(true);
  };

  const handleSaveProfile = () => {
    const updated = saveWorkspaceProfile({
      nickname: nicknameInput,
      workspaceCode: codeInput,
    });
    setProfile(updated);
    setProfileOpen(false);
  };

  const handleResetGuest = () => {
    const updated = resetToNewGuestWorkspace();
    setProfile(updated);
    setNicknameInput("");
    setCodeInput(updated.memberId);
  };

  const handleCopyId = async () => {
    if (!profile.memberId) return;
    await navigator.clipboard.writeText(profile.memberId.replace(/^ws-/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const displayLabel = profile.nickname
    ? profile.nickname
    : profile.memberId
      ? "내 워크스페이스"
      : "게스트";

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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openProfileModal}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50/60 hover:text-violet-700"
              title="닉네임 및 워크스페이스 코드 설정"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{displayLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700"
            >
              ? 도움말
            </button>
          </div>
        </div>
      </header>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectItem={onLoadHistoryItem}
      />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  내 워크스페이스 설정
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  로그인 없이도 브라우저별 고유 ID로 히스토리가 자동
                  분리·유지됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  표시 닉네임 (선택)
                </label>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="예: 현진"
                  maxLength={20}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    워크스페이스 코드 (다른 기기 이어보기용)
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleCopyId()}
                    className="text-[11px] font-medium text-violet-600 hover:underline"
                  >
                    {copied ? "복사됨!" : "현재 코드 복사"}
                  </button>
                </div>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="영문·숫자 조합 (예: hj-paper-2026)"
                  maxLength={32}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-violet-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  추측하기 어려운 나만의 코드를 쓰면 다른 기기에서도 같은
                  히스토리를 불러올 수 있습니다.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetGuest}
                className="text-xs text-slate-500 underline hover:text-slate-800"
              >
                새 익명 워크스페이스 만들기
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
