"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import Term from "./Term";
import {
  DIVIDEND_YIELD,
  INDEX_COST,
  INDEX_KEYS,
  INDEX_LABELS,
  INDEX_META,
  IndexKey,
  RETURN_SOURCE,
  SAMPLE_MARKET,
  availableReturnYears,
  isUsdIndex,
  yearsForIndex,
} from "@/lib/indexData";
import { breakevenIndexReturn, cagrOf, formatMan, FutureScenario, historicalWinRate, Mode, retireTaxBreakdown, simulate } from "@/lib/calc";
import { DataSource, fetchMarketData } from "@/lib/api";
import MethodModal, { MethodData } from "./MethodModal";
import s from "./Simulator.module.css";

// 차트 좌표 상수
const W = 600;
const H = 300;
const PAD = { l: 56, r: 18, t: 20, b: 40 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

export default function Simulator() {
  const [mode, setMode] = useState<Mode>("back");
  const [futureScenario, setFutureScenario] = useState<FutureScenario>("worst");
  // 지수는 하나만 선택 (중복 선택 불가). calc는 배열을 받으므로 단일 원소 배열로 유지.
  const [indices, setIndices] = useState<IndexKey[]>(["sp"]);
  const [period, setPeriod] = useState(15);
  const [salary, setSalary] = useState(4000);
  const [raise, setRaise] = useState(3);
  const [krwConvert, setKrwConvert] = useState(false);
  const [market, setMarket] = useState(SAMPLE_MARKET);
  const [source, setSource] = useState<DataSource>("sample");
  const [asOf, setAsOf] = useState<string | undefined>(undefined);
  const [hover, setHover] = useState<number | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let alive = true;
    fetchMarketData().then((res) => {
      if (!alive) return;
      setMarket(res.data);
      setSource(res.source);
      setAsOf(res.asOf);
    });
    return () => {
      alive = false;
    };
  }, []);

  const availableYears = useMemo(() => availableReturnYears(market, indices), [market, indices]);
  // Backtest is bounded by available history; the future average scenario can
  // project a full 30-year career regardless of each index's history length.
  const maxPeriod = mode === "back" ? Math.min(30, Math.max(1, availableYears.length)) : 30;

  const effectivePeriod = Math.min(period, maxPeriod);

  // 원화 환산은 백테스트 + USD 지수에서만 의미가 있다.
  const usdSelected = indices[0] ? isUsdIndex(indices[0]) : false;
  const krwActive = mode === "back" && usdSelected && krwConvert;
  const r = useMemo(
    () => simulate(salary, raise, effectivePeriod, indices, mode, market, { futureScenario, krwConvert: krwActive }),
    [salary, raise, effectivePeriod, indices, mode, market, futureScenario, krwActive]
  );

  // 손익분기 수익률: 선택 지수가 매년 이 수익률(총수익, 비용 차감 전)을 내면 DC = DB.
  const breakeven = useMemo(
    () => breakevenIndexReturn(salary, raise, r.n, indices, market),
    [salary, raise, r.n, indices, market]
  );
  const indexCagr = indices[0] ? cagrOf(indices[0], market) : null;
  // 과거 모든 동일기간 구간 중 DC가 DB를 이긴 빈도 (정직한 확률적 보조지표).
  const winRate = useMemo(
    () => historicalWinRate(salary, raise, effectivePeriod, indices, market),
    [salary, raise, effectivePeriod, indices, market]
  );
  // 세후 실수령 차이 = DC 세후 − DB 세후. 수령 방식별로 둘 다 보여준다.
  const afterTaxIrpDiff = r.dcFinal - r.dcIrpTax - (r.dbFinal - r.dbIrpTax);
  const afterTaxLumpDiff = r.dcFinal - r.dcLumpTax - (r.dbFinal - r.dbLumpTax);
  const renderAfterTax = (diff: number) => {
    if (Math.abs(diff) / Math.max(r.dbFinal, r.dcFinal, 1) < 0.005) return <>DB ≈ DC 비슷</>;
    return diff > 0 ? (
      <>
        <b className={s.cAccent}>DC가 {formatMan(Math.abs(diff))}</b> 더 많음
      </>
    ) : (
      <>
        <b>DB가 {formatMan(Math.abs(diff))}</b> 더 많음
      </>
    );
  };

  // 단일 선택: 클릭한 지수 하나만 선택 (항상 하나는 선택 상태 유지)
  const selectIndex = (k: IndexKey) => setIndices([k]);

  const selectedYears = indices[0] ? yearsForIndex(market, indices[0]) : market.years;
  const maxBase = useMemo(() => {
    let m = 1;
    for (let i = 0; i <= r.n; i++) m = Math.max(m, r.dbArr[i], r.dcArr[i]);
    return m;
  }, [r]);
  const maxY = maxBase * 1.08;
  const yfmt = (v: number) => {
    v = Math.round(v);
    if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억`;
    if (v >= 1000) return `${Math.round(v / 1000)}천만`;
    return `${v}만`;
  };

  // 좌표는 소수 1자리로 고정 → SSR/CSR 부동소수 차이로 인한 hydration mismatch 방지
  const px = (i: number) => Math.round((PAD.l + (i / r.n) * PLOT_W) * 10) / 10;
  const py = (v: number) => Math.round((PAD.t + (1 - v / maxY) * PLOT_H) * 10) / 10;
  const ptStr = (arr: number[]) =>
    arr.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const dbPts = ptStr(r.dbArr);
  const dcPts = ptStr(r.dcArr);
  const areaD = `M${px(0).toFixed(1)},${(PAD.t + PLOT_H).toFixed(1)} L${dcPts.replace(
    / /g,
    " L"
  )} L${px(r.n).toFixed(1)},${(PAD.t + PLOT_H).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxBase);

  const chartYears = mode === "back" ? availableYears.slice(Math.max(0, availableYears.length - r.n)) : [];
  const yearLabel = (i: number) => {
    if (mode === "back") {
      if (i === 0) return String((chartYears[0] ?? selectedYears[0]) - 1);
      return String(chartYears[i - 1] ?? "");
    }
    return i === 0 ? "지금" : `${i}년`;
  };
  const xTickIdx = useMemo(() => {
    const step = Math.max(1, Math.round(r.n / 5));
    const arr: number[] = [];
    for (let i = 0; i <= r.n; i += step) arr.push(i);
    if (arr[arr.length - 1] !== r.n) arr.push(r.n);
    return arr;
  }, [r]);

  const setHoverFromClientX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = 0;
    const vbX = pt.matrixTransform(ctm.inverse()).x;
    let idx = Math.round(((vbX - PAD.l) / PLOT_W) * r.n);
    if (!Number.isFinite(idx)) return;
    idx = Math.max(0, Math.min(r.n, idx));
    setHover(idx);
  };
  const onMove = (e: ReactMouseEvent<SVGSVGElement>) => setHoverFromClientX(e.clientX);
  // Touch support so the year-by-year tooltip works on mobile (no hover).
  const onTouch = (e: ReactTouchEvent<SVGSVGElement>) => {
    const t = e.touches[0];
    if (t) setHoverFromClientX(t.clientX);
  };

  const diff = r.dcFinal - r.dbFinal;
  const near = Math.abs(diff) / Math.max(r.dbFinal, r.dcFinal, 1) < 0.005;
  const verb = mode === "back" ? "더 많았습니다" : "더 많을 것으로 예상";
  let verdict: string;
  let verdictColor: string;
  if (near) {
    verdict = `DB ≈ DC 비슷${mode === "back" ? "했습니다" : "할 것으로 예상"}`;
    verdictColor = "var(--text)";
  } else if (diff > 0) {
    verdict = `DC형이 ${formatMan(Math.abs(diff))} ${verb}`;
    verdictColor = "var(--accent-text)";
  } else {
    verdict = `DB형이 ${formatMan(Math.abs(diff))} ${verb}`;
    verdictColor = "var(--text)";
  }

  // '계산 근거' 모달에 넘길 현재 결과 기반 데이터 (실제값 계산식·지수 출처).
  const methodIndex = indices[0] ?? "sp";
  const methodCost = INDEX_COST[methodIndex];
  const methodData: MethodData = {
    mode,
    scenario: futureScenario,
    krwActive,
    indexLabel: INDEX_LABELS[methodIndex],
    indexKey: methodIndex,
    source,
    asOf,
    basis: RETURN_SOURCE[methodIndex],
    dividendYield: DIVIDEND_YIELD[methodIndex],
    etf: methodCost.etf,
    realCost: methodCost.realCost,
    yearsStart: selectedYears[0],
    yearsEnd: selectedYears[selectedYears.length - 1],
    indexCagr: indexCagr ?? cagrOf(methodIndex, market),
    salary,
    raise,
    n: r.n,
    dep: market.depositRate,
    monthlyFirst: salary / 12,
    lastMonthlyWage: (salary * Math.pow(1 + raise / 100, Math.max(r.n - 1, 0))) / 12,
    dbFinal: r.dbFinal,
    dcFinal: r.dcFinal,
    portfolioCagr: r.cagr,
    breakeven,
    dbLump: retireTaxBreakdown(r.dbFinal, r.n),
    dcLump: retireTaxBreakdown(r.dcFinal, r.n),
    dbIrpTax: r.dbIrpTax,
    dcIrpTax: r.dcIrpTax,
    irpPayoutYears: r.irpPayoutYears,
  };

  return (
    <div className={s.wrap} id="simulator">
      <div className={s.toolHead}>
        <h2 className={s.toolTitle}>내 조건으로 직접 비교</h2>
        <p className={s.toolSub}>
          안전자산 30% + 위험자산 70%(DC 법정 한도)로, 과거 수익률을 되짚거나 미래를
          예측해 비교합니다.
        </p>
      </div>

      <div className={s.modeRow} role="tablist" aria-label="모드">
        <span className={s.modeThumb} data-mode={mode} aria-hidden="true" />
        <button
          role="tab"
          aria-selected={mode === "back"}
          className={`${s.modeBtn} ${mode === "back" ? s.modeBtnOn : ""}`}
          onClick={() => setMode("back")}
        >
          과거 백테스트
        </button>
        <button
          role="tab"
          aria-selected={mode === "fwd"}
          className={`${s.modeBtn} ${mode === "fwd" ? s.modeBtnOn : ""}`}
          onClick={() => setMode("fwd")}
        >
          미래 시뮬레이션
        </button>
      </div>

      <div className={s.card}>
        <div className={s.sourceRow}>
          <span className={s.cardLabel} style={{ marginBottom: 0 }}>
            위험자산 70% — 담을 지수 (하나 선택)
          </span>
          <span className={source === "live" ? s.badgeLive : s.badgeSample}>
            {source === "live" ? `실데이터${asOf ? " · " + asOf : ""}` : "지수 연간 수익률"}
          </span>
        </div>
        <div className={s.chips} role="radiogroup" aria-label="위험자산 지수 선택">
          {INDEX_KEYS.map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={indices.includes(k)}
              className={`${s.btn} ${indices.includes(k) ? s.btnOn : ""}`}
              onClick={() => selectIndex(k)}
            >
              {INDEX_LABELS[k]}
            </button>
          ))}
        </div>

        {indices[0] && (
          <div className={s.indexInfo}>
            <div className={s.indexInfoHead}>{INDEX_LABELS[indices[0]]}</div>
            <p className={s.indexInfoDesc}>{INDEX_META[indices[0]].desc}</p>
            <div className={s.indexAvg}>
              <span className={s.indexAvgLabel}>
                <Term tip="전체 보유 기간의 기하평균 수익률(CAGR). 배당을 다시 투자한 '총수익(Total Return)' 기준이며, 단순 산술평균이 아닙니다. 비용 차감 전 지수 자체의 수익률입니다.">
                  지수 연평균 수익률
                </Term>
              </span>
              <span className={s.indexAvgVal}>
                연 {(cagrOf(indices[0], market) * 100).toFixed(1)}%
              </span>
              <span className={s.indexAvgNote}>
                {selectedYears[0]}~{selectedYears[selectedYears.length - 1]} · 배당 재투자 포함 · 비용 차감 전
              </span>
            </div>
            <div className={s.indexAvg}>
              <span className={s.indexAvgLabel}>
                <Term tip="명목 총보수가 아니라 실부담비용률(보수+매매·중개비 등)입니다. DC 위험자산(70%)의 추종 ETF에서 매년 빠지는 실제 비용으로, 지수 수익률에서 차감해 반영합니다.">
                  비용 차감(DC 적용)
                </Term>
              </span>
              <span className={s.indexAvgVal}>
                연 −{(INDEX_COST[indices[0]].realCost * 100).toFixed(2)}%
              </span>
              <span className={s.indexAvgNote}>
                {INDEX_COST[indices[0]].etf} 실부담비용
                {INDEX_COST[indices[0]].verified ? "" : " (추정)"}
              </span>
            </div>
            <div className={s.indexCompanies}>
              <span className={s.indexCompaniesLabel}>구성 종목 예시</span>
              {INDEX_META[indices[0]].companies.map((c) => (
                <span key={c} className={s.companyTag}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {mode === "back" && usdSelected && (
          <label className={s.fxRow}>
            <input
              type="checkbox"
              className={s.fxCheck}
              checked={krwConvert}
              onChange={(e) => setKrwConvert(e.target.checked)}
            />
            <span className={s.fxText}>
              <span className={s.fxTitle}>원화 환산</span>
              <span className={s.fxHint}>
                해외 지수는 달러로 계산됩니다. 켜면 <b>환헤지 안 한 ETF</b>처럼, 지수 수익률에
                그해 원/달러 환율 변동까지 더해 <b>원화로 체감한 실제 수익</b>으로 바꿉니다.
                {krwConvert
                  ? " 환율은 World Bank 연평균이라 연말 급등락은 일부만 반영된 추정치이며, 환헤지형 상품은 결과가 다릅니다."
                  : " (끄면 달러 기준)"}
              </span>
            </span>
          </label>
        )}

        <div className={s.row}>
          <label className={s.rowLabel}>
            {mode === "back" ? "백테스트 기간" : "시뮬레이션 기간"}
          </label>
          <input
            type="range"
            min={1}
            max={maxPeriod}
            step={1}
            value={effectivePeriod}
            onChange={(e) => setPeriod(+e.target.value)}
          />
          <span className={s.rowVal}>{effectivePeriod}년{maxPeriod < 30 ? ` / 최대 ${maxPeriod}년` : ""}</span>
        </div>

        <div className={s.row}>
          <label className={s.rowLabel}>
            <Term tip="세전 연 임금총액(상여·수당 포함). DB의 평균임금과 DC 부담금이 모두 이 값을 기준으로 계산되므로, 상여를 뺀 기본급만 넣으면 두 금액이 함께 과소평가됩니다.">
              현재 연봉
            </Term>
          </label>
          <input
            type="range"
            min={1000}
            max={15000}
            step={100}
            value={salary}
            onChange={(e) => setSalary(+e.target.value)}
          />
          <span className={s.rowVal}>{salary.toLocaleString()}만원</span>
        </div>
        <div className={s.row}>
          <label className={s.rowLabel}>
            <Term tip="매년 연봉이 오르는 비율. 정기 호봉·물가 반영분을 포함합니다. 보통 3~5%, 호봉제·승진이 잦으면 더 높습니다. 높을수록 DB가 유리해집니다.">
              연봉 상승률
            </Term>
          </label>
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={raise}
            onChange={(e) => setRaise(+e.target.value)}
          />
          <span className={s.rowVal}>{raise.toFixed(1)}%</span>
        </div>
        <div className={s.note}>
          안전자산 30%: 연 <b>{(market.depositRate * 100).toFixed(1)}%</b> · 위험자산 70%: 선택 지수 수익률
        </div>
      </div>

      <div className={s.verdict}>
        <div className={s.verdictTop}>
          {mode === "back" ? `최근 ${r.n}년 백테스트 결과` : `향후 ${r.n}년 시뮬레이션 결과`}
        </div>
        <div className={s.verdictText} style={{ color: verdictColor }}>
          {verdict}
        </div>
        <div className={s.statsLine}>
          {mode === "back" ? (
            <>
              내 포트폴리오 연평균{" "}
              <span className={`${s.hl} ${s.cAccent}`}>
                연 {(r.cagr * 100).toFixed(1)}%
              </span>{" "}
              · 최악의 해{" "}
              <span className={`${s.hl} ${s.cDanger}`}>
                {(r.worst * 100).toFixed(1)}%
              </span>
              <span className={s.statsNote}> (안전 30 + 위험 70, 비용 반영)</span>
            </>
          ) : (
            <>
              {futureScenario === "average" ? "평균 시나리오 · 내 포트폴리오 연평균" : "최악 시나리오 · 내 포트폴리오 연평균"}{" "}
              <span className={`${s.hl} ${s.cAccent}`}>
                {(r.cagr * 100).toFixed(1)}%
              </span>{" "}
              {futureScenario === "average"
                ? "(선택 지수 과거 CAGR 적용)"
                : r.scenarioStart && r.scenarioEnd
                  ? `(과거 최악 ${r.n}년 경로: ${r.scenarioStart}~${r.scenarioEnd})`
                  : "(안전자산만 선택)"}
            </>
          )}
        </div>
      </div>

      {breakeven !== null && indices[0] && (
        <div className={s.breakeven}>
          <div className={s.breakevenHead}>
            <span className={s.breakevenLabel}>
              <Term tip="선택한 지수가 매년 이 수익률을 내면 DC의 최종 적립금이 DB와 같아지는 분기점입니다. 이보다 높으면 DC, 낮으면 DB가 유리합니다. (안전자산 30%·비용·연봉상승률을 반영한 값)">
                손익분기 수익률
              </Term>
            </span>
            <span className={s.breakevenVal}>연 {(breakeven * 100).toFixed(1)}%</span>
          </div>
          <p className={s.breakevenDesc}>
            {INDEX_LABELS[indices[0]]}가 매년 이보다 <b className={s.cAccent}>높으면 DC</b>,{" "}
            <b>낮으면 DB</b>가 유리합니다.
            {indexCagr !== null && (
              <>
                {" "}
                이 지수의 과거 연평균은 <b>연 {(indexCagr * 100).toFixed(1)}%</b>였습니다
                {indexCagr > breakeven ? " (과거 기준 DC 우위)" : " (과거 기준 DB 우위)"}.
              </>
            )}
          </p>
          {winRate && winRate.windows >= 2 && (
            <p className={s.breakevenFreq}>
              과거 모든 {winRate.windowSize}년 구간 중{" "}
              <b className={s.cAccent}>{Math.round(winRate.winRate * 100)}%</b>
              에서 DC가 DB를 앞섰습니다{" "}
              <span className={s.breakevenFreqNote}>({winRate.windows}개 구간 · 미래 보장 아님)</span>
            </p>
          )}
        </div>
      )}

      <div className={`${s.chartShell} ${mode === "fwd" ? s.chartShellWithAside : ""}`}>
        {mode === "fwd" && (
          <div className={s.scenarioAside}>
            <span className={s.scenarioLabel}>미래 시나리오</span>
            <div className={s.scenarioToggle} role="radiogroup" aria-label="미래 시나리오">
              <button
                type="button"
                role="radio"
                aria-checked={futureScenario === "average"}
                className={`${s.scenarioBtn} ${futureScenario === "average" ? s.scenarioBtnOn : ""}`}
                onClick={() => setFutureScenario("average")}
              >
                평균
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={futureScenario === "worst"}
                className={`${s.scenarioBtn} ${futureScenario === "worst" ? s.scenarioBtnOn : ""}`}
                onClick={() => setFutureScenario("worst")}
              >
                최악
              </button>
            </div>
          </div>
        )}
        <div className={s.chartMain}>
          <div className={s.legendRow}>
            <div className={s.cardLabel} style={{ marginBottom: 0 }}>
              {mode === "back"
                ? "연도별 적립금 추이 (실제 수익률 반영)"
                : futureScenario === "average"
                  ? "연도별 적립금 추이 (평균 시나리오)"
                  : "연도별 적립금 추이 (최악 시나리오)"}
            </div>
            <div className={s.legend}>
              <span className={s.cSecondary}>
                <span className={s.swatch} style={{ background: "var(--neutral)" }} />
                DB
              </span>
              <span className={s.cAccent}>
                <span className={s.swatch} style={{ background: "var(--accent)" }} />
                DC
              </span>
            </div>
          </div>

          {mode === "fwd" && (
            <div className={s.avgWarn}>
              <b>미래 수익은 해마다 크게 오르내려 확정이 아닙니다.</b>{" "}
              {futureScenario === "average"
                ? "이 선은 ‘매년 같은 수익률’을 가정한 것일 뿐, 실제로는 손실 구간도 생깁니다. ‘최악’ 시나리오도 함께 확인하세요."
                : "‘최악’은 과거 같은 기간 중 최종 적립금이 가장 적었던 실제 경로입니다. 그래서 연평균 %는 ‘평균’보다 높게 보일 수도 있어요(아래 ‘계산 근거’에서 설명). 미래는 이보다 더 나쁠 수도 있습니다."}
            </div>
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className={s.chart}
            role="img"
            aria-label="연도별 DB와 DC 적립금 추이"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onTouchStart={onTouch}
            onTouchMove={onTouch}
            onTouchEnd={() => setHover(null)}
          >
            {yTicks.map((tv, i) => (
              <g key={`y${i}`}>
                <line
                  x1={PAD.l}
                  y1={py(tv)}
                  x2={W - PAD.r}
                  y2={py(tv)}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray={i === 0 ? undefined : "2 5"}
                />
                <text
                  x={PAD.l - 8}
                  y={py(tv) + 3}
                  fontSize={10.5}
                  fill="var(--text-tertiary)"
                  textAnchor="end"
                >
                  {i === 0 ? "0" : yfmt(tv)}
                </text>
              </g>
            ))}

            <path d={areaD} fill="var(--accent)" fillOpacity={0.08} />
            <polyline
              points={dbPts}
              fill="none"
              stroke="var(--neutral)"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <polyline
              points={dcPts}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />


            <circle cx={px(r.n)} cy={py(r.dbArr[r.n])} r={3} fill="var(--neutral)" />
            <circle cx={px(r.n)} cy={py(r.dcArr[r.n])} r={3.5} fill="var(--accent)" />

            {xTickIdx.map((i) => (
              <text
                key={`x${i}`}
                x={px(i)}
                y={H - 14}
                fontSize={10.5}
                fill="var(--text-tertiary)"
                textAnchor={i === 0 ? "start" : i === r.n ? "end" : "middle"}
              >
                {yearLabel(i)}
              </text>
            ))}

            {hover !== null &&
              (() => {
                const bx = Math.min(Math.max(px(hover) + 10, PAD.l), W - PAD.r - 138);
                const tx = bx + 12;
                // 백테스트 모드에서 해당 연도(hover) DC 포트폴리오 수익률 (0이면 시작점 → 없음)
                const dcRet = mode === "back" && hover >= 1 ? r.rets[hover - 1] : null;
                const boxH = dcRet !== null ? 82 : 64;
                return (
                  <g>
                    <line
                      x1={px(hover)}
                      y1={PAD.t}
                      x2={px(hover)}
                      y2={PAD.t + PLOT_H}
                      stroke="var(--border-strong)"
                      strokeWidth={1}
                    />
                    <circle cx={px(hover)} cy={py(r.dbArr[hover])} r={3.5} fill="var(--neutral)" />
                    <circle cx={px(hover)} cy={py(r.dcArr[hover])} r={4} fill="var(--accent)" />
                    <rect
                      x={bx}
                      y={PAD.t + 4}
                      width={138}
                      height={boxH}
                      rx={8}
                      fill="var(--bg-surface)"
                      stroke="var(--border-strong)"
                      strokeWidth={0.5}
                    />
                    <text x={tx} y={PAD.t + 22} fontSize={11} fill="var(--text-secondary)">
                      {yearLabel(hover)}
                    </text>
                    <text x={tx} y={PAD.t + 40} fontSize={11.5} fill="var(--neutral)">
                      DB {formatMan(r.dbArr[hover])}
                    </text>
                    <text x={tx} y={PAD.t + 58} fontSize={11.5} fill="var(--accent-text)">
                      DC {formatMan(r.dcArr[hover])}
                    </text>
                    {dcRet !== null && (
                      <text
                        x={tx}
                        y={PAD.t + 76}
                        fontSize={11}
                        fill={dcRet >= 0 ? "var(--accent-text)" : "var(--danger)"}
                      >
                        DC 수익률 {dcRet >= 0 ? "+" : ""}
                        {(dcRet * 100).toFixed(1)}%
                      </text>
                    )}
                  </g>
                );
              })()}
          </svg>
        </div>
      </div>

      <div className={s.grid2}>
        <div className={s.metric}>
          <div className={`${s.metricLabel} ${s.cSecondary}`}>DB형 세전</div>
          <div className={s.metricVal}>{formatMan(r.dbFinal)}</div>
        </div>
        <div className={s.metric}>
          <div className={`${s.metricLabel} ${s.cAccent}`}>DC형 세전</div>
          <div className={`${s.metricVal} ${s.cAccent}`}>{formatMan(r.dcFinal)}</div>
        </div>
      </div>

      <div className={s.cardLabel}>수령 방식별 세금 (예상)</div>
      <div className={s.grid2}>
        <TaxCard title="DB형" gross={r.dbFinal} lumpTax={r.dbLumpTax} irpTax={r.dbIrpTax} />
        <TaxCard title="DC형" gross={r.dcFinal} lumpTax={r.dcLumpTax} irpTax={r.dcIrpTax} />
      </div>
      <div className={s.irpNote}>
        IRP 연금수령 세금은 <b>{r.irpPayoutYears}년 균등수령</b>을 가정합니다.
        10년차까지 이연퇴직소득세의 70%, 11년차부터 60%를 반영했습니다. DC형 기준 약 <b>{formatMan(r.dcLumpTax - r.dcIrpTax)}</b> 절세.
      </div>

      <div className={s.afterTaxVerdict}>
        <span className={s.afterTaxLabel}>세후 실수령 결론</span>
        <div className={s.afterTaxRow}>
          <span className={s.afterTaxWay}>일시금 수령</span>
          <span className={s.afterTaxText}>{renderAfterTax(afterTaxLumpDiff)}</span>
        </div>
        <div className={s.afterTaxRow}>
          <span className={s.afterTaxWay}>IRP 연금수령</span>
          <span className={s.afterTaxText}>{renderAfterTax(afterTaxIrpDiff)}</span>
        </div>
      </div>

      <p className={s.inlineDisclaimer}>
        본 결과는 입력값과 과거 데이터에 기반한 <b>정보 제공용 추정</b>이며, 특정 상품·제도 가입을
        권유하지 않습니다. 과거 수익률은 미래를 보장하지 않으며, 개인 상황에 따라 결과가 달라질 수
        있습니다. 투자·세무 판단은 전문가와 상담하세요.
      </p>

      <button
        type="button"
        className={s.methodBtn}
        onClick={() => setMethodOpen(true)}
        aria-haspopup="dialog"
      >
        <span className={s.methodBtnIcon} aria-hidden="true">
          ?
        </span>
        이 결과는 어떻게 계산되나요?
      </button>

      <MethodModal open={methodOpen} onClose={() => setMethodOpen(false)} data={methodData} />
    </div>
  );
}

function taxRateOf(tax: number, gross: number): string {
  if (gross <= 0) return "0.0%";
  return `${((tax / gross) * 100).toFixed(1)}%`;
}

function TaxCard({
  title,
  gross,
  lumpTax,
  irpTax,
}: {
  title: string;
  gross: number;
  lumpTax: number;
  irpTax: number;
}) {
  const lumpTaxRate = taxRateOf(lumpTax, gross);
  const irpTaxRate = taxRateOf(irpTax, gross);

  return (
    <div className={s.taxCard}>
      <div className={s.taxTitle}>{title}</div>
      <div className={s.taxRow}>
        <span className={s.cSecondary}>일시금 세금 ({lumpTaxRate})</span>
        <span className={s.cDanger}>{formatMan(-lumpTax)}</span>
      </div>
      <div className={s.taxRow}>
        <span className={s.cSecondary}>일시금 세후</span>
        <span>{formatMan(gross - lumpTax)}</span>
      </div>
      <div className={`${s.taxRow} ${s.taxRowSep}`}>
        <span className={s.cAccent}>
          <Term tip="퇴직급여를 IRP 계좌로 옮겨 만 55세 이후 연금으로 나눠 받는 방식. 일시금 대신 연금으로 받으면 이연퇴직소득세를 10년 이내 30%, 11년 이후 40% 덜 냅니다.">
            IRP 연금수령
          </Term>{" "}
          세금 ({irpTaxRate})
        </span>
        <span className={s.cAccent}>{formatMan(-irpTax)}</span>
      </div>
      <div className={s.taxRow} style={{ marginBottom: 0 }}>
        <span className={s.cAccent}>IRP 세후</span>
        <span className={`${s.cAccent} ${s.hl}`}>{formatMan(gross - irpTax)}</span>
      </div>
    </div>
  );
}
