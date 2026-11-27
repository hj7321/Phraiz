package com.phraiz.back.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SummaryStreamRequest(
        @NotBlank(message = "요약할 텍스트를 입력해 주세요.")
        @Size(max = 50000, message = "텍스트는 최대 50,000자까지 입력할 수 있습니다.")
        String text,

        // one-line | bullet | academic-abstract | keyword | section
        @NotBlank(message = "요약 모드를 선택해 주세요.")
        String mode
) {}
