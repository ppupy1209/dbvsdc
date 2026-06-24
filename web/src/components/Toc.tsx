"use client";

import { useEffect, useState } from "react";
import s from "./Toc.module.css";

const ITEMS = [
  { id: "intro", label: "소개" },
  { id: "simulator", label: "시뮬레이터" },
  { id: "irp", label: "IRP" },
];

export default function Toc() {
  const [active, setActive] = useState("intro");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    ITEMS.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <nav className={s.toc} aria-label="목차">
      <ul className={s.list}>
        {ITEMS.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`${s.item} ${active === it.id ? s.active : ""}`}
            >
              <span className={s.dot} aria-hidden="true" />
              <span className={s.label}>{it.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
