# Phraiz 1인 리빌드 — Phase 2: 기능별 특화 LLM 고도화 패키지 (경로 A)

Phase 1(Spring Boot + LiteLLM + Next.js SSE 스트리밍) 위에 바로 덮어써서 적용하는 2단계 코드 패키지입니다.

## 포함된 기능

1. **패러프레이징 5단계 강도 정밀 프롬프트 + 단어 단위 Diff 뷰어**
   - `0~100` 슬라이더를 제거하고 **5단계 스텝(1 최소 교정 ~ 5 전면 재작성)**으로 세분화
   - 단계별 변경 비율 규칙 + 한국어 Few-shot 예시로 강도별 결과 차이를 극대화
   - 외부 라이브러리 없이 동작하는 LCS 기반 한국어 어절 단위 Diff 뷰어 + 변경률(%) 배지
2. **Gemini 네이티브 PDF 요약 스트리밍 (`/api/v2/ai/summary/pdf/stream`)**
   - `PDFBox` 텍스트 추출 없이 PDF 바이너리를 Base64 멀티모달 메시지로 LiteLLM → `gemini-2.5-flash`에 직접 전달
   - 2단 논문, 표, 수식 레이아웃을 유지한 채 실시간 SSE 스트리밍 요약
3. **하이브리드 인용 메타데이터 파이프라인 (`/api/v2/ai/citation/extract`)**
   - **1차**: 무료 Zotero Translation Server (`localhost:1969/web`)
   - **2차**: DOI 감지 시 Crossref REST API (`api.crossref.org/works/{doi}`)로 공식 서지 검증·보강
   - **3차 폴백**: Zotero 실패 시 HTML 메타태그에서 `cite-fallback`(`claude-haiku-5-5`)으로 JSON 구조화 추출

## 적용 방법

1. **백엔드 (`be/`) 파일 덮어쓰기/추가**
   - `be/src/main/java/com/phraiz/back/ai/` 안의 하위 폴더(`controller`, `dto`, `service`) 파일들을 기존 `D:\phraiz\be\src\main\java\com\phraiz\back\ai\`에 그대로 복사(덮어쓰기)합니다.
   - `be/src/main/resources/application.yml`의 `spring.servlet.multipart` 용량을 `20MB`로 올려주세요:
     ```yaml
     spring:
       servlet:
         multipart:
           max-file-size: 20MB
           max-request-size: 20MB
     ```
   - `.\gradlew bootRun` 터미널을 `Ctrl + C`로 껐다가 다시 실행합니다.

2. **프론트엔드 (`fe/`) 파일 덮어쓰기/추가**
   - `fe/src/` 하위 파일들을 기존 `D:\phraiz\fe\src\`에 그대로 복사(덮어쓰기)합니다.
   - 브라우저에서 `http://localhost:3000/ai-stream-test`를 열면 3개 탭(패러프레이징 5단계+Diff / Gemini PDF 요약 / 하이브리드 인용 추출)을 한 번에 테스트할 수 있습니다.
