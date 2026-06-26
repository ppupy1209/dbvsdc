// Annual index returns for the risky 70% sleeve, in each index's local currency.
// RETURNS are gross total return approximations before ETF/account costs.
// S&P 500 uses measured annual TR; other indices add fixed average dividend yields.
// FX, ETF total expense, tracking difference, trading cost, and hedge cost are not in this file.
// calc.ts applies conservative implementation-cost haircuts.

export type IndexKey = "sp" | "nq" | "dj" | "ks" | "kq";

export const INDEX_LABELS: Record<IndexKey, string> = {
  sp: "S&P 500",
  nq: "나스닥100",
  dj: "다우존스",
  ks: "코스피",
  kq: "코스닥",
};

export const YEARS: number[] = [
  1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
  2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020,
  2021, 2022, 2023, 2024, 2025,
];

// Arrays have the same length as YEARS. Unit: percent.
// All arrays are gross total return approximations before costs.
export const RETURNS: Record<IndexKey, number[]> = {
  // S&P500 연간 총수익(TR, 배당 재투자 포함) — slickcharts
  sp: [37.58, 22.96, 33.36, 28.58, 21.04, -9.1, -11.89, -22.1, 28.68, 10.88, 4.91, 15.79, 5.49, -37.0, 26.46, 15.06, 2.11, 16.0, 32.39, 13.69, 1.38, 11.96, 21.83, -4.38, 31.49, 18.4, 28.71, -18.11, 26.29, 25.02, 17.88],
  // 나스닥100 연간 가격수익률 — slickcharts (1995·1996 동일값 42.54 확인 필요)
  nq: [43.34, 43.34, 21.43, 86.11, 102.75, -36.04, -31.85, -36.78, 49.92, 11.24, 2.29, 7.59, 19.47, -41.09, 54.34, 20.02, 3.5, 17.62, 35.79, 18.74, 9.23, 6.69, 32.32, -0.24, 38.76, 48.38, 27.43, -32.17, 54.61, 25.68, 20.97],
  // 다우존스 연간 가격수익률 — slickcharts
  dj: [35.55, 28.11, 24.74, 18.2, 27.32, -4.07, -5, -14.66, 27.42, 5.25, 1.49, 18.39, 8.53, -31.74, 20.92, 13.12, 7.63, 9.36, 28.6, 9.62, -0.13, 15.52, 27.18, -3.53, 24.44, 9.35, 20.83, -6.68, 15.8, 14.98, 15.07],
  ks: [-12.2, -24.2, -40.2, 50.8, 84.8, -49.2, 38.8, -8.2, 30.8, 11.8, 55.8, 5.8, 34.1, -38.9, 51.5, 23.7, -9.2, 11.2, 2.5, -3, 4.2, 5.1, 23.6, -15.5, 9.5, 32.6, 5.4, -23.1, 20.5, -7.8, 77.4],
  kq: [0.6, -27.4, -42.4, 89.6, 241.6, -78.4, 37.6, -38.4, 1.6, -15.4, 84.6, -12.4, 16.6, -52.2, 55.3, 1.2, -0.9, 1.5, 1.3, 9.2, 26.3, -6.9, 27, -14.8, -0.3, 45.2, 7.4, -33.7, 28.2, -21.1, 37.1],
};

// Legacy helper for APIs that still return price returns. SAMPLE_MARKET.returns already include these yields.
export const DIVIDEND_YIELD: Record<IndexKey, number> = {
  sp: 0,
  nq: 0.8,
  dj: 2.1,
  ks: 1.8,
  kq: 0.6,
};

export const INDEX_KEYS: IndexKey[] = ["sp", "nq", "dj", "ks", "kq"];

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
    desc: "나스닥 상장 비금융 대형주 100개로 구성. 기술주 비중이 높아 성장성이 크지만 변동성도 큰 편입니다.",
    companies: ["애플", "마이크로소프트", "엔비디아", "아마존", "메타"],
  },
  dj: {
    desc: "미국 대표 우량주 30개로 구성된 가장 오래된 지수. 가격가중 방식이라 고가 종목의 영향이 큽니다.",
    companies: ["골드만삭스", "마이크로소프트", "캐터필러", "유나이티드헬스", "애플"],
  },
  ks: {
    desc: "한국거래소 유가증권시장 전체를 대표하는 지수. 한국 경제와 대형 제조·IT 기업을 반영합니다.",
    companies: ["삼성전자", "SK하이닉스", "LG에너지솔루션", "삼성바이오로직스", "현대차"],
  },
  kq: {
    desc: "기술·성장 중소형주 중심의 한국 시장 지수. 바이오·2차전지 비중이 높고 변동성이 큽니다.",
    companies: ["에코프로비엠", "알테오젠", "에코프로", "HLB", "엔켐"],
  },
};

// 시뮬레이터가 소비하는 시장 데이터. 백엔드 API 응답도 이 형태로 맞춘다.
export interface MarketData {
  years: number[];
  returns: Record<IndexKey, number[]>; // array length = years.length, unit: %
  depositRate: number; // safe-asset rate for the 30% sleeve, e.g. 0.03
  returnBasis?: "gross_total_return" | "price_return";
  currency?: "local";
  dividendIncluded?: boolean;
  expenseIncluded?: boolean;
}

// API 미연동 시 폴백으로 쓰는 예시 데이터.
export const SAMPLE_MARKET: MarketData = {
  years: YEARS,
  returns: RETURNS,
  depositRate: 0.03,
  returnBasis: "gross_total_return",
  currency: "local",
  dividendIncluded: true,
  expenseIncluded: false,
};
