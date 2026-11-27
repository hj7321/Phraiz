package com.phraiz.back.ai.controller;

import com.phraiz.back.ai.dto.CitationExtractRequest;
import com.phraiz.back.ai.dto.CitationMetadataResponse;
import com.phraiz.back.ai.service.HybridCitationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/ai/citation")
public class AiCitationController {

    private final HybridCitationService hybridCitationService;

    public AiCitationController(HybridCitationService hybridCitationService) {
        this.hybridCitationService = hybridCitationService;
    }

    @PostMapping("/extract")
    public CitationMetadataResponse extractCitation(@Valid @RequestBody CitationExtractRequest request) {
        return hybridCitationService.extractMetadata(request.url());
    }
}
