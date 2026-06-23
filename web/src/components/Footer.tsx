import s from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={s.foot} id="devlog">
      <div className={s.inner}>
        <div className={s.left}>
          <div className={s.brandRow}>
            <span className={s.word}>
              DB <span className={s.vs}>vs</span> <span className={s.dc}>DC</span>
            </span>
          </div>
          <p className={s.note}>
            퇴직연금 DB vs DC 비교 시뮬레이터. 정보 제공용이며 투자 권유·자문이 아닙니다.
          </p>
        </div>
        <div className={s.cols}>
          <a href="#intro">소개</a>
          <a href="#simulator">시뮬레이터</a>
          <a
            href="https://github.com/ppupy1209/dbvsdc"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
      <div className={s.copy}>© 2026 dbvsdc</div>
    </footer>
  );
}
