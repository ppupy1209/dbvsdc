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
  ks: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  kq: [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
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
  // KOSPI 200: KRX official price index (코스피 200, ticker 1028, pykrx) + 1.8%p
  // average dividend approximation. 1991~2025; KRX gross TR is not publicly
  // available so price + avg dividend is retained. 2003~2025 cross-checked to
  // match the prior 1stock1 series exactly. (2026 dropped: partial year.)
  ks: [-8.62, 10.34, 30.93, 19.81, -10.09, -30.28, -35.87, 55.18, 102.02, -49.48, 39.08, -6.36, 33.53, 11.34, 55.75, 6.29, 31.94, -37.54, 53.4, 24.03, -10.41, 12.65, 1.92, -5.84, 0.3, 9.97, 26.7, -17.53, 13.93, 34.32, 3.06, -24.35, 24.78, -9.42, 92.47],
  // KOSDAQ 150: KRX official price index (코스닥 150, ticker 2203, pykrx) + 0.8%p
  // average dividend approximation. 2011~2025 (index base 2010-01-04). Replaces
  // the earlier KODEX ETF adjusted-close proxy with the official index.
  kq: [-2.43, -8.05, -1.96, 5.31, 23.27, -13.75, 51.83, -16.71, -10.92, 49.65, 0.26, -36.36, 46.29, -18.12, 37.76],
};

// Legacy helper for APIs that still return price returns. SAMPLE_MARKET.returns already include these yields.
export const DIVIDEND_YIELD: Record<IndexKey, number> = {
  sp: 0,
  nq: 0.8,
  dj: 2.1,
  ks: 1.8,
  kq: 0.8,
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
// A flat 3% across all history badly distorts the backtest — Korean deposits
// paid 13% in 1998 and ~1.2% in 2021. These are the OFFICIAL World Bank annual
// deposit interest rate for Korea (indicator FR.INR.DPST, annual average),
// fetched 2026-06. 1995 (World Bank null) and 2025 (not yet published) are
// provisional estimates, flagged below. Future mode keeps the single
// forward-looking DEPOSIT_RATE (2026 assumption).
// 출처: World Bank FR.INR.DPST (연평균). BOK ECOS 정기예금(신규취급액) 종가 기준으로의
// 정밀 교체는 잔여 과제. 1995·2025만 추정.
export const DEPOSIT_RATE_BY_YEAR: Record<number, number> = {
  // 1991~1995: ⚠️ 추정 (World Bank 미발표; 1990년대 초 한국 정기예금 ~10%대).
  // ks가 1991~로 확장돼 최악 시나리오 윈도우가 이 구간을 쓸 수 있어 채움.
  1991: 0.1, 1992: 0.1, 1993: 0.086, 1994: 0.085,
  1995: 0.088,
  1996: 0.1011, 1997: 0.1081, 1998: 0.1329, 1999: 0.0795, 2000: 0.0794,
  2001: 0.0579, 2002: 0.0495, 2003: 0.0425, 2004: 0.0387, 2005: 0.0372,
  2006: 0.045, 2007: 0.0517, 2008: 0.0587, 2009: 0.0348, 2010: 0.0386,
  2011: 0.0415, 2012: 0.037, 2013: 0.0289, 2014: 0.0254, 2015: 0.0181,
  2016: 0.0156, 2017: 0.0167, 2018: 0.0203, 2019: 0.0185, 2020: 0.0116,
  2021: 0.012, 2022: 0.0312, 2023: 0.0384, 2024: 0.0348,
  2025: 0.028, // ⚠️ 잠정 (World Bank 미발표, BOK 기준 추후 확정)
};

// ---------------------------------------------------------------------------
// Currency denomination per index, and the annual USD/KRW change.
// Overseas indices are quoted in USD; a Korean investor in an UNHEDGED ETF earns
// the USD index return PLUS the USD/KRW move. Applying this only matters for the
// backtest (real historical FX); future mode assumes no FX drift. Values are the
// year-over-year change of the OFFICIAL World Bank annual-average USD/KRW rate
// (indicator PA.NUS.FCRF), fetched 2026-06.
// ⚠️ 방법론 주의: 연평균 환율 기준이라 연말 급변동(예: 2008·2022 말의 급등)은
// 일부만 반영됩니다. 연말종가(BOK ECOS) 기준 정밀 교체는 잔여 과제. 2025는 잠정.
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
  1995: -0.0405, 1996: 0.0431, 1997: 0.1808, 1998: 0.4772, 1999: -0.1523,
  2000: -0.0497, 2001: 0.1419, 2002: -0.0304, 2003: -0.0479, 2004: -0.0381,
  2005: -0.1064, 2006: -0.0674, 2007: -0.0272, 2008: 0.1837, 2009: 0.161,
  2010: -0.0946, 2011: -0.0417, 2012: 0.0168, 2013: -0.0282, 2014: -0.0385,
  2015: 0.0742, 2016: 0.0264, 2017: -0.0256, 2018: -0.0273, 2019: 0.0593,
  2020: 0.0128, 2021: -0.0308, 2022: 0.1289, 2023: 0.011, 2024: 0.0442,
  2025: 0.03, // ⚠️ 잠정 (World Bank 미발표)
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
