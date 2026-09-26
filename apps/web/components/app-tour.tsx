"use client";

import { APP_TOUR_COPY } from "@galaxia/core";
import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const TOUR_TARGET_SELECTORS = [
  ['[data-app-tour="add-person"]', '[data-app-tour="empty-constellation"]'],
  ['[data-app-tour="see-chart"]'],
  ['[data-app-tour="compare"]'],
] as const;

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
};

const VIEWPORT_MARGIN = 12;
const SPOTLIGHT_PAD = 8;
const CARD_WIDTH = 380;

function targetFor(stepIndex: number): HTMLElement | null {
  for (const selector of TOUR_TARGET_SELECTORS[stepIndex] ?? []) {
    const targets = document.querySelectorAll<HTMLElement>(selector);
    for (const target of targets) {
      const bounds = target.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) return target;
    }
  }
  return null;
}

function spotlightRect(target: HTMLElement | null): Rect {
  if (!target) {
    const width = Math.min(320, window.innerWidth - VIEWPORT_MARGIN * 2);
    const height = 120;
    const left = (window.innerWidth - width) / 2;
    const top = Math.max(88, window.innerHeight * 0.22);
    return { top, left, width, height, bottom: top + height };
  }
  const bounds = target.getBoundingClientRect();
  const left = Math.max(VIEWPORT_MARGIN, bounds.left - SPOTLIGHT_PAD);
  const top = Math.max(VIEWPORT_MARGIN, bounds.top - SPOTLIGHT_PAD);
  const width = Math.min(
    bounds.width + SPOTLIGHT_PAD * 2,
    window.innerWidth - left - VIEWPORT_MARGIN
  );
  const height = Math.min(
    bounds.height + SPOTLIGHT_PAD * 2,
    window.innerHeight - top - VIEWPORT_MARGIN
  );
  return { top, left, width, height, bottom: top + height };
}

function cardPosition(rect: Rect) {
  const width = Math.min(CARD_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
  const left = Math.min(
    Math.max(VIEWPORT_MARGIN, rect.left),
    window.innerWidth - width - VIEWPORT_MARGIN
  );
  const estimatedHeight = 300;
  const below = rect.bottom + 16;
  const top =
    below + estimatedHeight <= window.innerHeight - VIEWPORT_MARGIN
      ? below
      : Math.max(VIEWPORT_MARGIN, rect.top - estimatedHeight - 16);
  return { top, left, width };
}

export function AppTour({
  onSeen,
}: {
  onSeen: () => Promise<void>;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [settling, setSettling] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const step = APP_TOUR_COPY.steps[stepIndex];
  const finalStep = stepIndex === APP_TOUR_COPY.steps.length - 1;

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    return () => previousFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    const target = targetFor(stepIndex);
    target?.scrollIntoView({ block: "center", behavior: "smooth" });

    function update() {
      setRect(spotlightRect(targetFor(stepIndex)));
    }

    const timer = window.setTimeout(update, 180);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [stepIndex]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.querySelector<HTMLElement>("button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        void settle();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  async function settle() {
    if (settling) return;
    setSettling(true);
    setSaveError(false);
    try {
      await onSeen();
    } catch {
      setSaveError(true);
      setSettling(false);
    }
  }

  const card = useMemo(
    () => (rect ? cardPosition(rect) : null),
    [rect]
  );

  if (!rect || !card) return null;

  return createPortal(
    <div
      data-app-tour-overlay
      style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 16,
          border: "1px solid rgba(230,174,108,.8)",
          boxShadow:
            "0 0 0 9999px rgba(7,4,17,.82), 0 0 34px rgba(230,174,108,.24)",
          transition: "top 180ms ease, left 180ms ease, width 180ms ease, height 180ms ease",
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          position: "fixed",
          top: card.top,
          left: card.left,
          width: card.width,
          maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`,
          overflowY: "auto",
          pointerEvents: "auto",
          padding: 22,
          borderRadius: 18,
          border: "1px solid rgba(230,174,108,.3)",
          background: "rgba(25,18,45,.9)",
          backdropFilter: "blur(18px) saturate(1.15)",
          WebkitBackdropFilter: "blur(18px) saturate(1.15)",
          boxShadow: "0 24px 80px rgba(0,0,0,.45)",
          color: "var(--cream)",
        }}
      >
        <div
          aria-label={`Step ${stepIndex + 1} of ${APP_TOUR_COPY.steps.length}`}
          style={{ display: "flex", gap: 7, marginBottom: 18 }}
        >
          {APP_TOUR_COPY.steps.map((item, index) => (
            <span
              key={item.title}
              aria-hidden="true"
              style={{
                width: index === stepIndex ? 24 : 7,
                height: 7,
                borderRadius: 99,
                background:
                  index <= stepIndex ? "var(--gold)" : "rgba(183,154,216,.28)",
                transition: "width 180ms ease",
              }}
            />
          ))}
        </div>
        <h2
          id={titleId}
          style={{
            margin: "0 0 10px",
            fontFamily: "var(--serif)",
            fontSize: "1.45rem",
            fontWeight: 500,
          }}
        >
          {step.title}
        </h2>
        <p className="muted" style={{ margin: 0, lineHeight: 1.65 }}>
          {step.body}
        </p>
        {"secondary" in step && step.secondary ? (
          <p
            style={{
              margin: "14px 0 0",
              color: "var(--gold-soft)",
              lineHeight: 1.55,
              fontSize: ".92rem",
            }}
          >
            {step.secondary}
          </p>
        ) : null}
        {saveError ? (
          <p role="alert" style={{ color: "var(--rose)", margin: "14px 0 0" }}>
            {APP_TOUR_COPY.saveError}
          </p>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 20,
          }}
        >
          <button
            type="button"
            onClick={() => void settle()}
            disabled={settling}
            style={{
              border: 0,
              background: "transparent",
              color: "var(--mist)",
              textDecoration: "underline",
              cursor: "pointer",
              padding: "10px 0",
            }}
          >
            {APP_TOUR_COPY.skip}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={settling}
            onClick={() => {
              if (finalStep) {
                void settle();
              } else {
                setSaveError(false);
                setStepIndex((current) => current + 1);
              }
            }}
          >
            {finalStep ? APP_TOUR_COPY.finish : APP_TOUR_COPY.next}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
