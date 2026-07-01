// Encode/decode the simulator's shareable state to/from a URL query string.
// Decoding is defensive: every field is validated/clamped so a hand-edited or
// stale link can never crash the simulator — unknown fields are simply dropped.

import { INDEX_KEYS, IndexKey } from "./indexData";
import { FutureScenario, Mode } from "./calc";

export interface ShareState {
  mode: Mode;
  index: IndexKey;
  period: number;
  salary: number;
  raise: number;
  scenario: FutureScenario;
  krw: boolean;
}

export const SALARY_MIN = 1000;
export const SALARY_MAX = 15000;
export const RAISE_MIN = 0;
export const RAISE_MAX = 15;
export const PERIOD_MIN = 1;
export const PERIOD_MAX = 30;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function encodeShare(s: ShareState): string {
  const p = new URLSearchParams({
    mode: s.mode,
    idx: s.index,
    yrs: String(s.period),
    sal: String(s.salary),
    rai: String(s.raise),
    scn: s.scenario,
    krw: s.krw ? "1" : "0",
  });
  return p.toString();
}

export function decodeShare(search: string): Partial<ShareState> {
  const p = new URLSearchParams(search);
  const out: Partial<ShareState> = {};

  const mode = p.get("mode");
  if (mode === "back" || mode === "fwd") out.mode = mode;

  const idx = p.get("idx");
  if (idx && (INDEX_KEYS as string[]).includes(idx)) out.index = idx as IndexKey;

  const scn = p.get("scn");
  if (scn === "average" || scn === "worst") out.scenario = scn;

  // Only parse numeric fields when actually present — Number(null) is 0, which
  // would otherwise fabricate values for a missing param.
  const num = (key: string): number | null => {
    const raw = p.get(key);
    if (raw === null || raw.trim() === "") return null;
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  };

  const yrs = num("yrs");
  if (yrs !== null) out.period = clamp(Math.round(yrs), PERIOD_MIN, PERIOD_MAX);

  const sal = num("sal");
  if (sal !== null) out.salary = clamp(Math.round(sal), SALARY_MIN, SALARY_MAX);

  const rai = num("rai");
  if (rai !== null) out.raise = clamp(rai, RAISE_MIN, RAISE_MAX);

  const krw = p.get("krw");
  if (krw === "1" || krw === "0") out.krw = krw === "1";

  return out;
}
