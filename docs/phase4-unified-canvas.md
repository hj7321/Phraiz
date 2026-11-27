# Phraiz 1인 리빌드 — Phase 4: 통합 학술 글쓰기 캔버스 & 프롬프트 회귀 평가셋

분리되어 있던 패러프레이징·PDF 요약·인용 생성을 **하나의 3단 통합 글쓰기 워크스페이스(`/workspace`)**로 연결하는 최종 4단계 코드 패키지입니다.

## 포함된 구성

1. **통합 학술 글쓰기 캔버스 (`http://localhost:3000/workspace`)**
   - **좌측 (PDF 요약 패널)**: 드래그 앤 드롭 PDF 업로드 → Gemini 2.5 Flash 실시간 요약 → **에디터로 삽입** 원클릭 연동
   - **중앙 (글쓰기 에디터 + 드래그 패러프레이징)**: 본문에서 문장을 **드래그(선택)**하면 즉시 5단계 패러프레이징 실행 → **어절 단위 Diff 하이라이트** 확인 후 **본문에 반영(자동 치환)**
   - **우측 (하이브리드 인용 서랍)**: Zotero + Crossref 검증 + LLM 폴백으로 논문을 추출해 라이브러리에 쌓아두고, **본문 인용 `(Author, Year)` 삽입** 및 **하단 `## References` 자동 추가**
   - **상단 바**: `FREE`/`PRO` 크레딧 가드, 통합 DB(`workspace_items`) 원클릭 저장, `.md` 마크다운 내보내기
2. **프롬프트 회귀 평가 스크립트 (`eval/run_prompt_eval.py`)**
   - 패러프레이징 1단계 vs 5단계 변경률 비교, 영어 원어 유지 여부, Crossref DOI 검증 여부를 자동 점검

## 적용 방법

1. **Windows 파일 탐색기(`Win + E`)로 프론트엔드 병합**
   - `phraiz-phase4\fe\src` 폴더를 복사해 `D:\phraiz\fe\` 안에 붙여넣기 (덮어쓰기)
   - `phraiz-phase4\eval` 폴더를 `D:\phraiz\` 루트에 복사
   - `phraiz-phase4\README.md`는 `D:\phraiz\docs\phase4-unified-canvas.md`로 보관

2. **브라우저에서 바로 열기** (백엔드·Docker·FE가 켜져 있다면 별도 재시작 없이 바로 접속 가능)
   - **`http://localhost:3000/workspace`** 접속

3. **프롬프트 회귀 평가 실행 (선택)**
   ```powershell
   cd D:\phraiz
   python eval\run_prompt_eval.py
   ```
