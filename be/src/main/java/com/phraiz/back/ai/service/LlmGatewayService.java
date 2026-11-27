package com.phraiz.back.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phraiz.back.ai.config.LlmGatewayProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class LlmGatewayService {

    private static final Logger log = LoggerFactory.getLogger(LlmGatewayService.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final LlmGatewayProperties properties;
    private final Executor streamExecutor;

    public LlmGatewayService(
            HttpClient llmHttpClient,
            ObjectMapper objectMapper,
            LlmGatewayProperties properties,
            @Qualifier("llmStreamExecutor") Executor streamExecutor
    ) {
        this.httpClient = llmHttpClient;
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.streamExecutor = streamExecutor;
    }

    /**
     * 일반 텍스트 스트리밍 (패러프레이징, 텍스트 요약)
     */
    public SseEmitter streamChatCompletion(
            String modelAlias,
            String systemPrompt,
            String userText
    ) {
        Map<String, Object> payload = Map.of(
                "model", modelAlias,
                "stream", true,
                "stream_options", Map.of("include_usage", true),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userText)
                )
        );
        return executeSse(modelAlias, payload);
    }

    /**
     * Gemini 네이티브 PDF 멀티모달 스트리밍 (PDFBox 없이 PDF 바이너리를 직접 전달)
     */
    public SseEmitter streamPdfSummary(
            String modelAlias,
            String systemPrompt,
            byte[] pdfBytes,
            String filename
    ) {
        String base64Pdf = Base64.getEncoder().encodeToString(pdfBytes);
        String dataUri = "data:application/pdf;base64," + base64Pdf;

        List<Map<String, Object>> userContent = List.of(
                Map.of(
                        "type", "text",
                        "text", "첨부된 PDF 문서(" + (filename != null ? filename : "document.pdf")
                                + ")의 본문, 표, 수식, 그래프를 종합하여 요청된 형식으로 정확히 요약해 주세요."
                ),
                Map.of(
                        "type", "file",
                        "file", Map.of(
                                "filename", filename != null ? filename : "document.pdf",
                                "file_data", dataUri
                        )
                )
        );

        Map<String, Object> payload = Map.of(
                "model", modelAlias,
                "stream", true,
                "stream_options", Map.of("include_usage", true),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userContent)
                )
        );
        return executeSse(modelAlias, payload);
    }

    /**
     * 동기 JSON 구조화 호출 (인용 메타데이터 폴백 추출 전용)
     */
    public JsonNode completeJson(String modelAlias, String systemPrompt, String userContent)
            throws IOException, InterruptedException {
        Map<String, Object> payload = Map.of(
                "model", modelAlias,
                "stream", false,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userContent)
                )
        );

        String baseUrl = properties.baseUrl().replaceAll("/+$", "");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/chat/completions"))
                .timeout(Duration.ofSeconds(45))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + properties.apiKey())
                .POST(HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(payload),
                        StandardCharsets.UTF_8
                ))
                .build();

        HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
        );

        if (response.statusCode() >= 400) {
            throw new IOException("LLM JSON fallback error " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String rawContent = root.path("choices").path(0).path("message").path("content").asText("{}");
        // 혹시 마크다운 코드펜스가 감싸져 있을 경우 방어적으로 제거
        String cleaned = rawContent
                .replaceAll("^```json\s*", "")
                .replaceAll("^```\s*", "")
                .replaceAll("\s*```$", "")
                .trim();
        return objectMapper.readTree(cleaned);
    }

    private SseEmitter executeSse(String modelAlias, Map<String, Object> payload) {
        long timeoutMs = Math.max(60, properties.timeoutSeconds()) * 1000L;
        SseEmitter emitter = new SseEmitter(timeoutMs);
        AtomicBoolean cancelled = new AtomicBoolean(false);

        emitter.onCompletion(() -> cancelled.set(true));
        emitter.onTimeout(() -> {
            cancelled.set(true);
            emitter.complete();
        });
        emitter.onError(ex -> cancelled.set(true));

        streamExecutor.execute(() -> runStreamingCall(emitter, cancelled, modelAlias, payload));
        return emitter;
    }

    private void runStreamingCall(
            SseEmitter emitter,
            AtomicBoolean cancelled,
            String modelAlias,
            Map<String, Object> payload
    ) {
        long startTime = System.currentTimeMillis();
        try {
            String baseUrl = properties.baseUrl().replaceAll("/+$", "");
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/chat/completions"))
                    .timeout(Duration.ofSeconds(Math.max(60, properties.timeoutSeconds())))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + properties.apiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(
                            objectMapper.writeValueAsString(payload),
                            StandardCharsets.UTF_8
                    ))
                    .build();

            HttpResponse<InputStream> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofInputStream()
            );

            if (response.statusCode() >= 400) {
                String errorBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
                log.error("LLM Gateway error {}: {}", response.statusCode(), errorBody);
                sendErrorEvent(emitter, "LLM 게이트웨이 호출 실패 (HTTP " + response.statusCode() + ")");
                emitter.complete();
                return;
            }

            JsonNode lastUsage = null;
            String resolvedModel = modelAlias;

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null && !cancelled.get()) {
                    if (!line.startsWith("data:")) {
                        continue;
                    }
                    String data = line.substring(5).trim();
                    if (data.isEmpty()) {
                        continue;
                    }
                    if ("[DONE]".equals(data)) {
                        break;
                    }

                    JsonNode chunk = objectMapper.readTree(data);
                    if (chunk.hasNonNull("model")) {
                        resolvedModel = chunk.get("model").asText();
                    }
                    if (chunk.hasNonNull("usage")) {
                        lastUsage = chunk.get("usage");
                    }

                    JsonNode choices = chunk.path("choices");
                    if (choices.isArray() && !choices.isEmpty()) {
                        JsonNode contentNode = choices.get(0).path("delta").path("content");
                        if (!contentNode.isMissingNode() && !contentNode.isNull()) {
                            String token = contentNode.asText();
                            if (!token.isEmpty()) {
                                emitter.send(SseEmitter.event()
                                        .name("delta")
                                        .data(Map.of("content", token)));
                            }
                        }
                    }
                }
            }

            if (!cancelled.get()) {
                long latencyMs = System.currentTimeMillis() - startTime;
                Map<String, Object> donePayload = Map.of(
                        "model", resolvedModel,
                        "latencyMs", latencyMs,
                        "usage", lastUsage != null ? lastUsage : Map.of()
                );
                emitter.send(SseEmitter.event().name("done").data(donePayload));
                emitter.complete();
            }
        } catch (IOException ex) {
            if (!cancelled.get()) {
                log.warn("SSE stream interrupted: {}", ex.getMessage());
                emitter.completeWithError(ex);
            }
        } catch (Exception ex) {
            log.error("Unexpected LLM streaming error", ex);
            sendErrorEvent(emitter, "스트리밍 처리 중 오류가 발생했습니다.");
            emitter.complete();
        }
    }

    private void sendErrorEvent(SseEmitter emitter, String message) {
        try {
            emitter.send(SseEmitter.event()
                    .name("error")
                    .data(Map.of("message", message)));
        } catch (IOException ignored) {
            // Client already disconnected
        }
    }
}
