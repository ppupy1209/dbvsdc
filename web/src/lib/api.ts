// 시장 데이터(지수 수익률 등) API 클라이언트.
// - NEXT_PUBLIC_API_BASE 가 설정되면 그 백엔드(Spring @ NCP)를 호출.
// - 미설정 시 같은 오리진의 /api/index-returns (개발용 mock) 호출.
// - 호출 실패 시 예시 데이터(SAMPLE_MARKET)로 폴백 → UI는 항상 동작.

import { addAverageDividendsToPriceReturns, MarketData, SAMPLE_MARKET } from "./indexData";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type DataSource = "live" | "sample";

export interface MarketDataResult {
  data: MarketData;
  source: DataSource;
  asOf?: string; // 데이터 기준일 (YYYY-MM-DD)
}

export async function fetchMarketData(): Promise<MarketDataResult> {
  try {
    const res = await fetch(`${BASE}/api/index-returns`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const dividendIncluded = j.dividendIncluded === true || j.returnBasis === "gross_total_return";
    return {
      data: {
        years: j.years,
        returns: dividendIncluded ? j.returns : addAverageDividendsToPriceReturns(j.returns),
        depositRate: j.depositRate,
        returnBasis: dividendIncluded ? "gross_total_return" : "price_return",
        currency: j.currency ?? "local",
        dividendIncluded: true,
        expenseIncluded: j.expenseIncluded === true,
      },
      source: j.source === "live" ? "live" : "sample",
      asOf: j.asOf,
    };
  } catch {
    return { data: SAMPLE_MARKET, source: "sample" };
  }
}
