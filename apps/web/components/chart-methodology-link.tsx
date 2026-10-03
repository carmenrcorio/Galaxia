import Link from "next/link";
import {
  METHODOLOGY_CHART_LINK_LABEL,
  METHODOLOGY_PATH,
} from "../lib/methodology-copy";

/** Single methodology link for a whole chart view (wheel + placements). */
export function ChartMethodologyLink({ className }: { className?: string }) {
  return (
    <Link
      href={METHODOLOGY_PATH as never}
      className={["chart-methodology-link", className].filter(Boolean).join(" ")}
    >
      {METHODOLOGY_CHART_LINK_LABEL}
    </Link>
  );
}
