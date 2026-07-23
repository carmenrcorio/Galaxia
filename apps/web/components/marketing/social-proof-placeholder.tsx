/**
 * EMPTY ON PURPOSE. There are no testimonials, review counts, ratings, quotes,
 * or press mentions yet. Inventing any of those is fabrication. Fill this
 * section only with real, attributed voices when they exist.
 */
export function SocialProofPlaceholder() {
  return (
    <section
      className="container social-proof-placeholder"
      id="voices"
      aria-label="Placeholder for future testimonials"
    >
      <div className="social-proof-placeholder-inner reveal">
        {/* FOUNDER-REVIEW: authored - empty social-proof placeholder (do not invent). */}
        <span className="eyebrow">Coming later</span>
        <h2>What people say</h2>
        <p className="lede">
          Placeholder only. Real testimonials, quotes, ratings, and press will go here once they
          exist. Do not invent any.
        </p>
        <p className="social-proof-placeholder-mark" role="note">
          [SOCIAL PROOF PLACEHOLDER: empty until real voices are available]
        </p>
      </div>
    </section>
  );
}
