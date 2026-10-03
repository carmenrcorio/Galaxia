"use client";

import { track } from "@vercel/analytics/react";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import type { WhyReadingInsightType } from "../lib/why-reading";
import {
  whyReadingGlossarySegments,
  type WhyReadingGlossarySegment,
} from "../lib/why-reading-glossary";
import { GlossaryPlanet, GlossarySign, GlossaryTerm } from "./glossary-term";

type Props = {
  /** Plain one-line derivation from computed facts only. Omit or empty to render nothing. */
  line: string | null | undefined;
  insightType: WhyReadingInsightType;
  className?: string;
};

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

function segmentNode(segment: WhyReadingGlossarySegment, line: string, key: number) {
  const phrase = line.slice(segment.start, segment.end);
  if (segment.slug) {
    return (
      <GlossaryTerm key={key} glossarySlug={segment.slug}>
        {phrase}
      </GlossaryTerm>
    );
  }
  if (segment.sign) {
    return (
      <GlossarySign key={key} sign={segment.sign}>
        {phrase}
      </GlossarySign>
    );
  }
  if (segment.planet) {
    return (
      <GlossaryPlanet key={key} planet={segment.planet}>
        {phrase}
      </GlossaryPlanet>
    );
  }
  return phrase;
}

function WhyReadingDerivationLine({
  line,
  insightType,
}: {
  line: string;
  insightType: WhyReadingInsightType;
}) {
  const segments = whyReadingGlossarySegments(line, insightType);
  if (segments.length === 0) {
    return <p className="why-reading-line">{line}</p>;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  segments.forEach((segment, index) => {
    if (segment.start > cursor) {
      parts.push(line.slice(cursor, segment.start));
    }
    parts.push(segmentNode(segment, line, index));
    cursor = segment.end;
  });
  if (cursor < line.length) {
    parts.push(line.slice(cursor));
  }

  return <p className="why-reading-line">{parts}</p>;
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
