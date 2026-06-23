"use client";

import { useMemo, useState } from "react";
import { INDEX_KEYS, INDEX_LABELS, IndexKey, YEARS } from "@/lib/indexData";
import { formatMan, Mode, simulate } from "@/lib/calc";
import s from "./Simulator.module.css";

// 차트 좌표 상수
const W = 600;
const H = 250;
const PAD = { l: 10, r: 10, t: 14, b: 34 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

function points(arr: number[], n: number, maxY: number): string {
  return arr
    .map((v, i) => {
      const x = PAD.l + (i / n) * PLOT_W;
      const y = PAD.t + (1 - v / maxY) * PLOT_H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function Simulator() {
  const [mode, setMode] = useState<Mode>("back");
  const [indices, setIndices] = useState<IndexKey[]>(["sp", "nq", "ks"]);
  const [period, setPeriod] = useState(15);
  const [salary, setSalary] = useState(4000);
  const [raise, setRaise] = useState(3);

  const r = useMemo(
    () => simulate(salary, raise, period, indices, mode),
    [salary, raise, period, indices, mode]
  );

  const toggleIndex = (k: IndexKey) =>
    setIndices((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );

  const maxY = useMemo(() => {
    let m = 1;
    for (let i = 0; i <= r.n; i++) m = Math.max(m, r.dbArr[i], r.dcArr[i]);
    return m * 1.08;
  }, [r]);

  const dbPts = points(r.dbArr, r.n, maxY);
  const dcPts = points(r.dcArr, r.n, maxY);
  const areaD = `M${PAD.l},${PAD.t + PLOT_H} L${dcPts.replace(/ /g, " L")} L${(
    PAD.l + PLOT_W
  ).toFixed(1)},${PAD.t + PLOT_H} Z`;

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

  const start = r.calendarStart;
  const xLabels =
    mode === "back" && start !== null
      ? {
          a: String(start),
          mid: String(YEARS[YEARS.length - r.n + Math.floor(r.n / 2)]),
          end: String(YEARS[YEARS.length - 1]),
        }
      : { a: "지금", mid: `${Math.round(r.n / 2)}년`, end: `${r.n}년` };

  return (
    <div className={s.wrap}>
      <div className={s.brandRow}>
        <span className={s.brand}>dbvsdc</span>
        <span className={s.brandSub}>DB vs DC · 백테스트 · 세금까지</span>
      </div>
      <p className={s.lede}>
        안전자산 30% + 위험자산 70%(DC 법정 한도)로, 과거 실제 수익률을 되짚거나
        미래를 예측해 비교합니다.
      </p>

      <div className={s.modeRow}>
        <button
          className={`${s.btn} ${s.modeBtn} ${mode === "back" ? s.btnOn : ""}`}
          onClick={() => setMode("back")}
        >
          과거 백테스트
        </button>
        <button
          className={`${s.btn} ${s.modeBtn} ${mode === "fwd" ? s.btnOn : ""}`}
          onClick={() => setMode("fwd")}
        >
          미래 예측
        </button>
      </div>

      <div className={s.card}>
        <div className={s.cardLabel}>위험자산 70% — 담을 지수</div>
        <div className={s.chips}>
          {INDEX_KEYS.map((k) => (
            <button
              key={k}
              className={`${s.btn} ${indices.includes(k) ? s.btnOn : ""}`}
              onClick={() => toggleIndex(k)}
            >
              {INDEX_LABELS[k]}
            </button>
          ))}
        </div>

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
        <div className={s.row} style={{ marginBottom: "1.25rem" }}>
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
        <div className={s.note}>
          안전자산 30%: 연 <b>3.0%</b> 고정 (2026년 원리금보장형 기준 가정)
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
        viewBox={`0 0 ${W} ${H}`}
        className={s.chart}
        role="img"
        aria-label="연도별 DB와 DC 적립금 추이"
      >
        <line
          x1={PAD.l}
          y1={PAD.t + PLOT_H}
          x2={W - PAD.r}
          y2={PAD.t + PLOT_H}
          stroke="var(--border)"
          strokeWidth={1}
        />
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
        <text x={PAD.l} y={H - 14} fontSize={11} fill="var(--text-tertiary)" textAnchor="start">
          {xLabels.a}
        </text>
        <text x={W / 2} y={H - 14} fontSize={11} fill="var(--text-tertiary)" textAnchor="middle">
          {xLabels.mid}
        </text>
        <text x={W - PAD.r} y={H - 14} fontSize={11} fill="var(--text-tertiary)" textAnchor="end">
          {xLabels.end}
        </text>
        <text x={PAD.l} y={24} fontSize={11} fill="var(--text-tertiary)" textAnchor="start">
          {formatMan(maxY / 1.08)}
        </text>
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
            지수 수익률은 <b>예시값</b>이며, 실서비스에서는 각 지수를 추종하는 국내 상장
            ETF 실데이터로 대체됩니다.
          </li>
          <li>
            해외 지수는 <b>환율(원/달러) 변동</b>이 수익률에 반영되어야 하나 현재
            미반영입니다.
          </li>
          <li>매년 30/70 리밸런싱, 운용보수·거래비용은 미반영 가정입니다.</li>
          <li>
            세금은 현행 퇴직소득세 산식 기반 <b>추정</b>이며, 실제 세액은
            공제·수령방식·개인별 조건에 따라 달라집니다.
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
