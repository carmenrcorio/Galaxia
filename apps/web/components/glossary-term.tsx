"use client";

/**
 * Reusable glossary popover. No tooltip library.
 * Keyboard-focusable trigger, Escape dismisses, aria-describedby wired so
 * the meaning is announced to screen readers on focus.
 *
 * Optional `glossarySlug` looks up GLOSSARY_TERMS, shows the first 1-2
 * sentences, and links to /glossary#{slug}. Hover opens on fine pointers
 * only; click/focus stay as they were.
 *
 * The visible popover is portaled to document.body so overflow:auto
 * ancestors (the generational map scroller) cannot clip it.
 */

import Link from "next/link";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { planetMeaning, signMeaning } from "../lib/astro-glossary";
import {
  GLOSSARY_SEE_FULL_DEFINITION,
  getGlossaryTerm,
  glossaryPreview,
} from "../lib/glossary-terms";

function capitalizeWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function finePointerHover(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

interface GlossaryTermProps {
  term?: string;
  meaning?: string;
  glossarySlug?: string;
  children?: ReactNode;
}

const POPOVER_WIDTH = 240;
const HOVER_OPEN_MS = 200;
const HOVER_CLOSE_MS = 300;

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

export function GlossaryTerm({ term, meaning, glossarySlug, children }: GlossaryTermProps) {
  const entry = glossarySlug ? getGlossaryTerm(glossarySlug) : undefined;
  const resolvedTerm = entry?.term ?? term ?? "";
  const resolvedMeaning = entry ? glossaryPreview(entry.definition) : meaning ?? "";
  const showLink = Boolean(glossarySlug && entry);

  const reactId = useId();
  const descId = `glossary-desc-${reactId.replace(/:/g, "")}`;
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const skipFocusOpen = useRef(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (openTimer.current) window.clearTimeout(openTimer.current);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
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

  function clearHoverTimers() {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleHoverOpen() {
    if (!finePointerHover()) return;
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (open) return;
    openTimer.current = window.setTimeout(() => setOpen(true), HOVER_OPEN_MS);
  }

  function scheduleHoverClose() {
    if (!finePointerHover()) return;
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  }

  function toggle(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    clearHoverTimers();
    setOpen((value) => !value);
  }

  if (glossarySlug && !entry) {
    return <>{children ?? resolvedTerm}</>;
  }

  if (!resolvedMeaning) {
    return <>{children ?? resolvedTerm}</>;
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
        onMouseEnter={scheduleHoverOpen}
        onMouseLeave={scheduleHoverClose}
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
          const next = event.relatedTarget as Node | null;
          if (rootRef.current?.contains(next) || popoverRef.current?.contains(next)) {
            return;
          }
          setOpen(false);
        }}
      >
        {children ?? resolvedTerm}
      </span>
      <span id={descId} role="tooltip" className="glossary-term__sr">
        {resolvedMeaning}
      </span>
      {mounted && open
        ? createPortal(
            <span
              ref={popoverRef}
              className="glossary-term__floating"
              role="tooltip"
              aria-hidden="true"
              style={coords}
              onMouseEnter={scheduleHoverOpen}
              onMouseLeave={scheduleHoverClose}
              onMouseDown={(event) => event.preventDefault()}
            >
              <span className="glossary-term__meaning">{resolvedMeaning}</span>
              {showLink && glossarySlug ? (
                <Link
                  href={`/glossary#${glossarySlug}`}
                  className="glossary-term__more"
                  onClick={(event) => event.stopPropagation()}
                >
                  {GLOSSARY_SEE_FULL_DEFINITION}
                </Link>
              ) : null}
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
