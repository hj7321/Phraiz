# Phraiz v2.0 — Multi-LLM Academic Writing Workspace

> **논문 PDF 요약부터 5단계 문체 교정(Diff), DOI 검증 인용까지 하나의 캔버스에서 완성하는 멀티 LLM 기반 학술 글쓰기 플랫폼**

기존 팀 프로젝트([SSU-IT-Contest/FE](https://github.com/SSU-IT-Contest/FE), [SSU-IT-Contest/BE](https://github.com/SSU-IT-Contest/BE))를 1인 개발로 전면 고도화하여, 단일 OpenAI 동기 호출 구조에서 **기능별 멀티 LLM 라우팅·실시간 SSE 스트리밍·통합 워크스페이스·과금 가드·비용 관측성**을 갖춘 실무형 AI 서비스로 리빌드했습니다.

---

## 팀 프로젝트(v1) → 1인 리빌드(v2) 핵심 업그레이드

| 영역             | 기존 팀 프로젝트 (v1)                                           | 1인 리빌드 (v2)                                                                                                                  |
| :--------------- | :-------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **LLM 아키텍처** | 단일 OpenAI 모델 동기 호출 (긴 대기 시간, 비용 비효율)          | **LiteLLM Proxy 게이트웨이 + SSE 실시간 스트리밍**, 장애 시 경량 모델 자동 폴백                                                  |
| **패러프레이징** | 프롬프트 의존형 0~100 슬라이더, 결과 단순 출력                  | **Claude Sonnet/Haiku 5.5 분기**, **5단계 정밀 강도 + Few-shot**, LCS 기반 **어절 단위 Diff & 변경률(%)**                        |
| **PDF 요약**     | `Apache PDFBox` 텍스트 추출 (2단 논문·표·수식 붕괴)             | **Gemini 2.5 Flash 네이티브 PDF 바이너리 입력**(최대 20MB), 마크다운 표 렌더링 뷰어 & 드래그 앤 드롭                             |
| **인용 생성**    | Zotero·국내 파서 단독 의존 (비정형 웹 취약)                     | **3단계 하이브리드 파이프라인** (1차 Zotero 무료 → 2차 **Crossref DOI 공식 검증** → 3차 경량 LLM JSON 폴백) + 5종 형식 즉시 전환 |
| **DB 도메인**    | 기능별 3중 복제 스키마 (`Folder–History–Content` × 3 = 9테이블) | **`workspace_folders` + `workspace_items` 2테이블 통합**, 접이식 히스토리 서랍에서 유형별 상태 완전 복원                         |
| **과금·관측성**  | 구독 결제만 존재, 토큰 원가 제어 및 추적 부재                   | **Redis `INCRBY` 원자적 월간 크레딧 가드**(`FREE`/`PRO` 티어 자동 라우팅) + **Langfuse 실시간 USD 원가·지연시간 추적**           |
| **UX / 디자인**  | 3개 독립 페이지 분리, 파스텔 그라데이션 + 3D 아이콘 랜딩        | **3단 통합 글쓰기 캔버스(`/workspace`)** + 화이트/바이올렛 에디토리얼 리뉴얼 + 공통 헤더·도움말 모달                             |

---

## 시스템 아키텍처

```text
[Next.js 14 App Router (3000)]
   ├─ /                 : 에디토리얼 랜딩 페이지
   ├─ /workspace        : 3단 통합 학술 글쓰기 캔버스 (PDF 요약 · 드래그 패러프레이징 · 인용 서랍)
   └─ /ai-stream-test   : 기능별 전용 페이지 (?tab=paraphrase | pdf | citation)
            │
            │  HTTP / SSE (text/event-stream)
            ▼
[Spring Boot 3.5.3 MVC · Java 17 (8080)]
   ├─ Redis Credit Guard (6379)      : 월간 크레딧 원자적 차감 및 FREE/PRO 티어별 모델 분기
   ├─ Unified Workspace DB (MySQL 3307) : workspace_folders / workspace_items 통합 저장
   ├─ Hybrid Citation Service        : Zotero (1969) → Crossref REST API → JSON LLM 폴백
   └─ LlmGatewayService (SseEmitter)
            │
            ▼
[LiteLLM Proxy Gateway (4000)] ──▶ [Langfuse Cloud] (토큰 · 지연시간 · USD 원가 추적)
   ├─ paraphrase-default ──▶ Anthropic Claude Sonnet 5.5 (3~5단계 학술 문체)
   ├─ paraphrase-fast    ──▶ Anthropic Claude Haiku 5.5  (FREE 티어 · 경량 교정 · 자동 폴백)
   ├─ summary-pdf        ──▶ Google Gemini 2.5 Flash     (네이티브 멀티모달 PDF 요약)
   └─ cite-fallback      ──▶ Anthropic Claude Haiku 5.5  (비정형 웹 서지 JSON 추출)
```

---

## 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, React Markdown (`remark-gfm`), TanStack Query, Zustand
- **Backend**: Java 17, Spring Boot 3.5.3, Spring Data JPA, Spring Security (OAuth2 + JWT + Async SSE), MySQL 8.0, Redis 7
- **AI / Infra**: Docker Compose, LiteLLM Proxy, Anthropic Claude 5.5, Google Gemini 2.5 Flash, Zotero Translation Server, Crossref REST API, Langfuse

---

## 로컬 실행 방법 (터미널 3개)

### 사전 준비

1. Docker Desktop 실행 (`Engine running` 확인)
2. 루트 `.env` 및 `fe/.env.local` 준비 (`.env.example` 참고해 `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, 선택적으로 `LANGFUSE_*` 입력)

### 1. 인프라 & LLM 게이트웨이 실행 (루트 폴더 `D:\phraiz`)

```powershell
cd D:\phraiz
docker compose up -d
docker compose ps
```

> `phraiz-mysql`(3307), `phraiz-redis`(6379), `phraiz-zotero`(1969), `phraiz-litellm`(4000) 4개 컨테이너가 모두 `Up` 상태인지 확인합니다.

### 2. Spring Boot 백엔드 실행 (새 터미널, `D:\phraiz\be`)

```powershell
cd D:\phraiz\be
.\gradlew bootRun
```

> `Started BackApplication` 로그가 뜨면 `http://localhost:8080`에서 API가 대기합니다. (터미널은 닫지 않고 유지합니다.)

### 3. Next.js 프론트엔드 실행 (새 터미널, `D:\phraiz\fe`)

```powershell
cd D:\phraiz\fe
npm install   # 최초 1회
npm run dev
```

> 브라우저에서 아래 주소로 접속합니다.
>
> - 메인 랜딩 페이지: `http://localhost:3000`
> - 통합 글쓰기 캔버스: `http://localhost:3000/workspace`
> - 기능별 페이지: `http://localhost:3000/ai-stream-test?tab=paraphrase` (`pdf` / `citation`)

---

## 프롬프트 & 파이프라인 회귀 평가

프롬프트나 모델 버전을 변경한 뒤 아래 스크립트로 핵심 품질(1단계 vs 5단계 변경률 분리, 영문 원어 유지, Crossref DOI 검증)을 자동 점검할 수 있습니다.

```powershell
cd D:\phraiz
python eval\run_prompt_eval.py
```

---

## 포트 요약

| 서비스                    |  포트  | 역할                                                   |
| :------------------------ | :----: | :----------------------------------------------------- |
| Next.js Frontend          | `3000` | 웹 UI (랜딩 · 통합 캔버스 · 워크벤치)                  |
| Spring Boot Backend       | `8080` | REST / SSE API · 크레딧 가드 · 하이브리드 인용         |
| LiteLLM Proxy             | `4000` | 멀티 LLM 라우팅 게이트웨이 · 자동 폴백 · Langfuse 콜백 |
| MySQL 8.0                 | `3307` | 통합 워크스페이스 및 회원/결제 DB                      |
| Redis 7                   | `6379` | 월간 크레딧 가드 · Refresh Token 캐시                  |
| Zotero Translation Server | `1969` | 무료 학술/웹 서지 메타데이터 추출                      |

---

## 단계별 설계 문서 (`docs/`)

- `docs/evolution-plan.html` — 기존 FE/BE 코드베이스 분석 및 멀티 LLM 전환 전략 리포트
- `docs/phase1-gateway.md` — 1단계: Docker 통합 환경 · LiteLLM 게이트웨이 · SSE 스트리밍
- `docs/phase2-features.md` — 2단계: 5단계 Diff 패러프레이징 · Gemini PDF 요약 · 하이브리드 인용
- `docs/phase3-workspace-quota.md` — 3단계: 9→2 테이블 통합 · Redis 크레딧 가드 · Langfuse 연동
- `docs/phase4-unified-canvas.md` — 4단계: 3단 통합 글쓰기 캔버스 · 회귀 평가 스크립트
