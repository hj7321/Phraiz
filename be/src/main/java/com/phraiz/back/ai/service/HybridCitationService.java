package com.phraiz.back.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phraiz.back.ai.config.LlmGatewayProperties;
import com.phraiz.back.ai.dto.CitationMetadataResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 3단계 하이브리드 인용 파이프라인:
 * 1차: 무료 결정론적 Zotero Translation Server
 * 2차: DOI가 발견되면 Crossref REST API로 공식 학술 메타데이터 교차 검증·보강
 * 3차: Zotero가 실패한 비정형 웹페이지만 경량 LLM(JSON 구조화 출력) 폴백 호출
 */
@Service
public class HybridCitationService {

    private static final Logger log = LoggerFactory.getLogger(HybridCitationService.class);
    private static final Pattern DOI_PATTERN = Pattern.compile("(10\\.\\d{4,9}/[-._;()/:A-Za-z0-9]+)");
    private static final Pattern YEAR_PATTERN = Pattern.compile("(\\d{4})");

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final LlmGatewayService llmGatewayService;
    private final PromptTemplateFactory promptTemplateFactory;
    private final LlmGatewayProperties properties;
    private final String zoteroUrl;

    public HybridCitationService(
            HttpClient llmHttpClient,
            ObjectMapper objectMapper,
            LlmGatewayService llmGatewayService,
            PromptTemplateFactory promptTemplateFactory,
            LlmGatewayProperties properties,
            @Value("${zotero.url:http://localhost:1969/web}") String zoteroUrl
    ) {
        this.httpClient = llmHttpClient;
        this.objectMapper = objectMapper;
        this.llmGatewayService = llmGatewayService;
        this.promptTemplateFactory = promptTemplateFactory;
        this.properties = properties;
        this.zoteroUrl = zoteroUrl;
    }

    public CitationMetadataResponse extractMetadata(String targetUrl) {
        // 1차 시도: Zotero Translation Server (비용 0원)
        ParsedMeta zoteroMeta = tryZotero(targetUrl);

        // URL 또는 Zotero 결과에서 DOI 탐색
        String detectedDoi = zoteroMeta != null && zoteroMeta.doi != null
                ? zoteroMeta.doi
                : extractDoiFromText(targetUrl);

        // 2차 시도: DOI가 있으면 Crossref 공식 REST API로 검증 및 보강 (비용 0원)
        if (detectedDoi != null) {
            ParsedMeta crossrefMeta = tryCrossref(detectedDoi, targetUrl);
            if (crossrefMeta != null) {
                String source = (zoteroMeta != null) ? "ZOTERO_CROSSREF" : "CROSSREF";
                return toResponse(source, true, crossrefMeta);
            }
        }

        // Zotero가 제목과 저자를 정상 추출했다면 무료 결과 즉시 반환
        if (zoteroMeta != null && zoteroMeta.title != null && !zoteroMeta.title.isBlank()) {
            return toResponse("ZOTERO", false, zoteroMeta);
        }

        // 3차 폴백: 경량 LLM으로 HTML <head> 메타태그에서 JSON 추출
        ParsedMeta llmMeta = tryLlmFallback(targetUrl);
        if (llmMeta.doi != null) {
            ParsedMeta verified = tryCrossref(llmMeta.doi, targetUrl);
            if (verified != null) {
                return toResponse("CROSSREF", true, verified);
            }
        }
        return toResponse("LLM_FALLBACK", false, llmMeta);
    }

    private ParsedMeta tryZotero(String targetUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(zoteroUrl))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "text/plain; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(targetUrl, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
            if (response.statusCode() != 200) {
                return null;
            }

            JsonNode array = objectMapper.readTree(response.body());
            if (!array.isArray() || array.isEmpty()) {
                return null;
            }
            JsonNode item = array.get(0);
            String title = textOrNull(item, "title");
            if (title == null) {
                return null;
            }

            List<String> authors = new ArrayList<>();
            JsonNode creators = item.path("creators");
            if (creators.isArray()) {
                for (JsonNode c : creators) {
                    String last = textOrNull(c, "lastName");
                    String first = textOrNull(c, "firstName");
                    String name = textOrNull(c, "name");
                    if (last != null && first != null) {
                        authors.add(last + ", " + first);
                    } else if (last != null) {
                        authors.add(last);
                    } else if (name != null) {
                        authors.add(name);
                    }
                }
            }

            String type = "journalArticle".equals(textOrNull(item, "itemType"))
                    ? "article-journal"
                    : "webpage";
            String container = textOrNull(item, "publicationTitle");
            if (container == null) {
                container = textOrNull(item, "websiteTitle");
            }
            Integer year = extractYear(textOrNull(item, "date"));

            return new ParsedMeta(
                    type,
                    title,
                    authors,
                    container,
                    year,
                    textOrNull(item, "volume"),
                    textOrNull(item, "issue"),
                    textOrNull(item, "pages"),
                    textOrNull(item, "DOI"),
                    targetUrl
            );
        } catch (Exception ex) {
            log.debug("Zotero extraction failed for {}: {}", targetUrl, ex.getMessage());
            return null;
        }
    }

    private ParsedMeta tryCrossref(String doi, String originalUrl) {
        try {
            String cleanDoi = doi.replaceAll("[).,;]+$", "");
            String encoded = URLEncoder.encode(cleanDoi, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.crossref.org/works/" + encoded))
                    .timeout(Duration.ofSeconds(10))
                    .header("User-Agent", "PhraizAcademicApp/2.0 (mailto:dev@phraiz.local)")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
            if (response.statusCode() != 200) {
                return null;
            }

            JsonNode msg = objectMapper.readTree(response.body()).path("message");
            String title = msg.path("title").isArray() && !msg.path("title").isEmpty()
                    ? msg.path("title").get(0).asText()
                    : null;
            if (title == null) {
                return null;
            }

            List<String> authors = new ArrayList<>();
            JsonNode authorNodes = msg.path("author");
            if (authorNodes.isArray()) {
                for (JsonNode a : authorNodes) {
                    String family = textOrNull(a, "family");
                    String given = textOrNull(a, "given");
                    if (family != null && given != null) {
                        authors.add(family + ", " + given);
                    } else if (family != null) {
                        authors.add(family);
                    }
                }
            }

            String container = msg.path("container-title").isArray() && !msg.path("container-title").isEmpty()
                    ? msg.path("container-title").get(0).asText()
                    : null;

            Integer year = null;
            JsonNode dateParts = msg.path("issued").path("date-parts");
            if (dateParts.isArray() && !dateParts.isEmpty() && dateParts.get(0).isArray() && !dateParts.get(0).isEmpty()) {
                year = dateParts.get(0).get(0).asInt();
            }

            return new ParsedMeta(
                    textOrNull(msg, "type") != null ? textOrNull(msg, "type") : "article-journal",
                    title,
                    authors,
                    container,
                    year,
                    textOrNull(msg, "volume"),
                    textOrNull(msg, "issue"),
                    textOrNull(msg, "page"),
                    cleanDoi,
                    originalUrl
            );
        } catch (Exception ex) {
            log.debug("Crossref verification failed for {}: {}", doi, ex.getMessage());
            return null;
        }
    }

    private ParsedMeta tryLlmFallback(String targetUrl) {
        try {
            String snippet = fetchHtmlHeadSnippet(targetUrl);
            String userInput = "URL: " + targetUrl + "\n---\n" + snippet;

            JsonNode node = llmGatewayService.completeJson(
                    properties.models().citeFallback(),
                    promptTemplateFactory.buildCitationExtractionSystemPrompt(),
                    userInput
            );

            List<String> authors = new ArrayList<>();
            if (node.path("authors").isArray()) {
                for (JsonNode a : node.path("authors")) {
                    if (a.isTextual() && !a.asText().isBlank()) {
                        authors.add(a.asText().trim());
                    }
                }
            }

            Integer year = node.hasNonNull("issuedYear") && node.get("issuedYear").isInt()
                    ? node.get("issuedYear").asInt()
                    : null;

            return new ParsedMeta(
                    textOrNull(node, "type") != null ? textOrNull(node, "type") : "webpage",
                    textOrNull(node, "title") != null ? textOrNull(node, "title") : "(제목 확인 필요)",
                    authors,
                    textOrNull(node, "containerTitle"),
                    year,
                    textOrNull(node, "volume"),
                    textOrNull(node, "issue"),
                    textOrNull(node, "pages"),
                    textOrNull(node, "doi"),
                    targetUrl
            );
        } catch (Exception ex) {
            log.warn("LLM citation fallback failed for {}: {}", targetUrl, ex.getMessage());
            return new ParsedMeta("webpage", "(메타데이터 추출 실패)", List.of(), null, null, null, null, null, null, targetUrl);
        }
    }

    private String fetchHtmlHeadSnippet(String targetUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .timeout(Duration.ofSeconds(8))
                    .header("User-Agent", "Mozilla/5.0 (compatible; PhraizBot/2.0)")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
            String html = response.body();
            Matcher m = Pattern.compile("<head[^>]*>([\\s\\S]*?)</head>", Pattern.CASE_INSENSITIVE).matcher(html);
            String target = m.find() ? m.group(1) : html;
            String cleaned = target
                    .replaceAll("(?is)<script.*?</script>", "")
                    .replaceAll("(?is)<style.*?</style>", "");
            return cleaned.length() > 6000 ? cleaned.substring(0, 6000) : cleaned;
        } catch (Exception ex) {
            return "(페이지 HTML을 불러오지 못했습니다. 확인되지 않은 필드는 반드시 null로 반환하세요.)";
        }
    }

    private CitationMetadataResponse toResponse(String source, boolean doiVerified, ParsedMeta m) {
        String apa = formatApaPreview(m);
        return new CitationMetadataResponse(
                source,
                doiVerified,
                m.type,
                m.title,
                m.authors,
                m.containerTitle,
                m.issuedYear,
                m.volume,
                m.issue,
                m.pages,
                m.doi,
                m.url,
                apa
        );
    }

    private String formatApaPreview(ParsedMeta m) {
        StringBuilder sb = new StringBuilder();
        if (m.authors != null && !m.authors.isEmpty()) {
            sb.append(String.join(", ", m.authors)).append(" ");
        }
        sb.append("(").append(m.issuedYear != null ? m.issuedYear : "n.d.").append("). ");
        sb.append(m.title != null ? m.title : "Untitled").append(". ");
        if (m.containerTitle != null) {
            sb.append(m.containerTitle);
            if (m.volume != null) {
                sb.append(", ").append(m.volume);
                if (m.issue != null) {
                    sb.append("(").append(m.issue).append(")");
                }
            }
            if (m.pages != null) {
                sb.append(", ").append(m.pages);
            }
            sb.append(". ");
        }
        if (m.doi != null) {
            sb.append("https://doi.org/").append(m.doi);
        } else if (m.url != null) {
            sb.append(m.url);
        }
        return sb.toString().trim();
    }

    private String extractDoiFromText(String text) {
        if (text == null) return null;
        Matcher m = DOI_PATTERN.matcher(text);
        return m.find() ? m.group(1) : null;
    }

    private Integer extractYear(String dateText) {
        if (dateText == null) return null;
        Matcher m = YEAR_PATTERN.matcher(dateText);
        return m.find() ? Integer.parseInt(m.group(1)) : null;
    }

    private String textOrNull(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) return null;
        String val = node.get(field).asText().trim();
        return val.isEmpty() ? null : val;
    }

    private record ParsedMeta(
            String type,
            String title,
            List<String> authors,
            String containerTitle,
            Integer issuedYear,
            String volume,
            String issue,
            String pages,
            String doi,
            String url
    ) {}
}
