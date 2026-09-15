import Link from "next/link";
import { MARKETING_NAV_SIGNUP } from "../../lib/nav-links";

/** Footer CTA — one final "Start 14 days free." No second email-capture box (the prior waitlist "Notify me" box here is gone; the product is live, not upcoming). */
export function CloseSection() {
  return (
    <section className="container close" id="join">
      {/* FOUNDER-REVIEW: homepage closing hero slogan. */}
      <h2 className="close-h reveal">Your Life. Your People. <em>Your Galaxy.</em></h2>
      <div className="close-cta reveal">
        <Link href={MARKETING_NAV_SIGNUP.href as never} className="btn-primary">{MARKETING_NAV_SIGNUP.label}</Link>
      </div>
    </section>
  );
}
