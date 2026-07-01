"use client";

import { useEffect, useRef } from "react";
import { DataSource } from "@/lib/api";
import s from "./MethodModal.module.css";

// 결과의 신뢰성을 뒷받침하는 상세 설명(데이터 출처·계산 방식·세금)을 담는 모달.
// 메인 화면을 차지하지 않도록 버튼으로 열고, 배경/ESC/닫기로 닫는다.
export default function MethodModal({
  open,
  onClose,
  source,
  asOf,
}: {
  open: boolean;
  onClose: () => void;
  source: DataSource;
  asOf?: string;
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

  const dataBasis =
    source === "live" ? `실데이터${asOf ? " · " + asOf : ""}` : "큐레이션한 지수 연간 수익률";

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
          <section className={s.section}>
            <h4 className={s.h}>1. 데이터 출처</h4>
            <p className={s.p}>
              지수 수익률은 모두 <b>배당 재투자 포함(총수익)</b> 기준입니다.
            </p>
            <ul className={s.list}>
              <li>
                <b>S&amp;P 500</b> — 연간 총수익 실측값.
              </li>
              <li>
                <b>NASDAQ 100 · Dow Jones 30</b> — 가격수익률 + 평균 배당수익률.
              </li>
              <li>
                <b>KOSPI 200 · KOSDAQ 150</b> — KRX 공식 가격지수(정보데이터시스템) + 평균 배당.
                (KRX의 배당포함 지수는 공개되지 않아 근사)
              </li>
              <li>
                <b>안전자산(30%) 금리</b> — 과거는 연도별 정기예금 금리(World Bank), 미래는 연 3.0% 가정.
              </li>
              <li>
                <b>환율</b> — 원/달러 연평균(World Bank). 해외 지수 ‘원화 환산’에 사용.
              </li>
            </ul>
            <p className={s.note}>현재 데이터: {dataBasis}.</p>
          </section>

          <section className={s.section}>
            <h4 className={s.h}>2. 계산 방식</h4>
            <ul className={s.list}>
              <li>
                <b>공통</b> — 매년 회사가 ‘연봉의 1/12(약 한 달치 월급)’를 적립합니다. 연봉은 입력한
                상승률로 매년 오릅니다.
              </li>
              <li>
                <b>DB형</b> — 퇴직 직전 평균임금 × 근속연수. 운용과 무관하게 회사가 보장합니다.
              </li>
              <li>
                <b>DC형</b> — 적립금을 안전자산 30% + 위험자산(선택 지수) 70%로 굴립니다. 위험자산에서는
                추종 ETF의 <b>실부담비용</b>(보수+매매·중개비, 연 0.14~0.32%)을 매년 빼고, 해마다
                수익률로 복리합니다.
              </li>
              <li>
                <b>손익분기 수익률</b> — 선택 지수가 매년 몇 %면 DC 최종액이 DB와 같아지는지를 계산합니다.
                이보다 높으면 DC, 낮으면 DB가 유리합니다.
              </li>
            </ul>
            <p className={s.p}>
              <b>미래 ‘평균’</b>은 지수의 장기 평균 수익률(기하평균)을 <b>매년 똑같이</b> 적용한 매끄러운
              가정선이고, <b>미래 ‘최악’</b>은 과거 실제 같은 길이 구간 중 <b>최종 적립금이 가장 적었던</b>{" "}
              실제 등락 경로입니다.
            </p>
            <div className={s.callout}>
              <div className={s.calloutTitle}>Q. 왜 ‘최악’이 ‘평균’보다 높게 보일 때가 있나요?</div>
              <p className={s.p}>
                ‘최악’은 <b>수익률이 가장 낮은</b> 구간이 아니라 <b>최종 적립금이 가장 적은</b> 구간입니다.
                또 실제 등락은 안전자산 30%가 완충해 줘서, ‘매년 같은 수익률’인 평균선보다 연평균 %가 더
                높게 나올 수 있습니다. 특히 데이터 기간이 짧은 지수(예: 코스닥150)는 ‘최악’ 구간이 사실상
                전체 기간과 같아져 이런 역전이 잘 생깁니다. 이때도 ‘최악’은 여전히 <b>가장 안 좋았던 실제
                결과</b>라는 뜻입니다.
              </p>
            </div>
          </section>

          <section className={s.section}>
            <h4 className={s.h}>3. 세금 계산</h4>
            <ul className={s.list}>
              <li>
                <b>퇴직소득세</b> — 근속연수공제 → (급여−공제)를 근속연수로 나눠 12를 곱한 ‘환산급여’ →
                환산급여공제 → 누진세율(6~45%) → 지방소득세 10% 가산. (2023년 개정 산식) 예: 퇴직금 1억 ·
                근속 10년 ≈ <b>약 426만원</b>.
              </li>
              <li>
                <b>IRP 연금수령</b> — 퇴직급여를 IRP로 옮겨 만 55세 이후 연금으로 받으면 위 퇴직소득세를{" "}
                <b>10년 이내 30%·11년부터 40%</b> 덜 냅니다. (여기선 15년 균등수령 가정)
              </li>
              <li>
                이 계산은 DC 회사부담금과 운용수익 <b>전액을 퇴직소득</b>으로 과세한다고 가정합니다.
              </li>
              <li>건강보험료 등 기타 부담금과 개인 추가납입(세액공제분)은 반영하지 않았습니다.</li>
            </ul>
          </section>

          <p className={s.disclaimer}>
            본 계산은 정보 제공용 <b>추정</b>이며 투자 권유·세무 자문이 아닙니다. 과거 수익률은 미래를
            보장하지 않으며, 실제 세금·수익은 상품과 개인 상황에 따라 달라집니다.
          </p>
        </div>
      </div>
    </div>
  );
}
