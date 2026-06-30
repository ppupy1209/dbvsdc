// 시장 데이터(지수 수익률 등) API 클라이언트.
// - NEXT_PUBLIC_API_BASE 가 설정되면 그 백엔드(Spring @ NCP)를 호출.
// - 미설정 시 같은 오리진의 /api/index-returns (개발용 mock) 호출.
// - 호출 실패 시 예시 데이터(SAMPLE_MARKET)로 폴백 → UI는 항상 동작.

import { addAverageDividendsToPriceReturns, MarketData, SAMPLE_MARKET, validateMarketData } from "./indexData";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// In dev, surface any structural data problem (misaligned axis, NaN, typo-scale
// outlier) the moment market data arrives, so a bad edit never ships silently.
function auditMarketData(data: MarketData, source: DataSource): void {
  if (process.env.NODE_ENV === "production") return;
  for (const issue of validateMarketData(data)) {
    const tag = `[market-data:${source}:${issue.key}]`;
    if (issue.level === "error") console.error(tag, issue.message);
    else console.warn(tag, issue.message);
  }
}

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
    const source: DataSource = j.source === "live" ? "live" : "sample";
    const data: MarketData = {
      years: j.years,
      returns: dividendIncluded ? j.returns : addAverageDividendsToPriceReturns(j.returns),
      returnYears: j.returnYears,
      depositRate: j.depositRate,
      // Per-year deposit / FX series are optional; fall back to the sample
      // constants so the features work even if a backend omits them (live
      // backend should add them to its contract — see TODO).
      depositRateByYear: j.depositRateByYear ?? SAMPLE_MARKET.depositRateByYear,
      fxUsdKrwByYear: j.fxUsdKrwByYear ?? SAMPLE_MARKET.fxUsdKrwByYear,
      returnBasis: dividendIncluded ? "gross_total_return" : "price_return",
      currency: j.currency ?? "local",
      dividendIncluded: true,
      expenseIncluded: j.expenseIncluded === true,
    };
    auditMarketData(data, source);
    return { data, source, asOf: j.asOf };
  } catch {
    auditMarketData(SAMPLE_MARKET, "sample");
    return { data: SAMPLE_MARKET, source: "sample" };
  }
}
