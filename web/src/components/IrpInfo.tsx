import s from "./IrpInfo.module.css";

export default function IrpInfo() {
  return (
    <section className={s.wrap} id="irp">
      <div className={s.kicker}>
        <span className={s.kdot} aria-hidden="true" />
        IRP
      </div>
      <h2 className={s.title}>
        IRP란? <span className={s.titleSub}>개인형 퇴직연금</span>
      </h2>
      <p className={s.lede}>
        퇴직급여를 한 계좌에 모아 직접 운용하고, 연금으로 나눠 받을 수 있는 절세 계좌입니다.
        DB·DC에서 받은 퇴직급여도 IRP로 옮겨 굴릴 수 있습니다.
      </p>

      <div className={s.grid}>
        <div className={s.card}>
          <div className={s.cardTitle}>퇴직소득세 절감</div>
          <p className={s.cardBody}>
            일시금 대신 연금으로 받으면 퇴직소득세를 30%(수령 10년 이내)·40%(11년 이상)
            덜 냅니다.
          </p>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>과세이연</div>
          <p className={s.cardBody}>
            운용수익은 찾을 때까지 세금을 미뤄, 떼이지 않은 금액이 그대로 복리로 굴러갑니다.
          </p>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>세액공제</div>
          <p className={s.cardBody}>
            개인 추가납입 시 연 최대 900만원까지 세액공제(연금저축 합산), 공제율 13.2~16.5%.
          </p>
        </div>
      </div>

      <p className={s.caution}>
        만 55세 이후 연금수령이 원칙입니다. 중도해지·일시 인출 시 감면받은 세금을 다시 내고
        기타소득세(16.5%)가 부과될 수 있습니다. 본 내용은 정보 제공용이며 세무 자문이 아닙니다.
      </p>
    </section>
  );
}
