import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DB vs DC",
  description:
    "내 조건에서 퇴직연금 DB형과 DC형 중 어느 쪽이 유리한지, 과거 수익률 백테스트와 미래 예측·세금까지 비교합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.css"
          precedence="high"
        />
        {children}
      </body>
    </html>
  );
}
