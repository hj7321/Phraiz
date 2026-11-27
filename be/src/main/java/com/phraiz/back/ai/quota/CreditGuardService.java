package com.phraiz.back.ai.quota;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.YearMonth;

/**
 * Redis INCRBY 기반 원자적 월간 크레딧 차감 가드.
 * 멀티 LLM 구독 서비스에서 헤비 유저로 인한 원가 역마진을 방지합니다.
 */
@Service
public class CreditGuardService {

    public static final int COST_PARAPHRASE_FAST = 1;
    public static final int COST_PARAPHRASE_PREMIUM = 3;
    public static final int COST_SUMMARY_TEXT = 2;
    public static final int COST_SUMMARY_PDF = 5;

    private final RedisTemplate<String, String> redisTemplate;

    public CreditGuardService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public QuotaStatus consumeCredits(String memberId, PlanTier tier, int cost) {
        String key = buildMonthlyKey(memberId);
        Long updated = redisTemplate.opsForValue().increment(key, cost);
        long used = updated != null ? updated : cost;

        // 최초 생성 시 35일 TTL 설정 (월간 자동 만료)
        if (used == cost) {
            redisTemplate.expire(key, Duration.ofDays(35));
        }

        if (used > tier.getMonthlyCreditLimit()) {
            // 초과분 원자적 롤백
            redisTemplate.opsForValue().decrement(key, cost);
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    String.format("이번 달 크레딧 한도(%d)를 초과했습니다. 요금제를 업그레이드해 주세요.",
                            tier.getMonthlyCreditLimit())
            );
        }

        return new QuotaStatus(
                memberId,
                tier.name(),
                used,
                tier.getMonthlyCreditLimit(),
                Math.max(0, tier.getMonthlyCreditLimit() - used),
                tier.isPremiumModelAllowed(),
                tier.isPdfSummaryAllowed()
        );
    }

    public QuotaStatus getQuotaStatus(String memberId, PlanTier tier) {
        String raw = redisTemplate.opsForValue().get(buildMonthlyKey(memberId));
        long used = 0;
        if (raw != null) {
            try {
                used = Long.parseLong(raw);
            } catch (NumberFormatException ignored) {
                used = 0;
            }
        }
        return new QuotaStatus(
                memberId,
                tier.name(),
                used,
                tier.getMonthlyCreditLimit(),
                Math.max(0, tier.getMonthlyCreditLimit() - used),
                tier.isPremiumModelAllowed(),
                tier.isPdfSummaryAllowed()
        );
    }

    public void resetMonthlyCredits(String memberId) {
        redisTemplate.delete(buildMonthlyKey(memberId));
    }

    private String buildMonthlyKey(String memberId) {
        return "phraiz:credit:" + memberId + ":" + YearMonth.now();
    }

    public record QuotaStatus(
            String memberId,
            String tier,
            long usedCredits,
            long monthlyLimit,
            long remainingCredits,
            boolean premiumModelAllowed,
            boolean pdfSummaryAllowed
    ) {}
}
