// Pull the OFFICIAL World Bank annual series for Korea and print ready-to-paste
// arrays for web/src/lib/indexData.ts. Run where the network is reachable:
//
//   node web/scripts/fetch-official-rates.mjs
//
// Sources (World Bank Open Data, indicator API):
//   FR.INR.DPST  — Deposit interest rate (%), annual average
//   PA.NUS.FCRF  — Official exchange rate (KRW per US$), period (annual) average
//
// Deposit rate → DEPOSIT_RATE_BY_YEAR (annual fraction).
// FX → USDKRW_RETURN_BY_YEAR (year-over-year change of the annual-average rate).
// Note: FX is annual-average based; year-end (BOK ECOS 종가) would track a single
// calendar year's move more tightly. 1995 deposit and the latest year may be null
// until World Bank publishes them — fill those provisionally and flag in source.

const BASE = "https://api.worldbank.org/v2/country/KOR/indicator";
const START = 1994;
const END = 2025;

async function series(indicator) {
  const url = `${BASE}/${indicator}?format=json&per_page=400&date=${START}:${END}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${indicator}: HTTP ${res.status}`);
  const [, rows] = await res.json();
  const out = {};
  for (const r of rows ?? []) if (r.value !== null) out[Number(r.date)] = r.value;
  return out;
}

const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

const dep = await series("FR.INR.DPST");
const fx = await series("PA.NUS.FCRF");

console.log("// DEPOSIT_RATE_BY_YEAR (World Bank FR.INR.DPST, annual avg, fraction)");
for (let y = 1995; y <= END; y++) {
  console.log(`  ${y}: ${y in dep ? round(dep[y] / 100, 4) : "/* null — provisional */"},`);
}

console.log("\n// USDKRW_RETURN_BY_YEAR (YoY change of World Bank PA.NUS.FCRF annual avg)");
for (let y = 1995; y <= END; y++) {
  const here = fx[y];
  const prev = fx[y - 1];
  const v = here != null && prev != null ? round(here / prev - 1, 4) : "/* missing — provisional */";
  console.log(`  ${y}: ${v},`);
}
