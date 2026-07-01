import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DB vs DC",
  description:
    "내 조건에서 퇴직연금 DB형과 DC형 중 어느 쪽이 유리한지, 과거 수익률 백테스트와 미래 시뮬레이션·세금까지 비교합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();",
          }}
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.css"
          precedence="high"
        />
        {/* 한글 줄바꿈 다듬기: 본문은 pretty(마지막 줄에 단어 하나만 남는 고아 줄 방지),
            제목은 balance(줄 길이를 고르게). globals.css에 두면 Lightning CSS가 제거하므로
            여기 인라인 <style>로 주입한다(빌드 파이프라인을 거치지 않음). */}
        <style href="global-typography" precedence="high">{`
          body { text-wrap: pretty; }
          h1, h2, h3, h4 { text-wrap: balance; }
        `}</style>
        {children}
      </body>
    </html>
  );
}
