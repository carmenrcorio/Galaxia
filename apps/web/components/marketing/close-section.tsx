import Link from "next/link";

/** Footer CTA — one final "Start 14 days free." No second email-capture box (the prior waitlist "Notify me" box here is gone; the product is live, not upcoming). */
export function CloseSection() {
  return (
    <section className="container close" id="join">
      <h2 className="close-h reveal">The small, bright, <em>irreplaceable</em> galaxy that is yours.</h2>
      <div className="close-cta reveal">
        <Link href="/signup" className="btn-primary">Start 14 days free</Link>
      </div>
    </section>
  );
}
