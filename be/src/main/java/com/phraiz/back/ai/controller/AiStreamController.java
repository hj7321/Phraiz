package com.phraiz.back.ai.controller;

import com.phraiz.back.ai.config.LlmGatewayProperties;
import com.phraiz.back.ai.dto.ParaphraseStreamRequest;
import com.phraiz.back.ai.dto.SummaryStreamRequest;
import com.phraiz.back.ai.quota.CreditGuardService;
import com.phraiz.back.ai.quota.PlanTier;
import com.phraiz.back.ai.service.LlmGatewayService;
import com.phraiz.back.ai.service.PromptTemplateFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.security.Principal;

@RestController
@RequestMapping("/api/v2/ai")
public class AiStreamController {

    private static final long MAX_PDF_BYTES = 20L * 1024 * 1024;

    private final LlmGatewayService llmGatewayService;
    private final PromptTemplateFactory promptTemplateFactory;
    private final LlmGatewayProperties properties;
    private final CreditGuardService creditGuardService;

    public AiStreamController(
            LlmGatewayService llmGatewayService,
            PromptTemplateFactory promptTemplateFactory,
            LlmGatewayProperties properties,
            CreditGuardService creditGuardService
    ) {
        this.llmGatewayService = llmGatewayService;
        this.promptTemplateFactory = promptTemplateFactory;
        this.properties = properties;
        this.creditGuardService = creditGuardService;
    }

    @PostMapping(value = "/paraphrase/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamParaphrase(
            HttpServletRequest httpRequest,
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @RequestHeader(value = "X-Plan-Tier", required = false) String headerPlanTier,
            @Valid @RequestBody ParaphraseStreamRequest request
    ) {
        String memberId = resolveMemberId(principal, headerMemberId);
        PlanTier tier = PlanTier.parseOrDefault(headerPlanTier);

        // FREE 티어는 요청 옵션과 무관하게 경량 모델(Haiku 5.5)로 강제 라우팅해 원가 방어
        boolean useFastModel = request.fastMode() || !tier.isPremiumModelAllowed();
        int creditCost = useFastModel
                ? CreditGuardService.COST_PARAPHRASE_FAST
                : CreditGuardService.COST_PARAPHRASE_PREMIUM;

        creditGuardService.consumeDailyIpCredits(CreditGuardService.extractClientIp(httpRequest), creditCost);
        creditGuardService.consumeCredits(memberId, tier, creditCost);

        String modelAlias = useFastModel
                ? properties.models().paraphraseFast()
                : properties.models().paraphrase();

        String systemPrompt = promptTemplateFactory.buildParaphraseSystemPrompt(
                request.mode(),
                request.strengthLevel()
        );

        return llmGatewayService.streamChatCompletion(modelAlias, systemPrompt, request.text());
    }

    @PostMapping(value = "/summary/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamSummary(
            HttpServletRequest httpRequest,
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @RequestHeader(value = "X-Plan-Tier", required = false) String headerPlanTier,
            @Valid @RequestBody SummaryStreamRequest request
    ) {
        String memberId = resolveMemberId(principal, headerMemberId);
        PlanTier tier = PlanTier.parseOrDefault(headerPlanTier);

        creditGuardService.consumeDailyIpCredits(
                CreditGuardService.extractClientIp(httpRequest),
                CreditGuardService.COST_SUMMARY_TEXT
        );
        creditGuardService.consumeCredits(memberId, tier, CreditGuardService.COST_SUMMARY_TEXT);

        String modelAlias = properties.models().summary();
        String systemPrompt = promptTemplateFactory.buildSummarySystemPrompt(request.mode());
        return llmGatewayService.streamChatCompletion(modelAlias, systemPrompt, request.text());
    }

    @PostMapping(
            value = "/summary/pdf/stream",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.TEXT_EVENT_STREAM_VALUE
    )
    public SseEmitter streamPdfSummary(
            HttpServletRequest httpRequest,
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @RequestHeader(value = "X-Plan-Tier", required = false) String headerPlanTier,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mode", defaultValue = "bullet") String mode
    ) throws IOException {
        String memberId = resolveMemberId(principal, headerMemberId);
        PlanTier tier = PlanTier.parseOrDefault(headerPlanTier);

        if (!tier.isPdfSummaryAllowed()) {
            throw new ResponseStatusException(
                    HttpStatus.PAYMENT_REQUIRED,
                    "네이티브 PDF 멀티모달 요약은 PRO 요금제부터 사용할 수 있습니다."
            );
        }

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PDF 파일을 첨부해 주세요.");
        }
        String contentType = file.getContentType();
        String filename = file.getOriginalFilename();
        boolean isPdf = "application/pdf".equalsIgnoreCase(contentType)
                || (filename != null && filename.toLowerCase().endsWith(".pdf"));
        if (!isPdf) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PDF 형식의 파일만 업로드할 수 있습니다.");
        }
        if (file.getSize() > MAX_PDF_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "PDF 파일은 최대 20MB까지 지원합니다.");
        }

        creditGuardService.consumeDailyIpCredits(
                CreditGuardService.extractClientIp(httpRequest),
                CreditGuardService.COST_SUMMARY_PDF
        );
        creditGuardService.consumeCredits(memberId, tier, CreditGuardService.COST_SUMMARY_PDF);

        String modelAlias = properties.models().summary();
        String systemPrompt = promptTemplateFactory.buildSummarySystemPrompt(mode);
        return llmGatewayService.streamPdfSummary(modelAlias, systemPrompt, file.getBytes(), filename);
    }

    private String resolveMemberId(Principal principal, String headerMemberId) {
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return principal.getName();
        }
        return (headerMemberId != null && !headerMemberId.isBlank()) ? headerMemberId : "local-dev";
    }
}