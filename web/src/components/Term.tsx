"use client";

import type { ReactNode } from "react";
import s from "./Term.module.css";

// Inline glossary term: an accent dotted underline + a small ⓘ so it clearly
// reads as "hover me", and a tooltip that opens on hover (and on keyboard focus
// via :focus-visible — a mouse click does NOT pin it open). Keyboard-reachable.
export default function Term({ children, tip }: { children: ReactNode; tip: string }) {
  const label = typeof children === "string" ? `${children}: ${tip}` : tip;
  return (
    <span className={s.term} tabIndex={0} role="note" aria-label={label}>
      <span className={s.label}>{children}</span>
      <span className={s.hint} aria-hidden="true">
        ⓘ
      </span>
      <span className={s.bubble} role="tooltip">
        {tip}
      </span>
    </span>
  );
}
