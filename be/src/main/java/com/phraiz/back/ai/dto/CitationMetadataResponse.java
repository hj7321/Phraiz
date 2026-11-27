package com.phraiz.back.ai.dto;

import java.util.List;

public record CitationMetadataResponse(
        String source,         // ZOTERO | ZOTERO_CROSSREF | CROSSREF | LLM_FALLBACK
        boolean doiVerified,
        String type,           // article-journal | webpage | paper-conference | book | report
        String title,
        List<String> authors,
        String containerTitle, // 학술지명 또는 사이트명
        Integer issuedYear,
        String volume,
        String issue,
        String pages,
        String doi,
        String url,
        String apaPreview
) {}
