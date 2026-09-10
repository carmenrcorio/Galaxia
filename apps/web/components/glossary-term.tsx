"use client";

/**
 * First reusable glossary popover in this codebase. No tooltip library.
 * Keyboard-focusable trigger, Escape dismisses, aria-describedby wired so
 * the meaning is announced to screen readers on focus.
 *
 * The visible popover is portalled to document.body so overflow:auto
 * ancestors (the generational map scroller) cannot clip it.
 */

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
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

const POPOVER_WIDTH = 240;

function popoverStyle(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8));
  const spaceAbove = rect.top;
  if (spaceAbove > 96) {
    return { left, bottom: window.innerHeight - rect.top + 8, width: POPOVER_WIDTH };
  }
  return { left, top: rect.bottom + 8, width: POPOVER_WIDTH };
}

export function GlossaryTerm({ term, meaning, children }: GlossaryTermProps) {
  const reactId = useId();
  const descId = `glossary-desc-${reactId.replace(/:/g, "")}`;
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const skipFocusOpen = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    if (!open) return;
    function update() {
      const el = triggerRef.current;
      if (!el) return;
      setCoords(popoverStyle(el));
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
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
      <span id={descId} role="tooltip" className="glossary-term__sr">
        {meaning}
      </span>
      {mounted && open
        ? createPortal(
            <span className="glossary-term__floating" role="tooltip" aria-hidden="true" style={coords}>
              {meaning}
            </span>,
            document.body
          )
        : null}
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
