import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 프로덕션 이미지를 위한 최소 실행 번들(.next/standalone) 생성
  output: "standalone",
};

export default nextConfig;
