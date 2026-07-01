import s from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={s.foot} id="devlog">
      <div className={s.inner}>
        <div className={s.notesTitle}>유의사항</div>
        <ul className={s.notes}>
          <li>
            과거 수익률은 미래 수익을 보장하지 않습니다. 이 사이트는 <b>정보 제공용</b>일 뿐 투자
            권유·자문이 아닙니다.
          </li>
          <li>
            표시되는 금액과 세금은 현행 제도와 과거 데이터에 기반한 <b>추정</b>이며, 실제 상품·수수료와
            개인 상황(건강보험료 등)에 따라 달라집니다.
          </li>
          <li>
            지수·금리·환율의 <b>출처</b>, DB/DC <b>계산 방식</b>, <b>세금 산식</b>은 위 시뮬레이터의{" "}
            <b>‘계산 근거’</b>에서 자세히 확인할 수 있습니다.
          </li>
        </ul>
      </div>
      <div className={s.copy}>© 2026 dbvsdc</div>
    </footer>
  );
}
