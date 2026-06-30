// DB/DC retirement pension simulation model.
// Amount unit is man-won. Market returns are gross total-return approximations.

import { availableReturnYears, costForIndices, isUsdIndex, IndexKey, MarketData, yearsForIndex } from "./indexData";

export type Mode = "back" | "fwd";
export type FutureScenario = "average" | "worst";

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
