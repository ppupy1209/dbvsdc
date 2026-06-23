import s from "./Nav.module.css";

export default function Nav() {
  return (
    <header className={s.bar}>
      <div className={s.inner}>
        <a className={s.brand} href="#top">
          <span className={s.word}>
            DB <span className={s.vs}>vs</span> <span className={s.dc}>DC</span>
          </span>
        </a>
        <nav className={s.links}>
          <a href="#intro">소개</a>
          <a href="#simulator">시뮬레이터</a>
          <a href="#devlog">개발기</a>
          <span className={s.beta}>beta</span>
        </nav>
      </div>
    </header>
  );
}
