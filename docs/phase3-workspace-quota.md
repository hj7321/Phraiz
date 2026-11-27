# Phraiz 1인 리빌드 — Phase 3: 단일 워크스페이스 통합 · Redis 크레딧 가드 · Langfuse 관측성

Phase 2 위에 바로 병합하는 3단계 코드 패키지입니다.

## 포함된 구성

1. **3중 중복 스키마 → 단일 워크스페이스 2테이블 통합 (`com.phraiz.back.workspace`)**
   - `workspace_folders` + `workspace_items` (`PARAPHRASE | SUMMARY | CITATION` 통합 저장)
   - 폴더 생성/조회/삭제, 작업물 저장/조회/필터링/폴더 이동/삭제 API (`/api/v2/workspace/**`)
2. **Redis 기반 월간 크레딧 · 요금제 티어별 과금 가드 (`com.phraiz.back.ai.quota`)**
   - Redis `INCRBY` 원자적 차감 + 월간 TTL로 동시 요청 레이스 컨디션 방지
   - `FREE` 티어는 월 50크레딧 제한 + 패러프레이징 시 자동으로 경량 모델(`paraphrase-fast`, Haiku 5.5) 라우팅
   - `PRO` 티어는 월 1,000크레딧 + 주력 모델(`paraphrase-default`, Sonnet 5.5) 및 Gemini PDF 허용
   - 잔여 크레딧 조회 API (`GET /api/v2/ai/quota`)
3. **Langfuse LLM 관측성 연동 (`litellm/config.yaml` + `.env.langfuse.example`)**
   - 백엔드 Java 코드 수정 없이 LiteLLM 콜백만으로 모든 호출의 토큰·USD 원가·지연시간·입출력을 Langfuse에 자동 기록
4. **프론트엔드 크레딧 바 & 통합 워크스페이스 탭 (`fe/src/...`)**
   - 화면 상단에서 `FREE` / `PRO` 요금제를 실시간 전환하며 크레딧 차감과 모델 강제 분기를 테스트 가능

## 적용 방법

1. **파일 병합 (Windows 파일 탐색기 `Win + E` 사용)**
   - `phraiz-phase3\be\src` → `D:\phraiz\be\`에 붙여넣기 (덮어쓰기)
   - `phraiz-phase3\fe\src` → `D:\phraiz\fe\`에 붙여넣기 (덮어쓰기)

2. **`SecurityConfig.java`에 1줄 추가**
   - `be/src/main/java/com/phraiz/back/common/security/SecurityConfig.java`의 `permitAll()` 목록에서 `"/api/v2/ai/**",` 바로 아래에 `"/api/v2/workspace/**",` 한 줄을 추가하세요.

3. **백엔드 재시작**
   - `D:\phraiz\be`에서 `.\gradlew bootRun`을 재시작하면 MySQL에 `workspace_folders`, `workspace_items` 2개 테이블이 자동 생성됩니다.

4. **(선택) Langfuse 원가 대시보드 활성화**
   - https://cloud.langfuse.com 무료 계정 생성 후 프로젝트 키 발급
   - `.env.langfuse.example`의 3줄을 `D:\phraiz\.env`에 추가
   - `docker-compose.yml`의 `litellm` `environment:`에 3줄 추가 후 `litellm/config.yaml`을 패키지 내 파일로 교체하고 `docker compose up -d` 실행
