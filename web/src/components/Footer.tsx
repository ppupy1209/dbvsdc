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
            총수익 실측, NASDAQ 100·Dow Jones 30은 가격수익률 + 평균 배당, KOSPI 200은
            가격수익률 + 평균 배당 근사, KOSDAQ 150은 KODEX KOSDAQ 150 ETF 조정종가
            프록시입니다.
          </li>
          <li>
            DC 위험자산(70%)에는 지수별 대표 ETF의 <b>실부담비용</b>(보수+매매·중개비 등,
            연 0.14~0.32%)을 차감해 반영합니다. 대표값이며 상품에 따라 달라집니다.
          </li>
          <li>
            해외 지수는 <b>USD 기준</b>입니다. 백테스트에서 <b>‘원화 환산’</b>을 켜면 과거
            원/달러 변동(<b>World Bank 연평균 환율</b>, PA.NUS.FCRF)을 반영합니다. 연평균
            기준이라 연말 급변동은 일부만 반영되며, 환헤지형 상품은 결과가 다릅니다.
          </li>
          <li>
            안전자산 30% 금리는 백테스트에서 <b>연도별 정기예금 금리</b>(World Bank
            FR.INR.DPST 연평균)를, 미래 시뮬레이션에서는 연 3.0%를 가정합니다. 1995·2025는
            잠정치입니다.
          </li>
          <li>세금은 현행 퇴직소득세 산식 기반 <b>추정</b>입니다.</li>
          <li>
            DC 회사부담금과 운용수익 전액을 퇴직소득으로 과세하되, 개인 추가납입(IRP
            세액공제분)은 미반영입니다.
          </li>
          <li>
            IRP 연금수령 세금은 15년 균등수령을 가정합니다. 10년차까지 이연퇴직소득세의 70%,
            11년차부터 60%를 반영합니다.
          </li>
          <li>
            DB는 <b>퇴직 직전 평균임금</b> 기준이라 임금피크·강등 등 말년 급여 삭감에
            취약합니다.
          </li>
          <li>미래 시뮬레이션은 평균(CAGR) 시나리오와 과거 최악 동일기간 시나리오를 나누어 표시합니다.</li>
        </ul>
      </div>
      <div className={s.copy}>© 2026 dbvsdc</div>
    </footer>
  );
}
