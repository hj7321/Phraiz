package com.phraiz.back.ai.controller;

import com.phraiz.back.ai.quota.CreditGuardService;
import com.phraiz.back.ai.quota.CreditGuardService.QuotaStatus;
import com.phraiz.back.ai.quota.PlanTier;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v2/ai/quota")
public class AiQuotaController {

    private final CreditGuardService creditGuardService;

    public AiQuotaController(CreditGuardService creditGuardService) {
        this.creditGuardService = creditGuardService;
    }

    @GetMapping
    public QuotaStatus getQuota(
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @RequestHeader(value = "X-Plan-Tier", required = false) String headerPlanTier
    ) {
        String memberId = resolveMemberId(principal, headerMemberId);
        PlanTier tier = PlanTier.parseOrDefault(headerPlanTier);
        return creditGuardService.getQuotaStatus(memberId, tier);
    }

    @PostMapping("/reset")
    public QuotaStatus resetForDev(
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @RequestHeader(value = "X-Plan-Tier", required = false) String headerPlanTier
    ) {
        String memberId = resolveMemberId(principal, headerMemberId);
        creditGuardService.resetMonthlyCredits(memberId);
        return creditGuardService.getQuotaStatus(memberId, PlanTier.parseOrDefault(headerPlanTier));
    }

    private String resolveMemberId(Principal principal, String headerMemberId) {
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return principal.getName();
        }
        return (headerMemberId != null && !headerMemberId.isBlank()) ? headerMemberId : "local-dev";
    }
}
