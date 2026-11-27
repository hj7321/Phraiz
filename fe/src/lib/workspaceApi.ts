const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function saveWorkspaceHistory(params: {
  itemType: "PARAPHRASE" | "SUMMARY" | "CITATION";
  title: string;
  inputPayload: string;
  outputPayload: string;
  modelUsed?: string;
  tokensUsed?: number;
}) {
  try {
    await fetch(`${API_BASE}/api/v2/workspace/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    // 히스토리 자동 저장 실패 시 메인 UX는 막지 않음
  }
}
