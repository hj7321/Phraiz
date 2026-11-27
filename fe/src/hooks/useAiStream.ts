"use client";

import { useCallback, useRef, useState } from "react";
import { streamPostSse, type StreamMeta } from "@/lib/sseClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function useAiStream<TRequest>(endpointPath: string) {
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<StreamMeta | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setOutput("");
    setError(null);
    setMeta(null);
  }, [stop]);

  const start = useCallback(
    async (
      payload: TRequest,
      accessToken?: string,
      extraHeaders?: Record<string, string>,
      onComplete?: () => void
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setOutput("");
      setError(null);
      setMeta(null);
      setIsStreaming(true);

      try {
        await streamPostSse<TRequest>({
          url: `${API_BASE}${endpointPath}`,
          body: payload,
          accessToken,
          extraHeaders,
          signal: controller.signal,
          onDelta: (token) => setOutput((prev) => prev + token),
          onDone: (streamMeta) => {
            setMeta(streamMeta);
            onComplete?.();
          },
          onError: (msg) => setError(msg),
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message || "네트워크 오류가 발생했습니다.");
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsStreaming(false);
      }
    },
    [endpointPath]
  );

  return { output, isStreaming, error, meta, start, stop, reset };
}
