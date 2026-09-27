"use client";

import type { BirthFormInput } from "@galaxia/astro";
import Link from "next/link";
import { useEffect } from "react";
import { ChartLeadCapture } from "../chart-lead-capture";
import {
  buildComparePrefillHref,
  stashComparePrefillName,
} from "../../lib/quick-chart";
import { useViewer } from "../../lib/use-viewer";

export function QuickChartResultActions({
  chartData,
  name,
  fullChartHref,
}: {
  chartData: BirthFormInput;
  name?: string;
  fullChartHref: string;
}) {
  const viewer = useViewer();

  useEffect(() => {
    stashComparePrefillName(name);
  }, [name]);

  return (
    <>
      <div
        className="quick-chart-entry-actions"
        style={{ display: "grid", gap: 10, justifyItems: "start" }}
      >
        {/* FOUNDER-REVIEW: "Now compare with someone in your life" */}
        <Link
          href={buildComparePrefillHref(chartData) as never}
          className="pill-link pill-link--teal"
          onClick={() => stashComparePrefillName(name)}
        >
          Now compare with someone in your life
        </Link>
        {/* FOUNDER-REVIEW: "See the full chart" */}
        <Link href={fullChartHref as never} className="pill-link">
          See the full chart
        </Link>
      </div>

      {!viewer.loading && !viewer.userId ? (
        <ChartLeadCapture chartData={chartData} />
      ) : null}
    </>
  );
}
