"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  INDEX_KEYS,
  INDEX_LABELS,
  INDEX_META,
  IndexKey,
  SAMPLE_MARKET,
} from "@/lib/indexData";
import { formatMan, Mode, simulate } from "@/lib/calc";
import { DataSource, fetchMarketData } from "@/lib/api";
import s from "./Simulator.module.css";

// 차트 좌표 상수
const W = 600;
const H = 300;
const PAD = { l: 56, r: 18, t: 20, b: 40 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

export default function Simulator() {
  const [mode, setMode] = useState<Mode>("back");
  // 지수는 하나만 선택 (중복 선택 불가). calc는 배열을 받으므로 단일 원소 배열로 유지.
  const [indices, setIndices] = useState<IndexKey[]>(["sp"]);
  const [period, setPeriod] = useState(15);
  const [salary, setSalary] = useState(4000);
  const [raise, setRaise] = useState(3);
  const [wagePeak, setWagePeak] = useState(false);
  const [market, setMarket] = useState(SAMPLE_MARKET);
  const [source, setSource] = useState<DataSource>("sample");
  const [asOf, setAsOf] = useState<string | undefined>(undefined);
  const [hover, setHover] = useState<number | null>(null);
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

  const r = useMemo(
    () => simulate(salary, raise, period, indices, mode, market, { wagePeak }),
    [salary, raise, period, indices, mode, market, wagePeak]
  );

  // 단일 선택: 클릭한 지수 하나만 선택 (항상 하나는 선택 상태 유지)
  const selectIndex = (k: IndexKey) => setIndices([k]);

  const ys = market.years;
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
  const crossover = useMemo(() => {
    for (let i = 1; i <= r.n; i++) if (r.dcArr[i] >= r.dbArr[i]) return i;
    return null;
  }, [r]);

  const yearLabel = (i: number) => {
    if (mode === "back") {
      if (i === 0) return String(ys[ys.length - r.n] - 1);
      return String(ys[ys.length - r.n + (i - 1)]);
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

  const onMove = (e: ReactMouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const vbX = pt.matrixTransform(ctm.inverse()).x;
    let idx = Math.round(((vbX - PAD.l) / PLOT_W) * r.n);
    if (!Number.isFinite(idx)) return;
    idx = Math.max(0, Math.min(r.n, idx));
    setHover(idx);
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


  return (
    <div className={s.wrap} id="simulator">
      <div className={s.toolHead}>
        <div className={s.kicker}>
          <span className={s.kdot} aria-hidden="true" />
          시뮬레이터
        </div>
        <h2 className={s.toolTitle}>내 조건으로 직접 비교</h2>
        <p className={s.toolSub}>
          안전자산 30% + 위험자산 70%(DC 법정 한도)로, 과거 수익률을 되짚거나 미래를
          예측해 비교합니다.
        </p>
      </div>

      <div className={s.modeRow} role="tablist" aria-label="모드">
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
          미래 예측
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
            <div className={s.indexCompanies}>
              <span className={s.indexCompaniesLabel}>주요 기업</span>
              {INDEX_META[indices[0]].companies.map((c) => (
                <span key={c} className={s.companyTag}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className={s.row}>
          <label className={s.rowLabel}>
            {mode === "back" ? "백테스트 기간" : "예측 기간"}
          </label>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={period}
            onChange={(e) => setPeriod(+e.target.value)}
          />
          <span className={s.rowVal}>{period}년</span>
        </div>
        <div className={s.row}>
          <label className={s.rowLabel}>현재 연봉</label>
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
          <label className={s.rowLabel}>연봉 상승률</label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={raise}
            onChange={(e) => setRaise(+e.target.value)}
          />
          <span className={s.rowVal}>{raise.toFixed(1)}%</span>
        </div>
        <div style={{ marginBottom: "1.25rem" }}>
          <button
            className={`${s.btn} ${wagePeak ? s.btnOn : ""}`}
            onClick={() => setWagePeak((v) => !v)}
            aria-pressed={wagePeak}
          >
            임금피크제 가정 (DB 최종임금 30%↓)
          </button>
        </div>
        <div className={s.note}>
          안전자산 30%: 연 <b>{(market.depositRate * 100).toFixed(1)}%</b> (2026년
          원리금보장형 기준)
        </div>
      </div>

      <div className={s.verdict}>
        <div className={s.verdictTop}>
          {mode === "back" ? `최근 ${r.n}년 백테스트 결과` : `향후 ${r.n}년 예측 결과`}
        </div>
        <div className={s.verdictText} style={{ color: verdictColor }}>
          {verdict}
        </div>
        <div className={s.statsLine}>
          {mode === "back" ? (
            <>
              연평균 수익률{" "}
              <span className={`${s.hl} ${s.cAccent}`}>
                연 {(r.cagr * 100).toFixed(1)}%
              </span>{" "}
              · 최악의 해{" "}
              <span className={`${s.hl} ${s.cDanger}`}>
                {(r.worst * 100).toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              가정 연평균 수익률{" "}
              <span className={`${s.hl} ${s.cAccent}`}>
                연 {(r.cagr * 100).toFixed(1)}%
              </span>{" "}
              (선택 지수 과거 평균 기반)
            </>
          )}
        </div>
      </div>

      <div className={s.legendRow}>
        <div className={s.cardLabel} style={{ marginBottom: 0 }}>
          {mode === "back"
            ? "연도별 적립금 추이 (실제 수익률 반영)"
            : "연도별 적립금 추이 (과거 평균 가정)"}
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

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={s.chart}
        role="img"
        aria-label="연도별 DB와 DC 적립금 추이"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
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

        {crossover !== null && (
          <g>
            <line
              x1={px(crossover)}
              y1={PAD.t}
              x2={px(crossover)}
              y2={PAD.t + PLOT_H}
              stroke="var(--accent)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <text
              x={px(crossover) > W - 96 ? px(crossover) - 6 : px(crossover) + 6}
              y={PAD.t + 12}
              fontSize={11}
              fill="var(--accent-text)"
              textAnchor={px(crossover) > W - 96 ? "end" : "start"}
            >
              {(mode === "back" ? yearLabel(crossover) : `${crossover}년차`) + " 역전"}
            </text>
          </g>
        )}

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

        {hover !== null && (
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
            <g>
              <rect
                x={Math.min(Math.max(px(hover) + 10, PAD.l), W - PAD.r - 138)}
                y={PAD.t + 4}
                width={138}
                height={64}
                rx={8}
                fill="var(--bg-surface)"
                stroke="var(--border-strong)"
                strokeWidth={0.5}
              />
              {(() => {
                const tx = Math.min(Math.max(px(hover) + 10, PAD.l), W - PAD.r - 138) + 12;
                return (
                  <>
                    <text x={tx} y={PAD.t + 22} fontSize={11} fill="var(--text-secondary)">
                      {yearLabel(hover)}
                    </text>
                    <text x={tx} y={PAD.t + 40} fontSize={11.5} fill="var(--neutral)">
                      DB {formatMan(r.dbArr[hover])}
                    </text>
                    <text x={tx} y={PAD.t + 58} fontSize={11.5} fill="var(--accent-text)">
                      DC {formatMan(r.dcArr[hover])}
                    </text>
                  </>
                );
              })()}
            </g>
          </g>
        )}
      </svg>

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
        일시금 대신 <b>IRP로 연금수령</b>하면 퇴직소득세의 30%가 감면됩니다 (10년 이내
        수령 가정). DC형 기준 약 <b>{formatMan(r.dcLumpTax - r.dcIrpTax)}</b> 절세.
      </div>

      <div className={s.accuracy}>
        <div className={s.accuracyTitle}>
          정확도 안내 — 참고용 추정치입니다
        </div>
        <ul>
          <li>
            지수 수익률은 각 지수의 <b>연간 등락률(가격수익률·현지통화 기준)</b>입니다.
            출처: KRX·지수 공시.
          </li>
          <li>
            해외 지수는 <b>USD 기준</b>이라 원화로 환산(환율)하면 결과가 달라집니다 — 현재
            환율 미반영.
          </li>
          <li>매년 30/70 리밸런싱, 운용보수·거래비용은 미반영 가정입니다.</li>
          <li>
            세금은 현행 퇴직소득세 산식 기반 <b>추정</b>입니다. DC 회사부담금과 그
            운용수익 전액을 퇴직소득으로 과세(현행과 일치)했으나, 개인 추가납입(IRP
            세액공제분)은 미반영입니다.
          </li>
          <li>
            IRP 절세는 연금 실제수령 <b>10년 이내(30% 감면)</b> 가정이며, 11년 이상은
            40% 감면입니다.
          </li>
          <li>
            DB는 <b>퇴직 직전 평균임금</b> 기준이라 임금피크·강등에 취약합니다(옵션으로
            가정 가능).
          </li>
          <li>미래 예측은 과거 평균 수익률을 그대로 가정한 단순 투영입니다.</li>
        </ul>
      </div>

      <p className={s.disclaimer}>
        과거 수익률은 미래 수익을 보장하지 않습니다. 본 시뮬레이션은 정보 제공용이며
        투자 권유·자문이 아닙니다.
      </p>
    </div>
  );
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
  return (
    <div className={s.taxCard}>
      <div className={s.taxTitle}>{title}</div>
      <div className={s.taxRow}>
        <span className={s.cSecondary}>일시금 세금</span>
        <span className={s.cDanger}>{formatMan(-lumpTax)}</span>
      </div>
      <div className={s.taxRow}>
        <span className={s.cSecondary}>일시금 세후</span>
        <span>{formatMan(gross - lumpTax)}</span>
      </div>
      <div className={`${s.taxRow} ${s.taxRowSep}`}>
        <span className={s.cAccent}>IRP 연금수령 세금</span>
        <span className={s.cAccent}>{formatMan(-irpTax)}</span>
      </div>
      <div className={s.taxRow} style={{ marginBottom: 0 }}>
        <span className={s.cAccent}>IRP 세후</span>
        <span className={`${s.cAccent} ${s.hl}`}>{formatMan(gross - irpTax)}</span>
      </div>
    </div>
  );
}
