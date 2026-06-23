// DB/DC 퇴직연금 시뮬레이션 계산 모델.
// 모델 설명: docs/ARCHITECTURE.md "시뮬레이션 계산 모델"
// ⚠️ 임시 모델 — 법정 산식 정밀화 전. 금액 단위는 모두 "만원".

import { IndexKey, RETURNS, YEARS } from "./indexData";

export type Mode = "back" | "fwd";

// 안전자산 30% 몫의 금리 (2026년 원리금보장형 기준 가정)
export const DEPOSIT_RATE = 0.03;
// IRP 연금수령 시 퇴직소득세 감면율 (연금 실제수령 10년 이내 가정, 11년 이상은 0.4)
export const IRP_DISCOUNT = 0.3;
// 임금피크제 가정 시 퇴직 직전 평균임금 감액률 (DB 산정 기준 하락)
export const PEAK_CUT = 0.3;

export interface SimOptions {
  // 임금피크제 적용 가정: DB는 퇴직 직전 평균임금 기준이라 최종임금이 깎이면 불리
  wagePeak?: boolean;
}

export interface SimResult {
  n: number;
  dbArr: number[]; // 길이 n+1, 연도별 누적 (만원)
  dcArr: number[];
  dbFinal: number;
  dcFinal: number;
  cagr: number; // 혼합 포트폴리오 연평균 수익률
  worst: number; // 최악의 해 수익률
  calendarStart: number | null; // 백테스트 시작 연도 (back 모드)
  // 세금 (퇴직소득세, 만원)
  dbLumpTax: number;
  dcLumpTax: number;
  dbIrpTax: number;
  dcIrpTax: number;
}

// 특정 지수의 전체 기간 연평균 수익률(CAGR)
export function cagrOf(k: IndexKey): number {
  const r = RETURNS[k];
  let p = 1;
  for (const v of r) p *= 1 + v / 100;
  return Math.pow(p, 1 / r.length) - 1;
}

// 종합소득세 누진세율 (2026 기준, 과세표준 만원 단위)
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

// 퇴직소득세 추정 (일시금 수령). amount, 결과 단위: 만원
export function retireTax(amountMan: number, years: number): number {
  let deduct: number;
  if (years <= 5) deduct = 100 * years;
  else if (years <= 10) deduct = 500 + 200 * (years - 5);
  else if (years <= 20) deduct = 1500 + 250 * (years - 10);
  else deduct = 4000 + 300 * (years - 20);

  const hwan = (Math.max(amountMan - deduct, 0) / years) * 12; // 환산급여
  let hd: number;
  if (hwan <= 800) hd = hwan;
  else if (hwan <= 7000) hd = 800 + (hwan - 800) * 0.6;
  else if (hwan <= 10000) hd = 4520 + (hwan - 7000) * 0.55;
  else if (hwan <= 30000) hd = 6170 + (hwan - 10000) * 0.45;
  else hd = 15170 + (hwan - 30000) * 0.35;

  const base = Math.max(hwan - hd, 0);
  return Math.max((progTax(base) / 12) * years, 0);
}

export function simulate(
  salaryMan: number,
  raisePct: number,
  yearsInput: number,
  indices: IndexKey[],
  mode: Mode,
  opts: SimOptions = {}
): SimResult {
  const raise = raisePct / 100;
  const rets: number[] = [];
  let calendarStart: number | null = null;
  let n = yearsInput;

  if (mode === "back") {
    const avail = YEARS.length;
    n = Math.min(yearsInput, avail);
    const start = avail - n;
    calendarStart = YEARS[start];
    for (let k = 0; k < n; k++) {
      const yi = start + k;
      const idx = indices.length
        ? indices.reduce((a, kk) => a + RETURNS[kk][yi], 0) / indices.length / 100
        : DEPOSIT_RATE;
      rets.push(0.3 * DEPOSIT_RATE + 0.7 * idx);
    }
  } else {
    const cg = indices.length
      ? indices.reduce((a, kk) => a + cagrOf(kk), 0) / indices.length
      : DEPOSIT_RATE;
    const blend = 0.3 * DEPOSIT_RATE + 0.7 * cg;
    for (let k = 0; k < n; k++) rets.push(blend);
  }

  let bal = 0;
  const dbArr = [0];
  const dcArr = [0];
  let prod = 1;
  let worst = Infinity;
  for (let i = 0; i < n; i++) {
    const monthly = (salaryMan * Math.pow(1 + raise, i)) / 12;
    const ret = rets[i];
    prod *= 1 + ret;
    if (ret < worst) worst = ret;
    bal = (bal + monthly) * (1 + ret);
    dcArr.push(bal);
    dbArr.push(monthly * (i + 1));
  }

  // 임금피크제 가정: DB는 퇴직 직전 평균임금 기준이므로 최종 시점 금액만 감액.
  // (DC는 이미 적립·운용된 금액이라 영향 없음 — 이것이 DB의 구조적 약점)
  if (opts.wagePeak) {
    const monthlyFinal = (salaryMan * Math.pow(1 + raise, n - 1)) / 12;
    dbArr[n] = monthlyFinal * (1 - PEAK_CUT) * n;
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
    calendarStart,
    dbLumpTax,
    dcLumpTax,
    dbIrpTax: dbLumpTax * (1 - IRP_DISCOUNT),
    dcIrpTax: dcLumpTax * (1 - IRP_DISCOUNT),
  };
}

// 만원 → "1억 2,340만원" 형태. 음수 지원.
export function formatMan(man: number): string {
  const neg = man < 0;
  const v = Math.round(Math.abs(man));
  const eok = Math.floor(v / 10000);
  const rest = v % 10000;
  let s: string;
  if (eok > 0) s = `${eok}억${rest > 0 ? " " + rest.toLocaleString() + "만원" : "원"}`;
  else s = `${v.toLocaleString()}만원`;
  return (neg ? "-" : "") + s;
}
