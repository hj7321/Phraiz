package com.phraiz.back.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CitationExtractRequest(
        @NotBlank(message = "인용할 URL을 입력해 주세요.")
        @Pattern(regexp = "^https?://.+", message = "http:// 또는 https://로 시작하는 올바른 URL을 입력해 주세요.")
        String url
) {}
