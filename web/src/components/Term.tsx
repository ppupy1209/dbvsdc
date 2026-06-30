"use client";

import type { ReactNode } from "react";
import s from "./Term.module.css";

// Inline glossary term: dotted underline + a tooltip that opens on hover and on
// tap/focus (so it works on mobile, where there is no hover). Keyboard-reachable.
export default function Term({ children, tip }: { children: ReactNode; tip: string }) {
  const label = typeof children === "string" ? `${children}: ${tip}` : tip;
  return (
    <span className={s.term} tabIndex={0} role="note" aria-label={label}>
      {children}
      <span className={s.bubble} role="tooltip">
        {tip}
      </span>
    </span>
  );
}
