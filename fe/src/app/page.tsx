import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-violet-100 selection:text-violet-900">
      {/* Sticky Minimal Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
            <span className="text-lg font-bold tracking-tight text-slate-950">
              Phraiz
            </span>
            <span className="hidden rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 sm:inline-block">
              v2.0
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-slate-950">
              핵심 기능
            </a>
            <a href="#architecture" className="transition hover:text-slate-950">
              멀티 LLM 설계
            </a>
            <Link
              href="/ai-stream-test"
              className="transition hover:text-slate-950"
            >
              기능 워크벤치
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/ai-stream-test"
              className="hidden rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-block"
            >
              개별 테스트
            </Link>
            <Link
              href="/workspace"
              className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
            >
              워크스페이스 시작 →
            </Link>
          </div>
        </div>
      </header>

      {/* Editorial SaaS Hero */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-violet-100/50 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50/70 px-3.5 py-1 text-xs font-medium text-violet-800">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
              Multi-LLM Academic Workspace · Claude 5.5 · Gemini 2.5 · Crossref
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl md:text-[54px] md:leading-[1.15]">
              논문 요약부터 문체 교정,
              <br className="hidden sm:inline" /> 검증된 인용까지{" "}
              <span className="text-violet-700">하나의 캔버스에서.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              단일 모델에 의존하던 기존 AI 글쓰기 도구의 한계를 넘어, 작업별로
              가장 뛰어난 모델과 결정론적 인용 검증을 결합했습니다. PDF를 읽고,
              문장을 드래그해 5단계로 다듬고, DOI가 검증된 참고문헌까지 한
              흐름으로 완성하세요.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/workspace"
                className="rounded-xl bg-violet-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
              >
                통합 글쓰기 캔버스 열기 →
              </Link>
              <Link
                href="/ai-stream-test"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                기능별 워크벤치 체험
              </Link>
            </div>
          </div>

          {/* 3-Pane Product UI Showcase */}
          <div className="mt-16 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.16)] sm:p-4">
            <div className="mb-3 flex items-center justify-between px-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="ml-2 text-xs font-medium text-slate-500">
                  phraiz.app / workspace — CAGE 기반 RAG 연구 초안
                </span>
              </div>
              <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-slate-200">
                SSE Streaming Live
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              {/* Left: Gemini PDF Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-900">
                    1. PDF 멀티모달 요약
                  </span>
                  <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
                    Gemini 2.5
                  </span>
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] font-medium text-slate-700">
                  CAGE_Coherence-Aware_RAG.pdf
                </div>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                  <li>
                    <strong className="text-slate-900">핵심 제안:</strong> 청크
                    간 일관성을 4개 차원으로 분해해 R-GCN으로 리랭킹
                  </li>
                  <li>
                    <strong className="text-slate-900">Table 1 수치:</strong>{" "}
                    2Wiki Recall@5{" "}
                    <span className="font-mono text-teal-700">85.4</span> ·
                    HotpotQA{" "}
                    <span className="font-mono text-teal-700">84.2</span>
                  </li>
                </ul>
              </div>

              {/* Center: Editor + 5-Step Diff */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-900">
                    2. 드래그 패러프레이징 · 4단계 구조 재구성
                  </span>
                  <span className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                    Claude Sonnet 5.5 · 변경률 68%
                  </span>
                </div>
                <div className="mt-3 space-y-3 text-xs leading-6 text-slate-700">
                  <p className="text-sm font-bold text-slate-950"># 1. 서론</p>
                  <div className="rounded-lg border border-violet-200/80 bg-violet-50/30 p-3">
                    <span className="bg-red-100 text-red-700 line-through">
                      기존 RAG는 문서 조각을 따로 점수 매겨서 합치면 말이 안
                      맞는 문제가 자주 생긴다.
                    </span>{" "}
                    <span className="bg-emerald-100 font-medium text-emerald-900">
                      기존 RAG 시스템은 각 청크를 독립적으로 평가하므로, 결합된
                      전체 문맥에서 논리적 불일치가 빈번하게 발생한다
                    </span>{" "}
                    <span className="rounded bg-violet-100 px-1 py-0.5 font-mono text-[11px] text-violet-800">
                      (LeCun et al., 2015)
                    </span>
                    .
                  </div>
                </div>
              </div>

              {/* Right: Verified Citation Drawer */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-900">
                    3. 하이브리드 인용
                  </span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    DOI 검증됨
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="font-semibold text-slate-900">
                    Deep learning
                  </div>
                  <div className="text-[11px] text-slate-500">
                    LeCun, Y., Bengio, Y., &amp; Hinton, G. (2015) · Nature,
                    521(7553), 436–444
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      APA
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      IEEE
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      BibTeX
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-violet-700 uppercase">
            Task-Specialized Multi-LLM
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            모든 기능에 같은 모델을 쓰지 않습니다
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            문체 교정, 장문 PDF 독해, 서지 인용은 요구하는 역량과 원가 구조가
            완전히 다릅니다. Phraiz는 각 기능에 최적화된 모델과 검증
            파이프라인을 분업 배치합니다.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 border-t border-slate-200 pt-10 md:grid-cols-3">
          <div>
            <div className="font-mono text-xs font-semibold text-violet-700">
              01 · PARAPHRASE
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-950">
              5단계 정밀 강도 &amp; 어절 Diff
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              최소 맞춤법 교정(1단계)부터 전면 재작성(5단계)까지 단계별 규칙과
              예시를 적용합니다. 주력 모델(Claude Sonnet 5.5)과 경량 모델(Haiku
              5.5)을 티어별로 자동 분기하며, 변경된 어절과 변경률을 즉시
              시각화합니다.
            </p>
          </div>

          <div>
            <div className="font-mono text-xs font-semibold text-teal-700">
              02 · NATIVE PDF SUMMARY
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-950">
              2단 논문·표·수식 직접 해석
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              레이아웃이 깨지기 쉬운 텍스트 추출(PDFBox)을 제거하고 Gemini 2.5
              Flash에 PDF 바이너리를 직접 전달합니다. 학술 초록·섹션별·불릿
              요약을 마크다운 표와 함께 실시간 스트리밍합니다.
            </p>
          </div>

          <div>
            <div className="font-mono text-xs font-semibold text-slate-700">
              03 · HYBRID CITATION
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-950">
              결정론 우선 · DOI 실존 검증
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              1차로 무료 Zotero Translation Server를 호출하고, DOI가 감지되면
              Crossref 공식 API로 서지정보를 교차 검증합니다. 비정형
              웹페이지에만 경량 LLM JSON 폴백을 사용해 인용 환각과 API 비용을
              동시에 줄입니다.
            </p>
          </div>
        </div>
      </section>

      {/* Backend Engineering Proof Band */}
      <section
        id="architecture"
        className="border-y border-slate-200 bg-slate-50/80 py-20"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold tracking-wider text-violet-700 uppercase">
                Backend Engineering
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                1인 운영이 가능하도록 백엔드부터 다시 설계했습니다
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                팀 프로젝트 당시의 단일 동기 호출과 3중 중복 스키마를 걷어내고,
                실제 서비스 운영에 필요한 스트리밍·비용 가드·관측성 파이프라인을
                구축했습니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-7">
              <div className="border-t-2 border-slate-900 pt-4">
                <div className="font-mono text-2xl font-bold text-violet-700">
                  LiteLLM + SSE
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  멀티 프로바이더 게이트웨이 &amp; 자동 폴백
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Spring Boot 코드 수정 없이 설정만으로 모델을 교체하고, 장애 시
                  경량 모델로 자동 전환하며 토큰 단위로 실시간 스트리밍합니다.
                </p>
              </div>

              <div className="border-t-2 border-slate-900 pt-4">
                <div className="font-mono text-2xl font-bold text-violet-700">
                  9 → 2 Tables
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  단일 워크스페이스 도메인 통합
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  패러프레이징·요약·인용에 복제돼 있던 Folder–History–Content
                  테이블을 통합해 한 프로젝트 폴더에서 모든 작업물을 관리합니다.
                </p>
              </div>

              <div className="border-t-2 border-slate-900 pt-4">
                <div className="font-mono text-2xl font-bold text-violet-700">
                  Redis Guard
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  원자적 월간 크레딧 &amp; 티어별 라우팅
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Redis INCRBY 기반 동시성 안전한 크레딧 차감으로 무료/유료
                  티어별 모델과 PDF 기능을 제어해 원가 역마진을 방지합니다.
                </p>
              </div>

              <div className="border-t-2 border-slate-900 pt-4">
                <div className="font-mono text-2xl font-bold text-violet-700">
                  Langfuse
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  토큰·USD 원가 실시간 관측성
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  모든 LLM 호출의 프롬프트, 지연시간, 모델별 USD 비용을 자동
                  추적하고 회귀 평가 스크립트로 품질 저하를 점검합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA & Footer */}
      <footer className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-start justify-between gap-6 border-b border-slate-200 pb-12 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">
              지금 통합 워크스페이스에서 바로 써보세요
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              논문 PDF 업로드부터 드래그 패러프레이징, DOI 검증 인용까지 한
              화면에서 이어집니다.
            </p>
          </div>
          <Link
            href="/workspace"
            className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Phraiz Canvas 열기 →
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>© 2026 Phraiz · Rebuilt with Multi-LLM Architecture</div>
          <div className="flex gap-5">
            <Link href="/workspace" className="hover:text-slate-900">
              통합 캔버스
            </Link>
            <Link href="/ai-stream-test" className="hover:text-slate-900">
              기능 워크벤치
            </Link>
            <a
              href="https://github.com/SSU-IT-Contest"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
