# Phraiz 1인 리빌드 — Phase 1: 로컬 통합 환경 & 멀티 LLM 게이트웨이 (SSE 스트리밍)

기존 `SSU-IT-Contest/BE`(Spring Boot 3.5.3, Java 17)와 `SSU-IT-Contest/FE`(Next.js 14 App Router)를 유지하면서,
단일 OpenAI 동기 호출을 **기능별 멀티 LLM 게이트웨이 + SSE 실시간 스트리밍**으로 점진 전환하기 위한 1단계 코드 패키지입니다.

## 포함된 구성

- `docker-compose.yml`: MySQL 8, Redis 7, Zotero Translation Server, LiteLLM Proxy 1명령 실행
- `litellm/config.yaml`: 기능별 모델 alias (`paraphrase-default`, `paraphrase-fast`, `summary-pdf`, `cite-fallback`) 및 폴백 라우팅
- `.env.example`: 루트 인프라·LLM 키·기능별 모델 환경변수 템플릿
- `be/`: Spring Boot 3.5.3 MVC에 바로 추가할 수 있는 LLM 게이트웨이 클라이언트 및 `/api/v2/ai/*/stream` SSE 컨트롤러
- `fe/`: Next.js 14 App Router용 POST SSE 스트리밍 클라이언트, `useAiStream` 훅, 패러프레이징 데모 컴포넌트

## 빠른 시작

1. 환경변수 파일 복사 및 API 키 입력
   ```bash
   cp .env.example .env
   cp fe/.env.example fe/.env.local
   ```

2. 로컬 인프라 + LLM 게이트웨이 실행
   ```bash
   docker compose up -d
   ```
   - MySQL: `localhost:3306`
   - Redis: `localhost:6379`
   - Zotero Translation Server: `localhost:1969`
   - LiteLLM Proxy (OpenAI 호환 엔드포인트): `http://localhost:4000/v1`

3. 백엔드 적용 (`SSU-IT-Contest/BE`)
   - `be/src/main/java/com/phraiz/back/ai/` 폴더를 기존 BE 프로젝트의 `src/main/java/com/phraiz/back/` 아래에 복사합니다.
   - `be/src/main/resources/application-llm.yml`을 `src/main/resources/`에 복사하고, `application.yml`에 `spring.profiles.include: llm`을 추가합니다.
   - 별도 WebFlux 의존성 없이 기존 `spring-boot-starter-web` + Java 17 `HttpClient`로 동작합니다.

4. 프론트엔드 적용 (`SSU-IT-Contest/FE`)
   - `fe/src/` 하위 파일들을 기존 FE 프로젝트의 `src/` 아래에 복사합니다.

5. SSE 스트리밍 동작 확인 (cURL)
   ```bash
   curl -N -X POST http://localhost:8080/api/v2/ai/paraphrase/stream \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
     -d '{
       "text": "본 연구는 대학생의 학술 글쓰기 과정에서 생성형 인공지능 도구의 활용 양상을 분석하였다.",
       "mode": "academic",
       "toneStrength": 65
     }'
   ```

## OpenRouter로 바로 전환하기 (LiteLLM 없이 사용 시)

로컬에 LiteLLM 컨테이너를 띄우지 않고 OpenRouter만 쓰려면 `.env`에서 아래 두 값만 바꾸면 코드 수정 없이 전환됩니다.

```env
LLM_GATEWAY_BASE_URL=https://openrouter.ai/api/v1
LLM_GATEWAY_API_KEY=sk-or-v1-...
LLM_MODEL_PARAPHRASE=anthropic/claude-sonnet-4
LLM_MODEL_PARAPHRASE_FAST=openai/gpt-4o-mini
LLM_MODEL_SUMMARY=google/gemini-2.5-flash
LLM_MODEL_CITE_FALLBACK=openai/gpt-4o-mini
```
