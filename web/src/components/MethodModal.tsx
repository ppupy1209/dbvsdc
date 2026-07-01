"use client";

import { useEffect, useRef } from "react";
import { DataSource } from "@/lib/api";
import { FutureScenario, Mode, RetireTaxBreakdown, formatMan } from "@/lib/calc";
import { IndexKey } from "@/lib/indexData";
import s from "./MethodModal.module.css";

// 현재 결과(입력값·수익률·세금)를 그대로 반영해 "실제값 기반 계산식"을 보여주는 데이터.
export interface MethodData {
  mode: Mode;
  scenario: FutureScenario;
  krwActive: boolean;
  indexLabel: string;
  indexKey: IndexKey;
  source: DataSource;
  asOf?: string;
  basisText: string;
  dividendYield: number;
  etf: string;
  realCost: number; // fraction
  yearsStart: number;
  yearsEnd: number;
  indexCagr: number; // fraction
  salary: number; // man-won
  raise: number; // percent
  n: number;
  dep: number; // fraction
  monthlyFirst: number; // 첫해 회사부담금 (man-won)
  lastMonthlyWage: number; // 마지막 해 월급 (man-won)
  dbFinal: number;
  dcFinal: number;
  portfolioCagr: number; // fraction
  breakeven: number | null; // fraction
  dbLump: RetireTaxBreakdown;
  dcLump: RetireTaxBreakdown;
  dbIrpTax: number;
  dcIrpTax: number;
  irpPayoutYears: number;
}

const pct = (f: number, d = 1) => `${(f * 100).toFixed(d)}%`;
const man = (v: number) => formatMan(v);

export default function MethodModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: MethodData;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // 배경 스크롤 잠금
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const d = data;
  const dataBasis =
    d.source === "live" ? `실데이터${d.asOf ? " · " + d.asOf : ""}` : "큐레이션한 지수 연간 수익률";
  const dcMethodNote =
    d.mode === "back"
      ? `과거 ${d.yearsStart}~${d.yearsEnd} 실제 연도별 수익률로 계산했습니다.`
      : d.scenario === "average"
        ? "지수의 장기 평균 수익률을 매년 반복 적용했습니다."
        : `과거 최악 ${d.n}년 구간의 실제 등락을 재생했습니다.`;

  return (
    <div
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="method-title"
      onClick={onClose}
    >
      <div className={s.panel} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <h3 id="method-title" className={s.title}>
            이 결과는 어떻게 계산되나요?
          </h3>
          <button ref={closeRef} type="button" className={s.close} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className={s.body}>
          <p className={s.intro}>
            아래는 지금 화면의 입력값(연봉 {d.salary.toLocaleString()}만원 · 상승률 {d.raise}% · {d.n}년 ·{" "}
            {d.indexLabel})으로 실제 계산한 값입니다.
          </p>

          <section className={s.section}>
            <h4 className={s.h}>1. 데이터 출처</h4>
            <ul className={s.list}>
              <li>
                <b>{d.indexLabel}</b> — {d.basisText}
                {d.dividendYield > 0 ? ` (배당 +${d.dividendYield}%p)` : ""}. 배당 재투자 포함 <b>총수익</b>{" "}
                기준.
              </li>
              <li>
                이 지수의 과거 연평균(CAGR): <b>연 {pct(d.indexCagr)}</b> ({d.yearsStart}~{d.yearsEnd},
                비용 차감 전).
              </li>
              <li>
                위험자산(70%) 비용: {d.etf} <b>실부담비용 연 {pct(d.realCost, 2)}</b>.
              </li>
              <li>
                안전자산(30%) 금리:{" "}
                {d.mode === "back"
                  ? "백테스트는 연도별 정기예금 금리(World Bank)"
                  : `연 ${pct(d.dep)} 가정`}
                .
              </li>
              {d.krwActive && (
                <li>
                  원화 환산 ON: 원/달러 <b>연평균 환율(World Bank)</b> 변동을 반영(추정치).
                </li>
              )}
            </ul>
            <p className={s.note}>현재 데이터: {dataBasis}.</p>
          </section>

          <section className={s.section}>
            <h4 className={s.h}>2. 계산 방식 (실제값)</h4>
            <ul className={s.list}>
              <li>
                매년 회사부담금 = <b>연봉 ÷ 12</b> = {d.salary.toLocaleString()} ÷ 12 ≈{" "}
                <b>{man(d.monthlyFirst)}</b> (첫해). 이후 매년 {d.raise}%씩 늘어납니다.
              </li>
              <li>
                <b>DB 최종</b> = 마지막 해 월급 × 근속연수 = {man(d.lastMonthlyWage)} × {d.n} ={" "}
                <b>{man(d.dbFinal)}</b>.
              </li>
              <li>
                <b>DC 최종</b> = 안전 30%(연 {pct(d.dep)}) + 위험 70%(지수 − 비용)를 섞어 <b>블렌드
                연평균 {pct(d.portfolioCagr)}</b>로 {d.n}년 복리 → <b>{man(d.dcFinal)}</b>.
                <span className={s.sub}>{dcMethodNote}</span>
              </li>
              {d.breakeven !== null && (
                <li>
                  <b>손익분기 수익률</b> = 지수가 매년 <b>{pct(d.breakeven)}</b>면 DC 최종 = DB. 과거
                  연평균({pct(d.indexCagr)})은 이보다{" "}
                  {d.indexCagr > d.breakeven ? "높아 과거 기준 DC 우위" : "낮아 과거 기준 DB 우위"}.
                </li>
              )}
            </ul>
          </section>

          <section className={s.section}>
            <h4 className={s.h}>3. 세금 계산 (실제값)</h4>
            <p className={s.p}>
              DC 일시금 {man(d.dcFinal)}에 대한 <b>퇴직소득세</b> 계산 단계:
            </p>
            <ul className={s.list}>
              <li>
                근속연수공제({d.n}년): <b>−{man(d.dcLump.serviceDeduct)}</b>
              </li>
              <li>
                환산급여 = ({man(d.dcFinal)} − 공제) ÷ {d.n} × 12 = <b>{man(d.dcLump.hwan)}</b>
              </li>
              <li>
                환산급여공제: <b>−{man(d.dcLump.hwanDeduct)}</b> → 과세표준 <b>{man(d.dcLump.base)}</b>
              </li>
              <li>
                산출세액(국세) {man(d.dcLump.nationalTax)} + 지방세 10% {man(d.dcLump.localTax)} ={" "}
                <b>DC 일시금 세금 {man(d.dcLump.total)}</b> (세후 {man(d.dcFinal - d.dcLump.total)})
              </li>
              <li>
                <b>IRP 연금수령</b>({d.irpPayoutYears}년 균등): 위 세금을 10년 이내 30%·11년부터 40%
                덜 내 <b>DC 세금 {man(d.dcIrpTax)}</b> (세후 {man(d.dcFinal - d.dcIrpTax)})
              </li>
            </ul>
            <p className={s.note}>
              DB도 같은 방식: 일시금 세금 {man(d.dbLump.total)}(세후 {man(d.dbFinal - d.dbLump.total)}) ·
              IRP {man(d.dbIrpTax)}(세후 {man(d.dbFinal - d.dbIrpTax)}).
            </p>
          </section>

          {d.mode === "fwd" && d.scenario === "worst" && (
            <section className={s.section}>
              <div className={s.callout}>
                <div className={s.calloutTitle}>Q. ‘최악’ 연평균이 ‘평균’보다 높을 수 있나요?</div>
                <p className={s.p}>
                  ‘최악’은 수익률이 가장 낮은 구간이 아니라 <b>최종 적립금이 가장 적은</b> 실제 구간이고,
                  실제 등락을 안전자산 30%가 완충해 ‘매년 같은 수익률’ 평균선보다 연평균이 높게 나올 수
                  있습니다. 데이터 기간이 짧은 지수는 특히 그렇습니다. 그래도 <b>가장 안 좋았던 실제 결과</b>
                  라는 뜻은 그대로입니다.
                </p>
              </div>
            </section>
          )}

          <p className={s.disclaimer}>
            본 계산은 정보 제공용 <b>추정</b>이며 투자 권유·세무 자문이 아닙니다. 과거 수익률은 미래를
            보장하지 않으며, 실제 세금·수익은 상품과 개인 상황에 따라 달라집니다.
          </p>
        </div>
      </div>
    </div>
  );
}
