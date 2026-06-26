// DB/DC retirement pension simulation model.
// Amount unit is man-won. Market returns are gross total-return approximations before costs.

import { IndexKey, MarketData } from "./indexData";

export type Mode = "back" | "fwd";
export type FutureScenario = "average" | "worst";

export const DEPOSIT_RATE = 0.03;
export const SAFE_ASSET_COST = 0.001;
export const RISK_ASSET_COST = 0.007;
export const DC_ACCOUNT_FEE_RATE = 0;
export const IRP_PAYOUT_YEARS = 15;
export const PEAK_CUT = 0.3;
export const RETIRE_LOCAL_TAX_RATE = 0.1;

export interface SimOptions {
  wagePeak?: boolean;
  futureScenario?: FutureScenario;
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

function netBlendReturn(indexGrossReturn: number, dep: number): number {
  const safeNet = Math.max(dep - SAFE_ASSET_COST, 0);
  const riskyNet = indexGrossReturn - RISK_ASSET_COST;
  return 0.3 * safeNet + 0.7 * riskyNet - DC_ACCOUNT_FEE_RATE;
}

function indexGrossReturn(data: MarketData, indices: IndexKey[], yearIndex: number, dep: number): number {
  if (!indices.length) return dep;
  return indices.reduce((sum, key) => sum + data.returns[key][yearIndex] / 100, 0) / indices.length;
}

function historicalNetReturns(
  data: MarketData,
  indices: IndexKey[],
  dep: number,
  start: number,
  n: number
): number[] {
  const rets: number[] = [];
  for (let offset = 0; offset < n; offset++) {
    rets.push(netBlendReturn(indexGrossReturn(data, indices, start + offset, dep), dep));
  }
  return rets;
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
  dep: number
): number[] {
  const indexReturn = indices.length
    ? indices.reduce((sum, key) => sum + cagrOf(key, data), 0) / indices.length
    : dep;
  return Array.from({ length: n }, () => netBlendReturn(indexReturn, dep));
}

function conservativeForwardReturns(
  salaryMan: number,
  raise: number,
  n: number,
  indices: IndexKey[],
  data: MarketData,
  dep: number
): { rets: number[]; scenarioStart: number | null; scenarioEnd: number | null } {
  if (!indices.length) {
    return {
      rets: Array.from({ length: n }, () => netBlendReturn(dep, dep)),
      scenarioStart: null,
      scenarioEnd: null,
    };
  }

  const avail = data.years.length;
  let worstRets = historicalNetReturns(data, indices, dep, Math.max(0, avail - n), n);
  let worstBalance = terminalDcBalance(salaryMan, raise, worstRets);
  let worstStart = Math.max(0, avail - n);

  for (let start = 0; start <= avail - n; start++) {
    const candidate = historicalNetReturns(data, indices, dep, start, n);
    const balance = terminalDcBalance(salaryMan, raise, candidate);
    if (balance < worstBalance) {
      worstBalance = balance;
      worstRets = candidate;
      worstStart = start;
    }
  }

  return {
    rets: worstRets,
    scenarioStart: data.years[worstStart],
    scenarioEnd: data.years[worstStart + n - 1],
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

  if (mode === "back") {
    const avail = data.years.length;
    n = Math.min(yearsInput, avail);
    const start = avail - n;
    calendarStart = data.years[start];
    rets = historicalNetReturns(data, indices, dep, start, n);
  } else {
    n = Math.min(yearsInput, data.years.length);
    if (futureScenario === "average") {
      rets = averageForwardReturns(n, indices, data, dep);
    } else {
      const scenario = conservativeForwardReturns(salaryMan, raise, n, indices, data, dep);
      rets = scenario.rets;
      scenarioStart = scenario.scenarioStart;
      scenarioEnd = scenario.scenarioEnd;
    }
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

  if (opts.wagePeak) {
    const finalContribution = annualContribution(salaryMan, raise, n - 1);
    dbArr[n] = finalContribution * (1 - PEAK_CUT) * n;
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
