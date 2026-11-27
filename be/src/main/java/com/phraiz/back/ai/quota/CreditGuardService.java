package com.phraiz.back.ai.quota;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

/**
 * Redis INCRBY 기반 원자적 월간 크레딧 + 일일 IP/전역 한도 가드.
 * 공개 데모 환경에서 과도한 호출로 인한 LLM API 크레딧 소진을 방지합니다.
 */
@Service
public class CreditGuardService {

    public static final int COST_PARAPHRASE_FAST = 1;
    public static final int COST_PARAPHRASE_PREMIUM = 3;
    public static final int COST_SUMMARY_TEXT = 2;
    public static final int COST_SUMMARY_PDF = 5;
    public static final int COST_CITATION = 1;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final RedisTemplate<String, String> redisTemplate;
    private final long dailyIpLimit;
    private final long dailyGlobalLimit;

    public CreditGuardService(
            RedisTemplate<String, String> redisTemplate,
            @Value("${phraiz.quota.daily-ip-limit:35}") long dailyIpLimit,
            @Value("${phraiz.quota.daily-global-limit:300}") long dailyGlobalLimit
    ) {
        this.redisTemplate = redisTemplate;
        this.dailyIpLimit = dailyIpLimit;
        this.dailyGlobalLimit = dailyGlobalLimit;
    }

    /**
     * 공개 배포용 IP당 일일 크레딧 + 서버 전체 일일 상한 체크.
     */
    public void consumeDailyIpCredits(String clientIp, int cost) {
        LocalDate today = LocalDate.now(KST);
        String ipKey = buildDailyIpKey(clientIp, today);
        String globalKey = "phraiz:daily:global:" + today;

        // 1) IP당 일일 한도 체크
        Long ipUpdated = redisTemplate.opsForValue().increment(ipKey, cost);
        long ipUsed = ipUpdated != null ? ipUpdated : cost;
        if (ipUsed == cost) {
            redisTemplate.expire(ipKey, Duration.ofHours(25));
        }
        if (ipUsed > dailyIpLimit) {
            redisTemplate.opsForValue().decrement(ipKey, cost);
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    String.format("일일 체험 한도(%d 크레딧)를 모두 사용했습니다. 내일 자정(KST)에 초기화됩니다.", dailyIpLimit)
            );
        }

        // 2) 서버 전체 일일 상한(서킷 브레이커) 체크
        Long globalUpdated = redisTemplate.opsForValue().increment(globalKey, cost);
        long globalUsed = globalUpdated != null ? globalUpdated : cost;
        if (globalUsed == cost) {
            redisTemplate.expire(globalKey, Duration.ofHours(25));
        }
        if (globalUsed > dailyGlobalLimit) {
            redisTemplate.opsForValue().decrement(globalKey, cost);
            redisTemplate.opsForValue().decrement(ipKey, cost);
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "오늘의 서비스 전체 AI 체험 한도가 모두 소진되었습니다. 내일 다시 이용해 주세요."
            );
        }
    }

    /**
     * 현재 방문자 IP의 일일 사용량 / 일일 한도(기본 35)를 조회합니다.
     */
    public QuotaStatus getDailyIpQuotaStatus(String clientIp, PlanTier tier) {
        LocalDate today = LocalDate.now(KST);
        String raw = redisTemplate.opsForValue().get(buildDailyIpKey(clientIp, today));
        long used = 0;
        if (raw != null) {
            try {
                used = Long.parseLong(raw);
            } catch (NumberFormatException ignored) {
                used = 0;
            }
        }
        return new QuotaStatus(
                clientIp,
                tier.name(),
                used,
                dailyIpLimit,
                Math.max(0, dailyIpLimit - used),
                tier.isPremiumModelAllowed(),
                tier.isPdfSummaryAllowed()
        );
    }

    public static String extractClientIp(HttpServletRequest request) {
        if (request == null) return "unknown";
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    public QuotaStatus consumeCredits(String memberId, PlanTier tier, int cost) {
        String key = buildMonthlyKey(memberId);
        Long updated = redisTemplate.opsForValue().increment(key, cost);
        long used = updated != null ? updated : cost;

        if (used == cost) {
            redisTemplate.expire(key, Duration.ofDays(35));
        }

        if (used > tier.getMonthlyCreditLimit()) {
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

    private String buildDailyIpKey(String clientIp, LocalDate today) {
        return "phraiz:daily:ip:" + clientIp + ":" + today;
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
