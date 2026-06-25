import s from "./Nav.module.css";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  return (
    <header className={s.bar}>
      <div className={s.inner}>
        <a className={s.brand} href="#top">
          <span className={s.word}>
            DB <span className={s.vs}>vs</span> <span className={s.dc}>DC</span>
          </span>
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
