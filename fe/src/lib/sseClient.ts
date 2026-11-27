export interface StreamMeta {
  model: string;
  latencyMs: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
}

export interface PostSseOptions<TBody> {
  url: string;
  body: TBody;
  accessToken?: string;
  extraHeaders?: Record<string, string>;
  signal?: AbortSignal;
  onDelta: (token: string) => void;
  onDone?: (meta: StreamMeta) => void;
  onError?: (message: string) => void;
}

export async function streamPostSse<TBody>({
  url,
  body,
  accessToken,
  extraHeaders,
  signal,
  onDelta,
  onDone,
  onError,
}: PostSseOptions<TBody>): Promise<void> {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    ...(extraHeaders ?? {}),
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      credentials: "include",
      body: isFormData ? (body as unknown as FormData) : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    const msg =
      "백엔드 서버(localhost:8080)에 연결할 수 없습니다. Spring Boot 서버가 실행 중인지 확인해 주세요.";
    onError?.(msg);
    throw new Error(msg);
  }

  if (!response.ok || !response.body) {
    let fallback = `요청 처리에 실패했습니다 (HTTP ${response.status}). 잠시 후 다시 시도해 주세요.`;
    if (response.status === 402) {
      fallback =
        "PDF 네이티브 요약은 PRO 요금제 전용 기능입니다. 상단에서 PRO 요금제로 전환해 이용해 주세요.";
    } else if (response.status === 429) {
      fallback =
        "이번 달 크레딧 한도를 모두 사용했습니다. 상단에서 크레딧을 초기화하거나 요금제를 업그레이드해 주세요.";
    } else if (response.status === 413) {
      fallback =
        "PDF 파일 크기가 너무 큽니다. 20MB 이하의 파일을 업로드해 주세요.";
    }

    try {
      const errJson = await response.json();
      if (
        errJson?.message &&
        response.status !== 402 &&
        response.status !== 429
      ) {
        fallback = errJson.message;
      }
    } catch {
      // ignore non-json error body
    }
    onError?.(fallback);
    throw new Error(fallback);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        if (!block.trim()) continue;

        let eventName = "message";
        const dataLines: string[] = [];

        for (const rawLine of block.split("\n")) {
          const line = rawLine.trimEnd();
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const rawData = dataLines.join("\n");
        if (!rawData) continue;

        const parsed = JSON.parse(rawData);
        if (eventName === "delta" && typeof parsed.content === "string") {
          onDelta(parsed.content);
        } else if (eventName === "done") {
          onDone?.(parsed as StreamMeta);
        } else if (eventName === "error") {
          const msg = parsed.message ?? "스트리밍 중 오류가 발생했습니다.";
          onError?.(msg);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
