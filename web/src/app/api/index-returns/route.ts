// ⚠️ 개발용 MOCK 엔드포인트.
// 실서비스에서는 이 응답을 Spring 백엔드(@ NCP)가 대체한다:
//   - 공공데이터포털/KRX/KIS 일배치 수집 → MySQL 캐싱 → 동일 JSON 형태로 서빙
//   - source: "live", asOf: 데이터 기준일 반환
// 계약(스키마)은 docs/api-spec.md 참조. 프론트는 NEXT_PUBLIC_API_BASE로 백엔드를 가리키면 됨.

import { NextResponse } from "next/server";
import { SAMPLE_MARKET } from "@/lib/indexData";

export function GET() {
  return NextResponse.json({
    asOf: new Date().toISOString().slice(0, 10),
    source: "sample",
    returnBasis: SAMPLE_MARKET.returnBasis,
    currency: SAMPLE_MARKET.currency,
    dividendIncluded: SAMPLE_MARKET.dividendIncluded,
    expenseIncluded: SAMPLE_MARKET.expenseIncluded,
    years: SAMPLE_MARKET.years,
    depositRate: SAMPLE_MARKET.depositRate,
    returns: SAMPLE_MARKET.returns,
    returnYears: SAMPLE_MARKET.returnYears,
  });
}
