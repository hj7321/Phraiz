package com.phraiz.back.ai.controller;

import com.phraiz.back.ai.dto.CitationExtractRequest;
import com.phraiz.back.ai.dto.CitationMetadataResponse;
import com.phraiz.back.ai.quota.CreditGuardService;
import com.phraiz.back.ai.service.HybridCitationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/ai/citation")
public class AiCitationController {

    private final HybridCitationService hybridCitationService;
    private final CreditGuardService creditGuardService;

    public AiCitationController(
            HybridCitationService hybridCitationService,
            CreditGuardService creditGuardService
    ) {
        this.hybridCitationService = hybridCitationService;
        this.creditGuardService = creditGuardService;
    }

    @PostMapping("/extract")
    public CitationMetadataResponse extractCitation(
            HttpServletRequest httpRequest,
            @Valid @RequestBody CitationExtractRequest request
    ) {
        creditGuardService.consumeDailyIpCredits(
                CreditGuardService.extractClientIp(httpRequest),
                CreditGuardService.COST_CITATION
        );
        return hybridCitationService.extractMetadata(request.url());
    }
}