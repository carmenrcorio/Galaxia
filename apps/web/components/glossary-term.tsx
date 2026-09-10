"use client";

/**
 * First reusable glossary popover in this codebase. No tooltip library.
 * Keyboard-focusable trigger, Escape dismisses, aria-describedby wired so
 * the meaning is announced to screen readers on focus.
 */

import { useEffect, useId, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { planetMeaning, signMeaning } from "../lib/astro-glossary";

function capitalizeWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

interface GlossaryTermProps {
  term: string;
  meaning: string;
  children?: ReactNode;
}

export function GlossaryTerm({ term, meaning, children }: GlossaryTermProps) {
  const reactId = useId();
  const descId = `glossary-desc-${reactId.replace(/:/g, "")}`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const skipFocusOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      skipFocusOpen.current = true;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    setOpen((value) => !value);
  }

  return (
    <span className="glossary-term" ref={rootRef}>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        className="glossary-term__trigger"
        aria-expanded={open}
        aria-describedby={descId}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            toggle(event);
            return;
          }
          if (event.key === "Escape") {
            event.stopPropagation();
            skipFocusOpen.current = true;
            setOpen(false);
          }
        }}
        onFocus={() => {
          if (skipFocusOpen.current) {
            skipFocusOpen.current = false;
            return;
          }
          setOpen(true);
        }}
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
      >
        {children ?? term}
      </span>
      <span
        id={descId}
        role="tooltip"
        className={`glossary-term__popover${open ? " is-open" : ""}`}
      >
        {meaning}
      </span>
    </span>
  );
}

/** Planet name with beginner glossary popover. Renders plain text if unknown. */
export function GlossaryPlanet({ planet, children }: { planet: string; children?: ReactNode }) {
  const meaning = planetMeaning(planet);
  const label = capitalizeWord(planet);
  if (!meaning) return <>{children ?? label}</>;
  return (
    <GlossaryTerm term={label} meaning={meaning}>
      {children ?? label}
    </GlossaryTerm>
  );
}

/** Sign name with beginner glossary popover. Renders plain text if unknown. */
export function GlossarySign({ sign, children }: { sign: string; children?: ReactNode }) {
  const meaning = signMeaning(sign);
  if (!meaning) return <>{children ?? sign}</>;
  return (
    <GlossaryTerm term={sign} meaning={meaning}>
      {children ?? sign}
    </GlossaryTerm>
  );
}
