import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dbvsdc — 퇴직연금 DB vs DC 시뮬레이터",
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
      <body>{children}</body>
    </html>
  );
}
