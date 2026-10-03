"use client";

import { track } from "@vercel/analytics/react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import type { WhyReadingInsightType } from "../lib/why-reading";
import { whyReadingGlossaryHref } from "../lib/why-reading-glossary";

type Props = {
  /** Plain one-line derivation from computed facts only. Omit or empty to render nothing. */
  line: string | null | undefined;
  insightType: WhyReadingInsightType;
  className?: string;
};

const METHODOLOGY_HREF = "/methodology";

/**
 * Collapsed derivation under a curated insight. Renders nothing when `line`
 * is missing so callers never show a placeholder.
 */
export function WhyThisReading({ line, insightType, className }: Props) {
  const trimmed = line?.trim();
  if (!trimmed) return null;

  const [open, setOpen] = useState(false);
  const panelId = useId();
  const glossaryHref = whyReadingGlossaryHref(trimmed, insightType);
  const detailHref = glossaryHref ?? METHODOLOGY_HREF;

  function toggle() {
    setOpen((was) => {
      const next = !was;
      if (next) track("why_reading_opened", { insight_type: insightType });
      return next;
    });
  }

  return (
    <div className={className} style={{ marginTop: 8 }}>
      <button
        type="button"
        className="why-reading-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {/* FOUNDER-REVIEW: "Why this reading" disclosure control label */}
        Why this reading
      </button>
      {open ? (
        <div id={panelId} className="why-reading-panel">
          <p className="why-reading-line">{trimmed}</p>
          <Link href={detailHref as never} className="why-reading-methodology">
            {glossaryHref ? (
              /* FOUNDER-REVIEW: glossary link under opened derivation */
              <>What this term means</>
            ) : (
              /* FOUNDER-REVIEW: methodology link under opened derivation */
              <>How we compute this</>
            )}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/** Wraps insight body + optional derivation without changing layout when line is absent. */
export function InsightWithWhy({
  children,
  line,
  insightType,
}: {
  children: ReactNode;
  line: string | null | undefined;
  insightType: WhyReadingInsightType;
}) {
  return (
    <>
      {children}
      <WhyThisReading line={line} insightType={insightType} />
    </>
  );
}
