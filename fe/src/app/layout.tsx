import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "./_provider";
import Script from "next/script";
import Analytics from "./Analytics";
import { Suspense } from "react";
import TopButton from "@/components/layout/TopButton";
import ScrollToTop from "@/components/layout/ScrollToTop";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.phraiz.com"),
  title: { default: "Phraiz", template: "%s | Phraiz" },
  description:
    "문장 변환, 요약, 인용 생성을 지원하는 멀티 LLM 기반 통합 학술 글쓰기 워크스페이스",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://www.phraiz.com/",
    title: "Phraiz",
    description:
      "논문 요약부터 문체 교정, 검증된 인용까지 하나의 캔버스에서 완성하세요.",
    images: ["/opengraph/main.jpg"],
  },
};

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-white text-slate-900 antialiased">
        {GTM_ID && (
          <>
            <Script
              id="gtm-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                  })(window,document,'script','dataLayer','${GTM_ID}');
                `,
              }}
            />
            <noscript
              dangerouslySetInnerHTML={{
                __html: `
                  <iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
                          height="0" width="0" style="display:none;visibility:hidden"></iframe>
                `,
              }}
            />
          </>
        )}

        <Suspense fallback={null}>
          <Analytics />
        </Suspense>

        <QueryProvider>
          <ScrollToTop />
          <div className="min-h-screen w-full">{children}</div>
          <div className="hidden lg:block">
            <TopButton />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
