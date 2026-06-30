// Annual index returns for the risky 70% sleeve, in each index's local currency.
// RETURNS are gross total return approximations.
// S&P 500 uses measured annual TR; other indices add fixed average dividend yields.
// FX, ETF total expense, tracking difference, trading cost, and hedge cost are not modeled here.

export type IndexKey = "sp" | "nq" | "dj" | "ks" | "kq";

export const INDEX_LABELS: Record<IndexKey, string> = {
  sp: "S&P 500",
  nq: "NASDAQ 100",
  dj: "Dow Jones 30",
  ks: "KOSPI 200",
  kq: "KOSDAQ 150",
};

export const YEARS: number[] = [
  1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
  2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020,
  2021, 2022, 2023, 2024, 2025,
];

export const RETURN_YEARS: Record<IndexKey, number[]> = {
  sp: YEARS,
  nq: YEARS,
  dj: YEARS,
  ks: [2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  kq: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
};

// Unit: percent. Arrays align with RETURN_YEARS for each index key.
// All arrays are total-return approximations.
export const RETURNS: Record<IndexKey, number[]> = {
  // S&P 500 annual total return, dividend reinvested.
  sp: [37.58, 22.96, 33.36, 28.58, 21.04, -9.1, -11.89, -22.1, 28.68, 10.88, 4.91, 15.79, 5.49, -37.0, 26.46, 15.06, 2.11, 16.0, 32.39, 13.69, 1.38, 11.96, 21.83, -4.38, 31.49, 18.4, 28.71, -18.11, 26.29, 25.02, 17.88],
  // Nasdaq 100 annual price return plus average dividend-yield approximation.
  nq: [43.34, 43.34, 21.43, 86.11, 102.75, -36.04, -31.85, -36.78, 49.92, 11.24, 2.29, 7.59, 19.47, -41.09, 54.34, 20.02, 3.5, 17.62, 35.79, 18.74, 9.23, 6.69, 32.32, -0.24, 38.76, 48.38, 27.43, -32.17, 54.61, 25.68, 20.97],
  // Dow Jones 30 annual price return plus average dividend-yield approximation.
  dj: [35.55, 28.11, 24.74, 18.2, 27.32, -4.07, -5, -14.66, 27.42, 5.25, 1.49, 18.39, 8.53, -31.74, 20.92, 13.12, 7.63, 9.36, 28.6, 9.62, -0.13, 15.52, 27.18, -3.53, 24.44, 9.35, 20.83, -6.68, 15.8, 14.98, 15.07],
  // KOSPI 200 annual price return plus 1.8%p average dividend-yield approximation.
  // 2003-2009 price returns from 1stock1.com (cross-checked: 2010 매치); 1995-2002 미확보(KRX 수동 필요).
  ks: [33.53, 11.34, 55.75, 6.29, 31.94, -37.54, 53.4, 24.03, -10.41, 12.65, 1.92, -5.84, 0.3, 9.97, 26.7, -17.53, 13.93, 34.32, 3.06, -24.35, 24.78, -9.42, 92.47],
  // KOSDAQ 150 proxy: KODEX KOSDAQ150 ETF adjusted-close return.
  kq: [-14.62, 53.8, -16.95, -10.62, 50.22, -1.57, -35.66, 45.18, -19.0, 37.37],
};

// Legacy helper for APIs that still return price returns. SAMPLE_MARKET.returns already include these yields.
export const DIVIDEND_YIELD: Record<IndexKey, number> = {
  sp: 0,
  nq: 0.8,
  dj: 2.1,
  ks: 1.8,
  kq: 0,
};

export const INDEX_KEYS: IndexKey[] = ["sp", "nq", "dj", "ks", "kq"];

// Product-level implementation cost for the risky (70%) sleeve, modeled per index
// via a representative tracking ETF. We use 실부담비용률 (real cost burden = TER +
// 매매·중개비용 등), an annual fraction — not the headline TER, which fee competition
// has pushed misleadingly low. These are representative, editable defaults; refine per
// product when better data exists. Source: issuer disclosures / 실부담비용 비교 (as of 2026-06).
export interface IndexCost {
  etf: string; // representative KRW-listed tracking ETF
  realCost: number; // 실부담비용률, annual fraction (e.g. 0.0019 = 0.19%)
  verified: boolean; // false = representative estimate, not separately sourced
}

export const INDEX_COST: Record<IndexKey, IndexCost> = {
  sp: { etf: "TIGER 미국S&P500", realCost: 0.0014, verified: true },
  nq: { etf: "TIGER 미국나스닥100", realCost: 0.0015, verified: true },
  dj: { etf: "TIGER 미국다우존스30", realCost: 0.0018, verified: false },
  ks: { etf: "KODEX 200", realCost: 0.0019, verified: true },
  kq: { etf: "KODEX 코스닥150", realCost: 0.0032, verified: true },
};

// Average real cost burden across the selected indices (annual fraction).
export function costForIndices(indices: IndexKey[]): number {
  if (!indices.length) return 0;
  return indices.reduce((sum, k) => sum + (INDEX_COST[k]?.realCost ?? 0), 0) / indices.length;
}

// ---------------------------------------------------------------------------
// Year-by-year safe-asset deposit rate (30% sleeve).
// A flat 3% across all history badly distorts the backtest — Korean 1-year time
// deposits paid 10%+ in 1998 and ~1% in 2020. These are APPROXIMATE annual
// averages (예금은행 정기예금, 신규취급액 기준), curated like the dividend/cost
// approximations and pending verification against the official BOK ECOS series.
// Future mode keeps the single forward-looking DEPOSIT_RATE (2026 assumption).
// ⚠️ 추정·검증 필요 (공식: 한국은행 ECOS 예금은행 정기예금 금리).
export const DEPOSIT_RATE_BY_YEAR: Record<number, number> = {
  1995: 0.089, 1996: 0.075, 1997: 0.11, 1998: 0.135, 1999: 0.079, 2000: 0.072,
  2001: 0.057, 2002: 0.048, 2003: 0.042, 2004: 0.038, 2005: 0.036, 2006: 0.045,
  2007: 0.051, 2008: 0.058, 2009: 0.033, 2010: 0.034, 2011: 0.039, 2012: 0.035,
  2013: 0.027, 2014: 0.025, 2015: 0.017, 2016: 0.015, 2017: 0.017, 2018: 0.02,
  2019: 0.018, 2020: 0.011, 2021: 0.013, 2022: 0.033, 2023: 0.038, 2024: 0.035,
  2025: 0.029,
};

// ---------------------------------------------------------------------------
// Currency denomination per index, and an approximate annual USD/KRW change.
// Overseas indices are quoted in USD; a Korean investor in an UNHEDGED ETF earns
// the USD index return PLUS the USD/KRW move. Applying this only matters for the
// backtest (real historical FX); future mode assumes no FX drift. Values are the
// annual % change of the year-end USD/KRW rate, APPROXIMATE and pending
// verification (공식: 한국은행 ECOS 원/달러 종가).
// ⚠️ 추정·검증 필요.
export const CURRENCY: Record<IndexKey, "USD" | "KRW"> = {
  sp: "USD",
  nq: "USD",
  dj: "USD",
  ks: "KRW",
  kq: "KRW",
};

export function isUsdIndex(key: IndexKey): boolean {
  return CURRENCY[key] === "USD";
}

export const USDKRW_RETURN_BY_YEAR: Record<number, number> = {
  1995: -0.018, 1996: 0.09, 1997: 1.008, 1998: -0.29, 1999: -0.055, 2000: 0.112,
  2001: 0.039, 2002: -0.097, 2003: 0.01, 2004: -0.136, 2005: -0.023, 2006: -0.08,
  2007: 0.007, 2008: 0.346, 2009: -0.075, 2010: -0.026, 2011: 0.015, 2012: -0.07,
  2013: -0.015, 2014: 0.042, 2015: 0.066, 2016: 0.031, 2017: -0.113, 2018: 0.042,
  2019: 0.036, 2020: -0.061, 2021: 0.095, 2022: 0.064, 2023: 0.02, 2024: 0.141,
  2025: -0.062,
};

// ---------------------------------------------------------------------------
// Data integrity validation.
// The class of bug that silently corrupts a backtest is *structural*: a returns
// array drifting out of sync with its year axis (a dropped/extra cell, a column
// shift). validateMarketData catches that hard. It also surfaces extreme yearly
// values as soft warnings — NOT errors — because real markets do post extreme
// years (KOSPI 200 +92% in 2025's semiconductor rally, NASDAQ +102% in 1999).
// A hard reject on outliers would throw away correct data, so we only warn.
// ---------------------------------------------------------------------------
export interface DataIssue {
  level: "error" | "warn";
  key: IndexKey;
  message: string;
}

// Returns outside this band are flagged for a human to eyeball, not rejected.
const SANITY_RETURN_PCT = { min: -60, max: 110 };

export function validateMarketData(data: MarketData): DataIssue[] {
  const issues: DataIssue[] = [];
  for (const key of INDEX_KEYS) {
    const years = data.returnYears?.[key] ?? data.years;
    const returns = data.returns[key] ?? [];

    if (returns.length !== years.length) {
      issues.push({
        level: "error",
        key,
        message: `returns(${returns.length}) and years(${years.length}) length mismatch — backtest axis is misaligned`,
      });
    }

    for (let i = 0; i < returns.length; i++) {
      const v = returns[i];
      const year = years[i];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        issues.push({ level: "error", key, message: `non-numeric return at ${year ?? `idx ${i}`}` });
      } else if (v < SANITY_RETURN_PCT.min || v > SANITY_RETURN_PCT.max) {
        issues.push({
          level: "warn",
          key,
          message: `extreme return ${v}% at ${year ?? `idx ${i}`} — verify against official source`,
        });
      }
    }

    // Year axis must be strictly ascending so slicing the last N years is correct.
    for (let i = 1; i < years.length; i++) {
      if (years[i] <= years[i - 1]) {
        issues.push({
          level: "error",
          key,
          message: `years not strictly ascending around ${years[i - 1]}→${years[i]}`,
        });
      }
    }
  }
  return issues;
}

export function yearsForIndex(data: MarketData, key: IndexKey): number[] {
  return data.returnYears?.[key] ?? data.years;
}

export function availableReturnYears(data: MarketData, indices: IndexKey[]): number[] {
  if (!indices.length) return data.years;
  const [first, ...rest] = indices;
  const common = new Set(yearsForIndex(data, first));
  for (const key of rest) {
    const years = new Set(yearsForIndex(data, key));
    for (const year of Array.from(common)) {
      if (!years.has(year)) common.delete(year);
    }
  }
  return Array.from(common).sort((a, b) => a - b);
}

export function addAverageDividendsToPriceReturns(
  returns: Record<IndexKey, number[]>
): Record<IndexKey, number[]> {
  return INDEX_KEYS.reduce((acc, key) => {
    const dividend = DIVIDEND_YIELD[key] ?? 0;
    acc[key] = returns[key].map((v) => Number((v + dividend).toFixed(2)));
    return acc;
  }, {} as Record<IndexKey, number[]>);
}

// 지수 설명 + 주요 구성 기업 (선택 시 표시)
export interface IndexMeta {
  desc: string;
  companies: string[];
}
export const INDEX_META: Record<IndexKey, IndexMeta> = {
  sp: {
    desc: "미국 대형주 500개로 구성된 미국 대표 지수. 전 업종을 폭넓게 반영합니다.",
    companies: ["애플", "엔비디아", "JP모건", "엑손모빌", "비자", "월마트"],
  },
  nq: {
    desc: "NASDAQ 상장 비금융 대형주 100개로 구성. 기술주 비중이 높아 성장성이 크지만 변동성도 큰 편입니다.",
    companies: ["애플", "마이크로소프트", "엔비디아", "아마존", "메타"],
  },
  dj: {
    desc: "미국 대표 우량주 30개로 구성된 가장 오래된 지수. 가격가중 방식이라 고가 종목의 영향이 큽니다.",
    companies: ["골드만삭스", "마이크로소프트", "캐터필러", "유나이티드헬스", "애플"],
  },
  ks: {
    desc: "한국 유가증권시장 대표 대형주 200개로 구성된 지수. 국내 DC ETF에서 가장 흔한 한국 주식 벤치마크입니다.",
    companies: ["삼성전자", "SK하이닉스", "LG에너지솔루션", "삼성바이오로직스", "현대차"],
  },
  kq: {
    desc: "KOSDAQ 대표 종목 150개를 담는 성장주 중심 지수. 현재 데이터는 KODEX KOSDAQ150 ETF 조정종가 프록시입니다.",
    companies: ["에코프로비엠", "알테오젠", "에코프로", "HLB", "엔켐"],
  },
};

// 시뮬레이터가 소비하는 시장 데이터. 백엔드 API 응답도 이 형태로 맞춘다.
export interface MarketData {
  years: number[];
  returns: Record<IndexKey, number[]>; // array length follows returnYears[key] when provided, unit: %
  returnYears?: Partial<Record<IndexKey, number[]>>;
  depositRate: number; // forward/fallback safe-asset rate for the 30% sleeve, e.g. 0.03
  depositRateByYear?: Record<number, number>; // per-year safe rate used in backtests
  fxUsdKrwByYear?: Record<number, number>; // annual USD/KRW change for KRW conversion
  returnBasis?: "gross_total_return" | "price_return";
  currency?: "local";
  dividendIncluded?: boolean;
  expenseIncluded?: boolean;
}

// API 미연동 시 폴백으로 쓰는 예시 데이터.
export const SAMPLE_MARKET: MarketData = {
  years: YEARS,
  returns: RETURNS,
  returnYears: RETURN_YEARS,
  depositRate: 0.03,
  depositRateByYear: DEPOSIT_RATE_BY_YEAR,
  fxUsdKrwByYear: USDKRW_RETURN_BY_YEAR,
  returnBasis: "gross_total_return",
  currency: "local",
  dividendIncluded: true,
  expenseIncluded: false,
};
