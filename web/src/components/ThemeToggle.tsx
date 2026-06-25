"use client";

import { useEffect, useState } from "react";
import s from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  // 초기값: 레이아웃의 인라인 스크립트가 이미 html[data-theme]를 세팅함 → 그걸 읽어 동기화
  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) || "light";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={s.toggle}
      data-theme={theme}
      onClick={toggle}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      aria-pressed={isDark}
      title={isDark ? "라이트 모드" : "다크 모드"}
    >
      {/* 슬라이딩 알약 (스르륵) */}
      <span className={s.thumb} aria-hidden="true" />
      {/* 해 */}
      <svg className={`${s.icon} ${s.sun}`} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="12" y1="2.5" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="21.5" />
          <line x1="2.5" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="21.5" y2="12" />
          <line x1="5.2" y1="5.2" x2="6.9" y2="6.9" />
          <line x1="17.1" y1="17.1" x2="18.8" y2="18.8" />
          <line x1="18.8" y1="5.2" x2="17.1" y2="6.9" />
          <line x1="6.9" y1="17.1" x2="5.2" y2="18.8" />
        </g>
      </svg>
      {/* 달 */}
      <svg className={`${s.icon} ${s.moon}`} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
