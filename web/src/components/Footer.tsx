import s from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={s.foot} id="devlog">
      <div className={s.inner}>
        <div className={s.notesTitle}>유의사항</div>
        <ul className={s.notes}>
          <li>
            과거 수익률은 미래 수익을 보장하지 않으며, 정보 제공용일 뿐 투자 권유·자문이
            아닙니다.
          </li>
          <li>
            지수 수익률은 <b>배당 재투자 포함(총수익)</b> 기준입니다. S&amp;P500은 연간
            총수익 실측, 나스닥100·다우는 가격수익률 실측 + 평균 배당, 코스피·코스닥은
            가격수익률 + 평균 배당(임시)입니다. 출처: 미국 slickcharts, 한국 KRX(현지통화).
          </li>
          <li>
            해외 지수는 <b>USD 기준</b>이라 원화로 환산(환율)하면 결과가 달라집니다 —
            현재 환율 미반영.
          </li>
          <li>매년 30/70 리밸런싱, 운용보수·거래비용은 미반영 가정입니다.</li>
          <li>세금은 현행 퇴직소득세 산식 기반 <b>추정</b>입니다.</li>
          <li>
            DC 회사부담금과 운용수익 전액을 퇴직소득으로 과세하되, 개인 추가납입(IRP
            세액공제분)은 미반영입니다.
          </li>
          <li>
            IRP 절세는 연금 실제수령 <b>10년 이내(30% 감면)</b> 가정이며, 11년 이상은
            40% 감면입니다.
          </li>
          <li>
            DB는 <b>퇴직 직전 평균임금</b> 기준이라 임금피크·강등 등 말년 급여 삭감에
            취약합니다.
          </li>
          <li>미래 시뮬레이션은 과거 평균 수익률을 그대로 가정한 단순 투영입니다.</li>
        </ul>
      </div>
      <div className={s.copy}>© 2026 dbvsdc</div>
    </footer>
  );
}
