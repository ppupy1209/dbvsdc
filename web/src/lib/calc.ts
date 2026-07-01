// DB/DC retirement pension simulation model.
// Amount unit is man-won. Market returns are gross total-return approximations.

import { availableReturnYears, costForIndices, isUsdIndex, IndexKey, MarketData, yearsForIndex } from "./indexData";

export type Mode = "back" | "fwd";
export type FutureScenario = "average" | "worst" | "band";

export const DEPOSIT_RATE = 0.03;
export const IRP_PAYOUT_YEARS = 15;
export const RETIRE_LOCAL_TAX_RATE = 0.1;

export interface SimOptions {
  futureScenario?: FutureScenario;
  // Backtest only: convert USD-index returns to KRW using historical USD/KRW
  // moves (unhedged ETF). Future scenarios stay in local currency.
  krwConvert?: boolean;
}

export interface SimResult {
  n: number;
  dbArr: number[];
  dcArr: number[];
  dbFinal: number;
  dcFinal: number;
  cagr: number;
  worst: number;
  rets: number[];
  calendarStart: number | null;
  scenarioStart: number | null;
  scenarioEnd: number | null;
  dbLumpTax: number;
  dcLumpTax: number;
  dbIrpTax: number;
  dcIrpTax: number;
  irpPayoutYears: number;
  futureScenario: FutureScenario;
  riskyCost: number;
  // Present only for the Monte Carlo ("band") future scenario.
  band?: BandResult;
}

// Monte Carlo percentile bands for the future scenario. Each array is length n+1
// (year 0..n), aligned with dbArr/dcArr. p50 is the median DC path.
export interface BandResult {
  paths: number; // number of simulated paths
  db: number[]; // deterministic DB path (n+1)
  p10: number[];
  p25: number[];
  p50: number[]; // median DC balance path
  p75: number[];
  p90: number[];
  probDcWins: number; // share of paths whose terminal DC balance ≥ DB (0..1)
  dbFinal: number;
  medianFinal: number;
  p10Final: number;
  p90Final: number;
  medianCagr: number; // median of per-path geometric annual return
  medianWorstYear: number; // median of each path's single worst year return
}

export function cagrOf(k: IndexKey, data: MarketData): number {
  const r = data.returns[k];
  let p = 1;
  for (const v of r) p *= 1 + v / 100;
  return Math.pow(p, 1 / r.length) - 1;
}

function progTax(base: number): number {
  if (base <= 1400) return base * 0.06;
  if (base <= 5000) return base * 0.15 - 126;
  if (base <= 8800) return base * 0.24 - 576;
  if (base <= 15000) return base * 0.35 - 1544;
  if (base <= 30000) return base * 0.38 - 1994;
  if (base <= 50000) return base * 0.4 - 2594;
  if (base <= 100000) return base * 0.42 - 3594;
  return base * 0.45 - 6594;
}

export function retireTax(amountMan: number, years: number): number {
  let deduct: number;
  if (years <= 5) deduct = 100 * years;
  else if (years <= 10) deduct = 500 + 200 * (years - 5);
  else if (years <= 20) deduct = 1500 + 250 * (years - 10);
  else deduct = 4000 + 300 * (years - 20);

  const hwan = (Math.max(amountMan - deduct, 0) / years) * 12;
  let hd: number;
  if (hwan <= 800) hd = hwan;
  else if (hwan <= 7000) hd = 800 + (hwan - 800) * 0.6;
  else if (hwan <= 10000) hd = 4520 + (hwan - 7000) * 0.55;
  else if (hwan <= 30000) hd = 6170 + (hwan - 10000) * 0.45;
  else hd = 15170 + (hwan - 30000) * 0.35;

  const base = Math.max(hwan - hd, 0);
  const nationalTax = Math.max((progTax(base) / 12) * years, 0);
  return nationalTax * (1 + RETIRE_LOCAL_TAX_RATE);
}

export function irpRetirementTax(lumpTax: number, payoutYears = IRP_PAYOUT_YEARS): number {
  if (payoutYears <= 0) return lumpTax;
  const taxPerYear = lumpTax / payoutYears;
  let tax = 0;
  for (let year = 1; year <= payoutYears; year++) {
    tax += taxPerYear * (year <= 10 ? 0.7 : 0.6);
  }
  return tax;
}

function annualContribution(salaryMan: number, raise: number, yearIndex: number): number {
  return (salaryMan * Math.pow(1 + raise, yearIndex)) / 12;
}

// riskyCost is the annual real cost burden of the risky sleeve's tracking ETF(s),
// subtracted from the gross index return before blending with the safe sleeve.
function netBlendReturn(indexGrossReturn: number, dep: number, riskyCost = 0): number {
  return 0.3 * dep + 0.7 * (indexGrossReturn - riskyCost);
}

// Safe-asset rate for a calendar year: per-year history if present, else the
// single forward/fallback rate.
function depositForYear(data: MarketData, year: number): number {
  return data.depositRateByYear?.[year] ?? data.depositRate;
}

function returnForYear(
  data: MarketData,
  key: IndexKey,
  year: number,
  krwConvert: boolean
): number | null {
  const years = yearsForIndex(data, key);
  const idx = years.indexOf(year);
  if (idx < 0) return null;
  const value = data.returns[key]?.[idx];
  if (typeof value !== "number") return null;
  let r = value / 100;
  if (krwConvert && isUsdIndex(key)) {
    const fx = data.fxUsdKrwByYear?.[year] ?? 0;
    r = (1 + r) * (1 + fx) - 1; // local return compounded with the USD/KRW move
  }
  return r;
}

function indexGrossReturn(
  data: MarketData,
  indices: IndexKey[],
  year: number,
  dep: number,
  krwConvert: boolean
): number {
  if (!indices.length) return dep;
  const values = indices
    .map((key) => returnForYear(data, key, year, krwConvert))
    .filter((value): value is number => value !== null);
  if (!values.length) return dep;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function historicalNetReturns(
  data: MarketData,
  indices: IndexKey[],
  years: number[],
  riskyCost: number,
  krwConvert: boolean
): number[] {
  return years.map((year) => {
    const dep = depositForYear(data, year);
    return netBlendReturn(indexGrossReturn(data, indices, year, dep, krwConvert), dep, riskyCost);
  });
}

function terminalDcBalance(salaryMan: number, raise: number, rets: number[]): number {
  let bal = 0;
  for (let i = 0; i < rets.length; i++) {
    bal = bal * (1 + rets[i]) + annualContribution(salaryMan, raise, i);
  }
  return bal;
}


function averageForwardReturns(
  n: number,
  indices: IndexKey[],
  data: MarketData,
  dep: number,
  riskyCost: number
): number[] {
  const indexReturn = indices.length
    ? indices.reduce((sum, key) => sum + cagrOf(key, data), 0) / indices.length
    : dep;
  return Array.from({ length: n }, () => netBlendReturn(indexReturn, dep, riskyCost));
}

function conservativeForwardReturns(
  salaryMan: number,
  raise: number,
  n: number,
  indices: IndexKey[],
  data: MarketData,
  dep: number,
  riskyCost: number
): { rets: number[]; scenarioStart: number | null; scenarioEnd: number | null } {
  if (!indices.length) {
    return {
      rets: Array.from({ length: n }, () => netBlendReturn(dep, dep)),
      scenarioStart: null,
      scenarioEnd: null,
    };
  }

  const years = availableReturnYears(data, indices);
  const avail = years.length;
  if (avail === 0) {
    return {
      rets: Array.from({ length: n }, () => netBlendReturn(dep, dep)),
      scenarioStart: null,
      scenarioEnd: null,
    };
  }

  const windowSize = Math.min(n, avail);
  let worstStart = Math.max(0, avail - windowSize);
  let worstYears = years.slice(worstStart, worstStart + windowSize);
  // Future scenarios stay in local currency (no FX-drift assumption).
  let worstRets = historicalNetReturns(data, indices, worstYears, riskyCost, false);
  let worstBalance = terminalDcBalance(salaryMan, raise, worstRets);

  for (let start = 0; start <= avail - windowSize; start++) {
    const candidateYears = years.slice(start, start + windowSize);
    const candidate = historicalNetReturns(data, indices, candidateYears, riskyCost, false);
    const balance = terminalDcBalance(salaryMan, raise, candidate);
    if (balance < worstBalance) {
      worstBalance = balance;
      worstRets = candidate;
      worstStart = start;
      worstYears = candidateYears;
    }
  }

  return {
    rets: worstRets,
    scenarioStart: worstYears[0] ?? null,
    scenarioEnd: worstYears[worstYears.length - 1] ?? null,
  };
}

// The constant gross index return at which DC's terminal balance equals DB's,
// holding the model's 30/70 blend, risky-sleeve cost, wage raise, and end-of-year
// contributions fixed. This is the site's core "손익분기 수익률": above it DC wins,
// below it DB wins. Returns a fraction (0.05 = 5%), or null if there is no
// crossing within a sane band (e.g. raise so high DB always wins).
export function breakevenIndexReturn(
  salaryMan: number,
  raisePct: number,
  n: number,
  indices: IndexKey[],
  data: MarketData
): number | null {
  if (n <= 0) return null;
  const raise = raisePct / 100;
  const dep = data.depositRate;
  const cost = costForIndices(indices);
  const dbFinal = annualContribution(salaryMan, raise, n - 1) * n;
  const dcAt = (g: number): number =>
    terminalDcBalance(
      salaryMan,
      raise,
      Array.from({ length: n }, () => netBlendReturn(g, dep, cost))
    );

  let lo = -0.95; // index down 95%
  let hi = 3.0; // index up 300%
  // DC balance is strictly increasing in the index return, so a sign change in
  // (DC − DB) across [lo, hi] guarantees a unique bisected root.
  if (dcAt(lo) > dbFinal || dcAt(hi) < dbFinal) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (dcAt(mid) < dbFinal) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Across every historical window of the chosen length, how often did DC's
// terminal balance beat DB's? An honest, probabilistic complement to the single
// average/worst paths — DB is constant for a given window length, so this is just
// the share of windows whose DC outcome cleared that bar. Local currency, to
// match the forward scenarios.
export function historicalWinRate(
  salaryMan: number,
  raisePct: number,
  n: number,
  indices: IndexKey[],
  data: MarketData
): { winRate: number; windows: number; windowSize: number } | null {
  if (!indices.length || n <= 0) return null;
  const raise = raisePct / 100;
  const years = availableReturnYears(data, indices);
  const avail = years.length;
  if (avail === 0) return null;
  const windowSize = Math.min(n, avail);
  const riskyCost = costForIndices(indices);
  const dbFinal = annualContribution(salaryMan, raise, windowSize - 1) * windowSize;

  let wins = 0;
  let windows = 0;
  for (let start = 0; start + windowSize <= avail; start++) {
    const winYears = years.slice(start, start + windowSize);
    const rets = historicalNetReturns(data, indices, winYears, riskyCost, false);
    if (terminalDcBalance(salaryMan, raise, rets) >= dbFinal) wins++;
    windows++;
  }
  if (windows === 0) return null;
  return { winRate: wins / windows, windows, windowSize };
}

// ---------------------------------------------------------------------------
// Monte Carlo probability bands (future scenario).
// The single "average" line reads as a guaranteed return; the "worst" line is a
// single historical path. Neither conveys the SPREAD of outcomes. This resamples
// each index's REAL historical annual returns (IID bootstrap, local currency),
// blends each draw with the forward safe rate and cost, and simulates many paths
// to show where DC's balance is likely to land — and how often it clears DB.
// Deterministic (seeded) so the band is stable across re-renders and testable.
// ---------------------------------------------------------------------------
const MC_PATHS = 1500;
const MC_MIN_HISTORY = 5; // need a few real years before a bootstrap is honest
const MC_SEED = 0x9e3779b9;

// mulberry32: tiny, fast, deterministic PRNG in [0, 1).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Linear-interpolated percentile of an ascending-sorted array (p in [0,1]).
function percentile(sortedAsc: number[], p: number): number {
  const len = sortedAsc.length;
  if (len === 0) return 0;
  if (len === 1) return sortedAsc[0];
  const idx = p * (len - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] * (hi - idx) + sortedAsc[hi] * (idx - lo);
}

export function monteCarloBands(
  salaryMan: number,
  raisePct: number,
  n: number,
  indices: IndexKey[],
  data: MarketData,
  opts: { paths?: number; seed?: number } = {}
): BandResult | null {
  if (n <= 0 || !indices.length) return null;
  const raise = raisePct / 100;
  const dep = data.depositRate;
  const cost = costForIndices(indices);

  // Pool of historical gross index returns (local currency, no FX drift), drawn
  // IID to build forward paths. Future mode makes no FX assumption, matching the
  // other forward scenarios.
  const years = availableReturnYears(data, indices);
  const pool = years
    .map((year) => indexGrossReturn(data, indices, year, dep, false))
    .filter((v): v is number => Number.isFinite(v));
  if (pool.length < MC_MIN_HISTORY) return null;

  const paths = opts.paths ?? MC_PATHS;
  const rand = mulberry32((opts.seed ?? MC_SEED) >>> 0);

  // db path is deterministic (DB = final monthly wage × months of service).
  const db = new Array<number>(n + 1);
  db[0] = 0;
  for (let i = 0; i < n; i++) db[i + 1] = annualContribution(salaryMan, raise, i) * (i + 1);
  const dbFinal = db[n];

  const balancesByYear: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(paths));
  for (let p = 0; p < paths; p++) balancesByYear[0][p] = 0;
  const terminals = new Array<number>(paths);
  const pathCagr = new Array<number>(paths);
  const pathWorst = new Array<number>(paths);

  for (let p = 0; p < paths; p++) {
    let bal = 0;
    let prod = 1;
    let worst = Infinity;
    for (let i = 0; i < n; i++) {
      const g = pool[Math.floor(rand() * pool.length)];
      const ret = netBlendReturn(g, dep, cost);
      if (ret < worst) worst = ret;
      prod *= 1 + ret;
      bal = bal * (1 + ret) + annualContribution(salaryMan, raise, i);
      balancesByYear[i + 1][p] = bal;
    }
    terminals[p] = bal;
    pathCagr[p] = Math.pow(prod, 1 / n) - 1;
    pathWorst[p] = worst;
  }

  const p10 = new Array<number>(n + 1);
  const p25 = new Array<number>(n + 1);
  const p50 = new Array<number>(n + 1);
  const p75 = new Array<number>(n + 1);
  const p90 = new Array<number>(n + 1);
  for (let i = 0; i <= n; i++) {
    const col = balancesByYear[i].slice().sort((a, b) => a - b);
    p10[i] = percentile(col, 0.1);
    p25[i] = percentile(col, 0.25);
    p50[i] = percentile(col, 0.5);
    p75[i] = percentile(col, 0.75);
    p90[i] = percentile(col, 0.9);
  }

  let wins = 0;
  for (let p = 0; p < paths; p++) if (terminals[p] >= dbFinal) wins++;

  return {
    paths,
    db,
    p10,
    p25,
    p50,
    p75,
    p90,
    probDcWins: wins / paths,
    dbFinal,
    medianFinal: p50[n],
    p10Final: p10[n],
    p90Final: p90[n],
    medianCagr: percentile(pathCagr.slice().sort((a, b) => a - b), 0.5),
    medianWorstYear: percentile(pathWorst.slice().sort((a, b) => a - b), 0.5),
  };
}

export function simulate(
  salaryMan: number,
  raisePct: number,
  yearsInput: number,
  indices: IndexKey[],
  mode: Mode,
  data: MarketData,
  opts: SimOptions = {}
): SimResult {
  const raise = raisePct / 100;
  const dep = data.depositRate;
  let rets: number[] = [];
  let calendarStart: number | null = null;
  let scenarioStart: number | null = null;
  let scenarioEnd: number | null = null;
  const futureScenario = opts.futureScenario ?? "worst";
  let n = yearsInput;

  const years = availableReturnYears(data, indices);
  const riskyCost = costForIndices(indices);

  if (mode === "back") {
    n = Math.min(yearsInput, years.length);
    const selectedYears = years.slice(Math.max(0, years.length - n));
    calendarStart = selectedYears[0] ?? null;
    rets = selectedYears.length
      ? historicalNetReturns(data, indices, selectedYears, riskyCost, opts.krwConvert ?? false)
      : Array.from({ length: n }, () => netBlendReturn(dep, dep));
  } else if (futureScenario === "band") {
    // Monte Carlo: bootstrap real history to project the full horizon and expose
    // the spread of outcomes. The median path drives the existing verdict/tax UI.
    n = yearsInput;
    const band = monteCarloBands(salaryMan, raisePct, n, indices, data);
    if (band) {
      const dbFinal = band.dbFinal;
      const dcFinal = band.medianFinal;
      const dbLumpTax = retireTax(dbFinal, n);
      const dcLumpTax = retireTax(dcFinal, n);
      return {
        n,
        dbArr: band.db,
        dcArr: band.p50,
        dbFinal,
        dcFinal,
        cagr: band.medianCagr,
        worst: band.medianWorstYear,
        rets: [],
        calendarStart: null,
        scenarioStart: null,
        scenarioEnd: null,
        dbLumpTax,
        dcLumpTax,
        dbIrpTax: irpRetirementTax(dbLumpTax),
        dcIrpTax: irpRetirementTax(dcLumpTax),
        irpPayoutYears: IRP_PAYOUT_YEARS,
        futureScenario,
        riskyCost,
        band,
      };
    }
    // Not enough history for an honest bootstrap → fall back to the average line.
    rets = averageForwardReturns(n, indices, data, dep, riskyCost);
  } else if (futureScenario === "average") {
    // Average scenario repeats the long-run CAGR, so it can project the full
    // requested horizon regardless of how much history each index has.
    n = yearsInput;
    rets = averageForwardReturns(n, indices, data, dep, riskyCost);
  } else {
    // Worst scenario needs a real historical window, so it is bounded by the
    // available history. n follows the window length actually returned.
    n = Math.min(yearsInput, years.length || yearsInput);
    const scenario = conservativeForwardReturns(salaryMan, raise, n, indices, data, dep, riskyCost);
    rets = scenario.rets;
    n = rets.length || n;
    scenarioStart = scenario.scenarioStart;
    scenarioEnd = scenario.scenarioEnd;
  }

  let bal = 0;
  const dbArr = [0];
  const dcArr = [0];
  let prod = 1;
  let worst = Infinity;
  for (let i = 0; i < n; i++) {
    const contribution = annualContribution(salaryMan, raise, i);
    const ret = rets[i];
    prod *= 1 + ret;
    if (ret < worst) worst = ret;
    bal = bal * (1 + ret) + contribution;
    dcArr.push(bal);
    dbArr.push(contribution * (i + 1));
  }

  const cagr = Math.pow(prod, 1 / n) - 1;
  const dbFinal = dbArr[n];
  const dcFinal = dcArr[n];
  const dbLumpTax = retireTax(dbFinal, n);
  const dcLumpTax = retireTax(dcFinal, n);

  return {
    n,
    dbArr,
    dcArr,
    dbFinal,
    dcFinal,
    cagr,
    worst,
    rets,
    calendarStart,
    scenarioStart,
    scenarioEnd,
    dbLumpTax,
    dcLumpTax,
    dbIrpTax: irpRetirementTax(dbLumpTax),
    dcIrpTax: irpRetirementTax(dcLumpTax),
    irpPayoutYears: IRP_PAYOUT_YEARS,
    futureScenario,
    riskyCost,
  };
}

export function formatMan(man: number): string {
  const neg = man < 0;
  const v = Math.round(Math.abs(man));
  const eok = Math.floor(v / 10000);
  const rest = v % 10000;
  let s: string;
  if (eok > 0) s = `${eok}\uc5b5${rest > 0 ? " " + rest.toLocaleString() + "\ub9cc\uc6d0" : "\uc6d0"}`;
  else s = `${v.toLocaleString()}\ub9cc\uc6d0`;
  return (neg ? "-" : "") + s;
}
