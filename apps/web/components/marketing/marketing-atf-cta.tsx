import Link from "next/link";
import type { MarketingPageCta } from "../../lib/marketing-page-cta";

/** Single primary button below a standalone page intro. */
export function MarketingAtfCta({ cta }: { cta: MarketingPageCta }) {
  return (
    <div className="marketing-atf-cta container">
      <Link href={cta.href as never} className="btn-primary">
        {cta.label}
      </Link>
    </div>
  );
}
