package com.phraiz.back.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "phraiz.llm")
public record LlmGatewayProperties(
        String baseUrl,
        String apiKey,
        int timeoutSeconds,
        Models models
) {
    public record Models(
            String paraphrase,
            String paraphraseFast,
            String summary,
            String citeFallback
    ) {}
}
