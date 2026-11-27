package com.phraiz.back.ai.quota;

public enum PlanTier {
    FREE(50, false, false),
    PRO(1000, true, true),
    ENTERPRISE(10000, true, true);

    private final long monthlyCreditLimit;
    private final boolean premiumModelAllowed;
    private final boolean pdfSummaryAllowed;

    PlanTier(long monthlyCreditLimit, boolean premiumModelAllowed, boolean pdfSummaryAllowed) {
        this.monthlyCreditLimit = monthlyCreditLimit;
        this.premiumModelAllowed = premiumModelAllowed;
        this.pdfSummaryAllowed = pdfSummaryAllowed;
    }

    public long getMonthlyCreditLimit() {
        return monthlyCreditLimit;
    }

    public boolean isPremiumModelAllowed() {
        return premiumModelAllowed;
    }

    public boolean isPdfSummaryAllowed() {
        return pdfSummaryAllowed;
    }

    public static PlanTier parseOrDefault(String raw) {
        if (raw == null || raw.isBlank()) return PRO;
        try {
            return PlanTier.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return FREE;
        }
    }
}
