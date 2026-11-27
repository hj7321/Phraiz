const STORAGE_ID_KEY = "phraiz_workspace_id";
const STORAGE_NICKNAME_KEY = "phraiz_workspace_nickname";
export const WORKSPACE_CHANGED_EVENT = "phraiz:workspace-changed";

export interface WorkspaceProfile {
  memberId: string;
  nickname: string;
  isCustom: boolean;
}

function generateGuestId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `guest-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `guest-${Math.random().toString(36).slice(2, 10)}`;
}

export function getWorkspaceMemberId(): string {
  if (typeof window === "undefined") return "local-dev";
  let id = window.localStorage.getItem(STORAGE_ID_KEY);
  if (!id || !id.trim()) {
    id = generateGuestId();
    window.localStorage.setItem(STORAGE_ID_KEY, id);
  }
  return id;
}

export function getWorkspaceProfile(): WorkspaceProfile {
  if (typeof window === "undefined") {
    return { memberId: "local-dev", nickname: "", isCustom: false };
  }
  const memberId = getWorkspaceMemberId();
  const nickname = window.localStorage.getItem(STORAGE_NICKNAME_KEY) ?? "";
  return {
    memberId,
    nickname,
    isCustom: !memberId.startsWith("guest-"),
  };
}

export function saveWorkspaceProfile(params: {
  nickname?: string;
  workspaceCode?: string;
}): WorkspaceProfile {
  if (typeof window === "undefined") {
    return { memberId: "local-dev", nickname: "", isCustom: false };
  }
  const trimmedCode = (params.workspaceCode ?? "").trim();
  const trimmedNick = (params.nickname ?? "").trim();

  if (trimmedCode) {
    const safeCode = trimmedCode
      .replace(/[^a-zA-Z0-9가-힣_-]/g, "")
      .slice(0, 32);
    if (safeCode) {
      window.localStorage.setItem(STORAGE_ID_KEY, `ws-${safeCode}`);
    }
  }
  if (trimmedNick) {
    window.localStorage.setItem(STORAGE_NICKNAME_KEY, trimmedNick.slice(0, 20));
  } else {
    window.localStorage.removeItem(STORAGE_NICKNAME_KEY);
  }

  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED_EVENT));
  return getWorkspaceProfile();
}

export function resetToNewGuestWorkspace(): WorkspaceProfile {
  if (typeof window === "undefined") {
    return { memberId: "local-dev", nickname: "", isCustom: false };
  }
  const nextId = generateGuestId();
  window.localStorage.setItem(STORAGE_ID_KEY, nextId);
  window.localStorage.removeItem(STORAGE_NICKNAME_KEY);
  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED_EVENT));
  return getWorkspaceProfile();
}
