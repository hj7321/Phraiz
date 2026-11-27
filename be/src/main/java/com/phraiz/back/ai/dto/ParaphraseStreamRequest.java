package com.phraiz.back.ai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ParaphraseStreamRequest(
        @NotBlank(message = "변환할 원문을 입력해 주세요.")
        @Size(max = 12000, message = "원문은 최대 12,000자까지 입력할 수 있습니다.")
        String text,

        // standard | academic | creative | fluency | experimental
        @NotBlank(message = "패러프레이징 모드를 선택해 주세요.")
        String mode,

        // 5단계 강도 스텝 (1: 최소 교정 ~ 5: 전면 재작성)
        @Min(value = 1, message = "강도 단계는 1~5 사이여야 합니다.")
        @Max(value = 5, message = "강도 단계는 1~5 사이여야 합니다.")
        int strengthLevel,

        // true일 경우 경량 고속 모델(claude-haiku-5-5 등)로 라우팅
        boolean fastMode
) {}
