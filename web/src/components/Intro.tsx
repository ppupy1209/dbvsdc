import s from "./Intro.module.css";

export default function Intro() {
  return (
    <section className={s.wrap} id="intro">
      <div className={s.eyebrow}>퇴직연금 의사결정 도구</div>
      <h1 className={s.title}>
        DB로 둘까,
        <br />
        <span className={s.accent}>DC로 굴릴까.</span>
      </h1>
      <p className={s.sub}>
        내 연봉과 근속으로 두 제도를 나란히 시뮬레이션.
        <br />
        과거 수익률 백테스트와 세금까지, 30초면 답이 나옵니다.
      </p>

      <h2 className={s.compareTitle}>DB형과 DC형, 무엇이 다를까</h2>
      <div className={s.compare} id="compare">
        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={`${s.tag} ${s.tagDb}`}>DB형</span>
            <span className={s.tagSub}>확정급여형</span>
          </div>
          <p className={s.oneLine}>받을 금액이 미리 정해진 방식. 회사가 운용 책임을 진다.</p>
          <ul className={s.rowList}>
            <li>
              <span className={s.k}>금액</span>퇴직 직전 평균임금 × 근속연수
            </li>
            <li>
              <span className={s.k}>유리</span>임금상승률 높고 장기근속
            </li>
            <li>
              <span className={s.k}>약점</span>임금피크·강등 시 불리
            </li>
          </ul>
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={`${s.tag} ${s.tagDc}`}>DC형</span>
            <span className={s.tagSub}>확정기여형</span>
          </div>
          <p className={s.oneLine}>회사가 매년 한 달치 월급을 넣어주고, 내가 직접 굴리는 방식.</p>
          <ul className={s.rowList}>
            <li>
              <span className={s.k}>금액</span>매년 적립금 + 내 운용성과
            </li>
            <li>
              <span className={s.k}>유리</span>운용수익률 &gt; 임금상승률
            </li>
            <li>
              <span className={s.k}>약점</span>손실 가능, 위험자산 70% 한도
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
