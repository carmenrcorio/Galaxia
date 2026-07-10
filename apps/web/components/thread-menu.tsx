"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Three-dot menu on a saved Vela thread card. Resume reopens the thread;
 * Archive hides it from default lists (never deletes). Used on the home
 * "Resume a thread" chips and the person Record conversation entries.
 */
export function ThreadMenu({ threadId, onArchive }: { threadId: string; onArchive: (threadId: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        aria-label="Thread options"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mist2)", fontSize: "1.1rem", lineHeight: 1, padding: "0 4px" }}
      >
        ⋯
      </button>
      {open ? (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50, minWidth: 150,
          background: "linear-gradient(165deg,rgba(29,22,64,.98),rgba(10,7,23,.99))",
          border: "1px solid rgba(183,154,216,.22)", borderRadius: 10, padding: 4,
          boxShadow: "0 16px 40px -16px rgba(0,0,0,.9)"
        }}>
          <Link
            href={`/app/vela?threadId=${threadId}`}
            style={{ display: "block", padding: "8px 12px", borderRadius: 6, color: "var(--cream)", fontSize: ".82rem", textDecoration: "none" }}
          >
            Resume
          </Link>
          <button
            type="button"
            onClick={() => { onArchive(threadId); setOpen(false); }}
            style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: 6, color: "var(--mist)", fontSize: ".82rem" }}
          >
            Archive
          </button>
        </div>
      ) : null}
    </span>
  );
}
