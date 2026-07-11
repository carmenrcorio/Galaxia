/**
 * Trust grid — all three claims are literally true of the product today:
 * notes are owner-scoped and never shared (RLS); no two-way AI chat with a
 * minor is enforced server-side (the authoritative gate in
 * supabase/functions/vela-chat/index.ts, age-backstopped — see
 * packages/core isMinorForSafety); charts come from @galaxia/astro's
 * astronomical computation, never an AI-guessed placement (ENGINEERING.md §8/§12).
 */
export function TrustSection() {
  return (
    <section className="container" id="trust">
      <div className="trust-head reveal">
        <span className="eyebrow">Built on trust</span>
        <h2 style={{ margin: "18px 0 16px" }}>Private by design.</h2>
        <p className="lede">The people in here are the ones you love most. We treat that the way it deserves.</p>
      </div>
      <div className="trust-grid">
        <div className="tcard glass-card reveal">
          <div className="tcard-ico">✶</div>
          <h3>Your notes are yours</h3>
          <p>What you write about someone is private to you — always. It's never shared, and never fed into a conversation they can see.</p>
        </div>
        <div className="tcard glass-card reveal">
          <div className="tcard-ico">☾</div>
          <h3>Family-safe: no AI chat with kids</h3>
          <p>No two-way AI chat with children. Conversations about a child are private guidance for the parent — never content aimed at the kid.</p>
        </div>
        <div className="tcard glass-card reveal">
          <div className="tcard-ico">✷</div>
          <h3>Real astronomical data, never AI-guessed</h3>
          <p>Charts are computed from precise birth data — not guessed by an AI. The stars are the foundation; the AI only ever interprets what's real.</p>
        </div>
      </div>
    </section>
  );
}
