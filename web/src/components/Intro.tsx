import s from "./Intro.module.css";

export default function Intro() {
  return (
    <section className={s.wrap}>
      <span className={s.eyebrow}>퇴직연금 비교 시뮬레이터</span>
      <h1 className={s.title}>
        DB로 둘까, <span className={s.titleAccent}>DC로 굴릴까?</span>
      </h1>
      <p className={s.sub}>
        퇴직연금 DB형과 DC형, 내 조건에서 어느 쪽이 유리한지 한눈에. 과거 실제 수익률로
        백테스트하고, 세금까지 따져 비교합니다.
      </p>
      <a className={s.cta} href="#simulator">
        지금 계산해보기
      </a>

      <div className={s.summaryLabel}>30초 요약</div>
      <div className={s.grid}>
        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={`${s.tag} ${s.tagDb}`}>DB형</span>
            <span className={s.tagSub}>확정급여형</span>
          </div>
          <p className={s.oneLine}>
            받을 금액이 미리 정해진 방식. 회사가 운용 책임을 진다.
          </p>
          <ul className={s.rowList}>
            <li>
              <span className={s.k}>금액</span>퇴직 직전 평균임금 × 근속연수
            </li>
            <li>
              <span className={s.k}>유리</span>임금상승률 높고 장기근속, 신경 쓰기 싫은 사람
            </li>
            <li>
              <span className={s.k}>약점</span>임금피크·강등 시 불리(최종임금 기준)
            </li>
          </ul>
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={`${s.tag} ${s.tagDc}`}>DC형</span>
            <span className={s.tagSub}>확정기여형</span>
          </div>
          <p className={s.oneLine}>
            회사가 매년 한 달치 월급을 넣어주고, 내가 직접 굴리는 방식.
          </p>
          <ul className={s.rowList}>
            <li>
              <span className={s.k}>금액</span>매년 적립금 + 내 운용성과
            </li>
            <li>
              <span className={s.k}>유리</span>운용수익률 &gt; 임금상승률, 직접 투자·이직 잦은 사람
            </li>
            <li>
              <span className={s.k}>약점</span>손실 가능, 위험자산 70% 한도
            </li>
          </ul>
        </div>
      </div>

      <p className={s.divider}>↓ 아래에서 내 조건으로 직접 비교해보세요</p>
    </section>
  );
}
