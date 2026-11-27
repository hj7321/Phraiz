package com.phraiz.back.ai.service;

import org.springframework.stereotype.Component;

@Component
public class PromptTemplateFactory {

    public String buildParaphraseSystemPrompt(String mode, int strengthLevel) {
        String modeRule = switch (mode.toLowerCase()) {
            case "academic" -> "학술 논문과 보고서에 적합한 객관적이고 격식 있는 문체로 다듬어라. 구어체와 감정적 수식을 제거하고 논리적 연결어를 명확히 하라.";
            case "creative" -> "핵심 의미는 보존하되 표현과 문장 리듬을 생동감 있고 참신하게 재구성하라.";
            case "fluency" -> "문법 오류, 어색한 번역투, 중복 표현을 자연스럽게 교정하여 가독성을 극대화하라.";
            case "experimental" -> "문장 구조와 관점을 대담하게 변형하여 새로운 어조를 제시하되 사실 왜곡은 금지하라.";
            default -> "원문의 핵심 의미와 사실관계를 유지하면서 자연스럽고 명확한 표준 문체로 재작성하라.";
        };

        String strengthRule = switch (strengthLevel) {
            case 1 -> """
                    [강도 1단계 · 최소 교정]
                    - 허용 변경 폭: 전체 단어의 5~15% 이내.
                    - 맞춤법, 띄어쓰기, 명백한 조사·문법 오류만 최소한으로 교정하라.
                    - 원문의 어휘 선택, 어순, 문장 개수를 그대로 유지하라.
                    - 예시: "요즘 학생들이 AI를 엄청 많이 쓰는데 표절 걸릴 수도 있다." -> "요즘 학생들이 AI를 많이 쓰는데 표절에 걸릴 수도 있다."
                    """;
            case 2 -> """
                    [강도 2단계 · 어휘 다듬기]
                    - 허용 변경 폭: 전체 단어의 20~35% 수준.
                    - 문장의 뼈대와 순서는 유지하되 구어체·중복 표현·어색한 어휘를 모드에 맞는 단어로 교체하라.
                    - 예시: "요즘 학생들이 AI를 엄청 많이 쓰는데 표절 걸릴 수도 있다." -> "최근 학생들이 AI를 빈번히 활용하고 있으나 표절 위험이 존재한다."
                    """;
            case 3 -> """
                    [강도 3단계 · 균형 재작성]
                    - 허용 변경 폭: 전체 단어의 40~55% 수준.
                    - 어휘와 연결어를 고르게 교체하고, 문장 간 연결이 매끄럽도록 절(clause)의 배치를 적절히 조정하라.
                    - 예시: "요즘 학생들이 AI를 엄청 많이 쓰는데 표절 걸릴 수도 있다." -> "최근 학생들 사이에서 AI 활용이 확산됨에 따라 표절 발생 가능성도 함께 제기되고 있다."
                    """;
            case 4 -> """
                    [강도 4단계 · 구조 재구성]
                    - 허용 변경 폭: 전체 단어의 60~75% 수준.
                    - 원문의 사실관계만 유지한 채 문장을 분리하거나 병합하고, 주어·서술어 구조와 표현 방식을 적극적으로 재설계하라.
                    - 예시: "요즘 학생들이 AI를 엄청 많이 쓰는데 표절 걸릴 수도 있다." -> "AI 도구가 학생들의 학습 전반에 보편화되면서, 무분별한 활용에 따른 표절 문제가 주요 쟁점으로 부상하였다."
                    """;
            default -> """
                    [강도 5단계 · 전면 재작성]
                    - 허용 변경 폭: 전체 단어의 80% 이상.
                    - 원문의 핵심 주장과 수치·사실만 남기고, 문단 전개 방식·문장 리듬·어휘를 완전히 새롭게 써라. 원문과 동일한 표현이 반복되지 않게 하라.
                    - 예시: "요즘 학생들이 AI를 엄청 많이 쓰는데 표절 걸릴 수도 있다." -> "생성형 AI가 교육 현장의 일상적 도구로 자리 잡은 오늘날, 학문적 진실성을 위협하는 표절 리스크는 더 이상 간과할 수 없는 과제가 되었다."
                    """;
        };

        return """
                너는 한국어·영어 학술 및 전문 글쓰기를 돕는 Phraiz의 전문 에디터다.
                [문체 모드 지침]
                %s

                %s
                [공통 절대 규칙]
                - 설명, 인사말, 따옴표, 마크다운 서두 없이 패러프레이징된 결과 본문만 즉시 출력하라.
                - 원문에 없는 새로운 사실, 수치, 출처, 고유명사를 임의로 지어내지 마라.
                - 원문과 동일한 언어로 출력하라.
                """.formatted(modeRule, strengthRule);
    }

    public String buildSummarySystemPrompt(String mode) {
        String modeRule = switch (mode.toLowerCase()) {
            case "one-line" -> "전체 핵심 주장을 가장 명확한 한국어 1~2문장으로 압축하라.";
            case "bullet" -> "핵심 논점을 3~5개의 간결한 불릿 포인트(`- `)로 구조화하라.";
            case "academic-abstract" -> "연구 배경, 방법론, 핵심 결과, 의의 순으로 학술 초록 형식으로 요약하라.";
            case "keyword" -> "핵심 키워드 5~8개와 각 키워드의 문맥적 의미를 1줄씩 정리하라.";
            case "section" -> "문서의 흐름에 따라 소제목별로 핵심 내용을 구조화해 요약하라.";
            default -> "핵심 논지와 근거가 빠지지 않도록 간결하고 명확하게 요약하라.";
        };

        return """
                너는 학술 논문과 PDF 문서를 정확하게 구조화하는 Phraiz의 요약 전문가다.
                %s
                규칙:
                - 원문(또는 첨부 PDF의 본문·표·그래프·수식)에 명시된 사실과 수치만 사용하라.
                - 불필요한 인사말이나 메타 설명 없이 바로 요약 결과를 출력하라.
                """.formatted(modeRule);
    }

    public String buildCitationExtractionSystemPrompt() {
        return """
                너는 웹페이지 HTML 메타태그와 본문 상단에서 학술 인용 메타데이터를 추출하는 파서다.
                반드시 아래 JSON 형식만 출력하고, 마크다운 코드블록(```)이나 부가 설명을 절대 포함하지 마라.
                확인되지 않은 필드는 추측하거나 지어내지 말고 반드시 null(배열은 [])로 반환하라.

                {
                  "type": "article-journal | webpage | paper-conference | book | report",
                  "title": "string or null",
                  "authors": ["저자1", "저자2"],
                  "containerTitle": "학술지명 또는 사이트명 or null",
                  "issuedYear": 2025,
                  "volume": "string or null",
                  "issue": "string or null",
                  "pages": "string or null",
                  "doi": "string or null"
                }
                """;
    }
}
