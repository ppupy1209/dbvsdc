import { describe, it, expect } from "vitest";
import {
  breakevenIndexReturn,
  cagrOf,
  formatMan,
  historicalWinRate,
  irpRetirementTax,
  monteCarloBands,
  retireTax,
  simulate,
} from "../calc";
import {
  MarketData,
  SAMPLE_MARKET,
  costForIndices,
  validateMarketData,
} from "../indexData";

// Minimal two-year market with a single index, used for deterministic checks.
function twoYearMarket(ksReturns: number[], depositRate = 0.03): MarketData {
  return {
    years: [2024, 2025],
    returns: { sp: [], nq: [], dj: [], ks: ksReturns, kq: [] },
    returnYears: { sp: [], nq: [], dj: [], ks: [2024, 2025], kq: [] },
    depositRate,
  };
}

describe("retireTax (퇴직소득세)", () => {
  it("is zero when the payout is below the years-of-service deduction", () => {
    // 5년 근속 공제 = 500만원 > 100만원 퇴직급여 → 과세표준 0
    expect(retireTax(100, 5)).toBe(0);
  });

  it("matches a hand-computed case: 1억원 / 10년 ≈ 426.25만원", () => {
    // deduct 1500 → 환산급여 10200 → 환산급여공제 6260 → 과표 3940
    // 산출세액 465/12*10 = 387.5, 지방세 10% → 426.25
    expect(retireTax(10000, 10)).toBeCloseTo(426.25, 1);
  });

  it("rises with the payout amount", () => {
    expect(retireTax(20000, 10)).toBeGreaterThan(retireTax(10000, 10));
  });
});

describe("irpRetirementTax (IRP 연금수령)", () => {
  it("applies 70% for the first 10 years and 60% afterwards (15y → 2/3)", () => {
    // (10*0.7 + 5*0.6)/15 = 10/15 = 0.6667
    expect(irpRetirementTax(1000, 15)).toBeCloseTo(666.67, 1);
  });

  it("is a pure 70% reduction when payout fits within 10 years", () => {
    expect(irpRetirementTax(1000, 5)).toBeCloseTo(700, 6);
  });

  it("falls back to the full lump tax when payout years are non-positive", () => {
    expect(irpRetirementTax(1000, 0)).toBe(1000);
  });

  it("never exceeds the lump-sum tax", () => {
    expect(irpRetirementTax(1234, 15)).toBeLessThan(1234);
  });
});

describe("cagrOf (기하평균 CAGR, not simple average)", () => {
  it("returns the constant rate for a flat series", () => {
    const m = twoYearMarket([10, 10]);
    expect(cagrOf("ks", m)).toBeCloseTo(0.1, 6);
  });

  it("is geometric: +100% then -50% nets to 0% CAGR", () => {
    const m = twoYearMarket([100, -50]);
    expect(cagrOf("ks", m)).toBeCloseTo(0, 6);
  });
});

describe("simulate — DB formula", () => {
  it("DB final = monthly wage × years (raise 0 → independent of returns)", () => {
    // salary 1200만 → 월 100만 × 2년 = 200만
    const m = twoYearMarket([10, 20]);
    const r = simulate(1200, 0, 2, ["ks"], "back", m);
    expect(r.dbFinal).toBe(200);
  });

  it("DB grows with the wage-raise assumption", () => {
    const m = twoYearMarket([0, 0]);
    const flat = simulate(1200, 0, 2, ["ks"], "back", m).dbFinal;
    const raised = simulate(1200, 5, 2, ["ks"], "back", m).dbFinal;
    expect(raised).toBeGreaterThan(flat);
  });
});

describe("simulate — DC blended returns and cost drag", () => {
  it("blends 30% safe + 70% (index − cost) per year", () => {
    const m = twoYearMarket([10, 20]);
    const r = simulate(1200, 0, 2, ["ks"], "back", m);
    const cost = costForIndices(["ks"]); // 0.0019
    expect(r.riskyCost).toBeCloseTo(cost, 6);
    expect(r.rets[0]).toBeCloseTo(0.3 * 0.03 + 0.7 * (0.1 - cost), 6);
    expect(r.rets[1]).toBeCloseTo(0.3 * 0.03 + 0.7 * (0.2 - cost), 6);
  });

  it("DC ends below DB at 0% index return because of cost drag", () => {
    const m = twoYearMarket([0, 0], 0); // deposit 0 so only cost moves the needle
    const r = simulate(1200, 0, 2, ["ks"], "back", m);
    expect(r.dcFinal).toBeLessThan(r.dbFinal);
    expect(r.dcFinal).toBeGreaterThan(r.dbFinal * 0.95);
  });
});

describe("simulate — horizon bounds (backtest vs future scenarios)", () => {
  it("backtest is capped by available history", () => {
    const r = simulate(4000, 3, 100, ["sp"], "back", SAMPLE_MARKET);
    expect(r.n).toBe(SAMPLE_MARKET.returns.sp.length); // 31
  });

  it("future average projects the full requested horizon", () => {
    const r = simulate(4000, 3, 30, ["kq"], "fwd", SAMPLE_MARKET, {
      futureScenario: "average",
    });
    expect(r.n).toBe(30);
  });

  it("future worst is capped by available history and reports its window", () => {
    const r = simulate(4000, 3, 30, ["kq"], "fwd", SAMPLE_MARKET, {
      futureScenario: "worst",
    });
    expect(r.n).toBe(SAMPLE_MARKET.returns.kq.length); // 10
    expect(r.scenarioStart).not.toBeNull();
    expect(r.scenarioEnd).not.toBeNull();
  });
});

describe("validateMarketData", () => {
  it("reports no issues for the shipped sample data", () => {
    const issues = validateMarketData(SAMPLE_MARKET);
    expect(issues).toEqual([]);
  });

  it("flags a returns/years length mismatch as an error", () => {
    const broken: MarketData = {
      ...SAMPLE_MARKET,
      returns: { ...SAMPLE_MARKET.returns, sp: [...SAMPLE_MARKET.returns.sp, 5] },
    };
    const errors = validateMarketData(broken).filter((i) => i.level === "error");
    expect(errors.some((e) => e.key === "sp")).toBe(true);
  });

  it("warns on a typo-scale outlier without erroring", () => {
    const fat = twoYearMarket([9247, 20]); // 92.47 mistyped as 9247
    const issues = validateMarketData(fat);
    expect(issues.some((i) => i.level === "warn" && i.key === "ks")).toBe(true);
    expect(issues.some((i) => i.level === "error")).toBe(false);
  });
});

// A single-index two-year market with optional per-year deposit / FX series.
function market(
  key: "sp" | "ks",
  returns: number[],
  extra: Partial<MarketData> = {}
): MarketData {
  const empty = { sp: [], nq: [], dj: [], ks: [], kq: [] };
  return {
    years: [2024, 2025],
    returns: { ...empty, [key]: returns },
    returnYears: { ...empty, [key]: [2024, 2025] },
    depositRate: 0.03,
    ...extra,
  };
}

describe("per-year deposit rate (backtest)", () => {
  it("uses depositRateByYear instead of the flat rate", () => {
    const m = market("ks", [0, 0], { depositRateByYear: { 2024: 0.1, 2025: 0.1 } });
    const r = simulate(1200, 0, 2, ["ks"], "back", m);
    // 0.3·0.10 + 0.7·(0 − 0.0019)
    expect(r.rets[0]).toBeCloseTo(0.3 * 0.1 + 0.7 * (0 - costForIndices(["ks"])), 6);
  });

  it("falls back to the flat rate when no per-year series is present", () => {
    const m = market("ks", [0, 0]);
    const r = simulate(1200, 0, 2, ["ks"], "back", m);
    expect(r.rets[0]).toBeCloseTo(0.3 * 0.03 + 0.7 * (0 - costForIndices(["ks"])), 6);
  });
});

describe("KRW conversion (FX) for USD indices", () => {
  it("compounds the USD index return with the USD/KRW move when enabled", () => {
    const m = market("sp", [10, 20], { fxUsdKrwByYear: { 2024: 0.1, 2025: -0.05 } });
    const krw = simulate(1200, 0, 2, ["sp"], "back", m, { krwConvert: true });
    const cost = costForIndices(["sp"]);
    const krwRet2024 = (1 + 0.1) * (1 + 0.1) - 1; // index 10% × FX +10%
    expect(krw.rets[0]).toBeCloseTo(0.3 * 0.03 + 0.7 * (krwRet2024 - cost), 6);
  });

  it("leaves returns in local currency when disabled (default)", () => {
    const m = market("sp", [10, 20], { fxUsdKrwByYear: { 2024: 0.1, 2025: -0.05 } });
    const local = simulate(1200, 0, 2, ["sp"], "back", m);
    const cost = costForIndices(["sp"]);
    expect(local.rets[0]).toBeCloseTo(0.3 * 0.03 + 0.7 * (0.1 - cost), 6);
  });

  it("does not apply FX to a KRW-denominated index", () => {
    const m = market("ks", [10, 20], { fxUsdKrwByYear: { 2024: 0.1, 2025: -0.05 } });
    const withFlag = simulate(1200, 0, 2, ["ks"], "back", m, { krwConvert: true });
    const cost = costForIndices(["ks"]);
    expect(withFlag.rets[0]).toBeCloseTo(0.3 * 0.03 + 0.7 * (0.1 - cost), 6);
  });
});

describe("breakevenIndexReturn (손익분기 수익률)", () => {
  it("solves the rate where DC terminal equals DB terminal", () => {
    // raise 0: DB = 200. DC = 200 + 100·blend ⇒ blend 0 ⇒ index −1.096%
    const m = twoYearMarket([10, 20]);
    const g = breakevenIndexReturn(1200, 0, 2, ["ks"], m)!;
    expect(g).toBeCloseTo(-0.010957, 5);
    // sanity: feeding g back as a flat index return reproduces DB
    const r = simulate(1200, 0, 2, ["ks"], "fwd", { ...m, returns: { ...m.returns, ks: [g * 100, g * 100] } }, { futureScenario: "average" });
    expect(r.dcFinal).toBeCloseTo(r.dbFinal, 4);
  });

  it("rises as the wage-raise assumption rises (DB harder to beat)", () => {
    const m = twoYearMarket([10, 20]);
    const low = breakevenIndexReturn(4000, 1, 2, ["ks"], m)!;
    const high = breakevenIndexReturn(4000, 10, 2, ["ks"], m)!;
    expect(high).toBeGreaterThan(low);
  });
});

describe("historicalWinRate (과거 DC 우위 빈도)", () => {
  it("is 100% when the index always beats the wage path", () => {
    const m = market("ks", [50, 50]); // strong returns, no raise
    const w = historicalWinRate(1200, 0, 2, ["ks"], m)!;
    expect(w.winRate).toBe(1);
    expect(w.windowSize).toBe(2);
    expect(w.windows).toBe(1);
  });

  it("is 0% when returns are flat but wages rise (DB always wins)", () => {
    const m = market("ks", [0, 0]);
    const w = historicalWinRate(4000, 10, 2, ["ks"], m)!;
    expect(w.winRate).toBe(0);
  });

  it("counts every window of the requested length", () => {
    // sp has 31 years; a 15-year window yields 31-15+1 = 17 windows
    const w = historicalWinRate(4000, 3, 15, ["sp"], SAMPLE_MARKET)!;
    expect(w.windows).toBe(SAMPLE_MARKET.returns.sp.length - 15 + 1);
    expect(w.winRate).toBeGreaterThanOrEqual(0);
    expect(w.winRate).toBeLessThanOrEqual(1);
  });
});

// A single-index market with an arbitrary number of years (for Monte Carlo).
function nYearMarket(ksReturns: number[], depositRate = 0.03): MarketData {
  const yrs = ksReturns.map((_, i) => 2000 + i);
  return {
    years: yrs,
    returns: { sp: [], nq: [], dj: [], ks: ksReturns, kq: [] },
    returnYears: { sp: [], nq: [], dj: [], ks: yrs, kq: [] },
    depositRate,
  };
}

describe("monteCarloBands (미래 확률 밴드)", () => {
  it("is deterministic for identical inputs (seeded)", () => {
    const a = monteCarloBands(4000, 3, 20, ["ks"], SAMPLE_MARKET);
    const b = monteCarloBands(4000, 3, 20, ["ks"], SAMPLE_MARKET);
    expect(a).toEqual(b);
  });

  it("returns null when history is too short for an honest bootstrap", () => {
    // twoYearMarket has 2 years < MC_MIN_HISTORY (5)
    expect(monteCarloBands(4000, 3, 20, ["ks"], twoYearMarket([10, 20]))).toBeNull();
  });

  it("returns percentiles that are ordered and anchored at 0", () => {
    const band = monteCarloBands(4000, 3, 20, ["ks"], SAMPLE_MARKET)!;
    expect(band.db.length).toBe(21);
    expect(band.p50.length).toBe(21);
    expect(band.db[0]).toBe(0);
    expect(band.p50[0]).toBe(0);
    const n = 20;
    expect(band.p10[n]).toBeLessThanOrEqual(band.p25[n]);
    expect(band.p25[n]).toBeLessThanOrEqual(band.p50[n]);
    expect(band.p50[n]).toBeLessThanOrEqual(band.p75[n]);
    expect(band.p75[n]).toBeLessThanOrEqual(band.p90[n]);
    expect(band.p10Final).toBeCloseTo(band.p10[n], 6);
    expect(band.p90Final).toBeCloseTo(band.p90[n], 6);
  });

  it("keeps the win probability within [0, 1]", () => {
    const band = monteCarloBands(4000, 3, 20, ["ks"], SAMPLE_MARKET)!;
    expect(band.probDcWins).toBeGreaterThanOrEqual(0);
    expect(band.probDcWins).toBeLessThanOrEqual(1);
  });

  it("wins ~always with strong flat returns, ~never when wages outrun flat 0%", () => {
    // Every draw is identical for a flat series → a degenerate but valid band.
    const strong = monteCarloBands(1200, 0, 8, ["ks"], nYearMarket([50, 50, 50, 50, 50, 50, 50, 50]))!;
    expect(strong.probDcWins).toBe(1);
    expect(strong.p10Final).toBeCloseTo(strong.p90Final, 6); // no spread when flat

    const weak = monteCarloBands(4000, 10, 8, ["ks"], nYearMarket([0, 0, 0, 0, 0, 0, 0, 0]))!;
    expect(weak.probDcWins).toBe(0);
  });
});

describe("simulate — Monte Carlo band scenario", () => {
  it("projects the full horizon and exposes the band, with median driving finals", () => {
    const r = simulate(4000, 3, 30, ["ks"], "fwd", SAMPLE_MARKET, { futureScenario: "band" });
    expect(r.n).toBe(30);
    expect(r.band).toBeDefined();
    expect(r.dbArr.length).toBe(31);
    expect(r.dcFinal).toBeCloseTo(r.band!.medianFinal, 6);
    expect(r.dbFinal).toBeCloseTo(r.band!.dbFinal, 6);
  });

  it("falls back to the average line when history is too short for a band", () => {
    const short = nYearMarket([10, 20, 30]); // 3 years < 5
    const r = simulate(4000, 3, 30, ["ks"], "fwd", short, { futureScenario: "band" });
    expect(r.band).toBeUndefined();
    expect(r.n).toBe(30); // average scenario still projects the full horizon
  });
});

describe("formatMan", () => {
  it("formats 억/만원 and negatives", () => {
    expect(formatMan(12345)).toBe("1억 2,345만원");
    expect(formatMan(10000)).toBe("1억원");
    expect(formatMan(5000)).toBe("5,000만원");
    expect(formatMan(-100)).toBe("-100만원");
  });
});
