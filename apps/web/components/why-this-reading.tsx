"use client";

import { track } from "@vercel/analytics/react";
import Link from "next/link";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import type { WhyReadingInsightType } from "../lib/why-reading";
import { whyReadingGlossaryHighlight } from "../lib/why-reading-glossary";
import { GlossaryTerm } from "./glossary-term";

type Props = {
  /** Plain one-line derivation from computed facts only. Omit or empty to render nothing. */
  line: string | null | undefined;
  insightType: WhyReadingInsightType;
  className?: string;
};

const METHODOLOGY_HREF = "/methodology";

type WhyReadingGroupContextValue = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const WhyReadingGroupContext = createContext<WhyReadingGroupContextValue | null>(null);

/** Keeps at most one "Why this reading" panel open within the wrapped subtree. */
export function WhyReadingGroup({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <WhyReadingGroupContext.Provider value={{ openId, setOpenId }}>
      {children}
    </WhyReadingGroupContext.Provider>
  );
}

function WhyReadingDerivationLine({
  line,
  insightType,
}: {
  line: string;
  insightType: WhyReadingInsightType;
}) {
  const highlight = whyReadingGlossaryHighlight(line, insightType);
  if (!highlight) {
    return (
      <p className="why-reading-line">
        {line}{" "}
        <Link href={METHODOLOGY_HREF as never} className="why-reading-methodology">
          {/* FOUNDER-REVIEW: methodology link under opened derivation */}
          How we compute this
        </Link>
      </p>
    );
  }

  const { slug, phrase } = highlight;
  const idx = line.indexOf(phrase);
  if (idx === -1) {
    return (
      <p className="why-reading-line">
        {line}{" "}
        <GlossaryTerm glossarySlug={slug}>{phrase}</GlossaryTerm>
      </p>
    );
  }

  const before = line.slice(0, idx);
  const after = line.slice(idx + phrase.length);

  return (
    <p className="why-reading-line">
      {before}
      <GlossaryTerm glossarySlug={slug}>{phrase}</GlossaryTerm>
      {after}
    </p>
  );
}

/**
 * Collapsed derivation under a curated insight. Renders nothing when `line`
 * is missing so callers never show a placeholder.
 */
export function WhyThisReading({ line, insightType, className }: Props) {
  const trimmed = line?.trim();
  if (!trimmed) return null;

  const instanceId = useId();
  const panelId = useId();
  const group = useContext(WhyReadingGroupContext);
  const [localOpen, setLocalOpen] = useState(false);
  const open = group ? group.openId === instanceId : localOpen;

  function toggle() {
    const next = !open;
    if (group) {
      group.setOpenId(next ? instanceId : null);
    } else {
      setLocalOpen(next);
    }
    if (next) track("why_reading_opened", { insight_type: insightType });
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
          <WhyReadingDerivationLine line={trimmed} insightType={insightType} />
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
