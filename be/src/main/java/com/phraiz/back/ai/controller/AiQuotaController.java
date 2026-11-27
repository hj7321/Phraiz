package com.phraiz.back.ai.controller;

import com.phraiz.back.ai.quota.CreditGuardService;
import com.phraiz.back.ai.quota.CreditGuardService.QuotaStatus;
import com.phraiz.back.ai.quota.PlanTier;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v2/ai/quota")
public class AiQuotaController {

    private final CreditGuardService creditGuardService;

    public AiQuotaController(CreditGuardService creditGuardService) {
        this.creditGuardService = creditGuardService;
    }

    @GetMapping
    public QuotaStatus getQuota(
            HttpServletRequest httpRequest,
            @RequestHeader(value = "X-Plan-Tier", required = false) String headerPlanTier
    ) {
        String clientIp = CreditGuardService.extractClientIp(httpRequest);
        PlanTier tier = PlanTier.parseOrDefault(headerPlanTier);
        return creditGuardService.getDailyIpQuotaStatus(clientIp, tier);
    }

    @PostMapping("/reset")
    public QuotaStatus resetBlockedInProd(
            HttpServletRequest httpRequest,
            @RequestHeader(value = "X-Plan-Tier", required = false) String headerPlanTier
    ) {
        // 운영 공개 환경에서는 일일 IP 한도 우회를 막기 위해 현재 상태만 반환
        String clientIp = CreditGuardService.extractClientIp(httpRequest);
        PlanTier tier = PlanTier.parseOrDefault(headerPlanTier);
        return creditGuardService.getDailyIpQuotaStatus(clientIp, tier);
    }
}