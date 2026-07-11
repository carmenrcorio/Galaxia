import { InitialAvatar } from "../initial-avatar";

/**
 * The Vela example — this exact Q&A is specified content, not paraphrased.
 * Chosen deliberately to show Vela refusing to fabricate a placement it
 * can't support (no exact birth time → no claim about houses/Rising), then
 * giving real chart-grounded guidance from what IS known. That refusal is
 * the point, so it stays visible, not trimmed for brevity.
 *
 * Laid out as an asymmetric spotlight: intro copy on one side, a distinct
 * chat-window treatment on the other, so it reads as "a conversation" rather
 * than another data-screen feature card like the sections above.
 */
export function VelaExampleSection() {
  return (
    <section className="container" id="vela">
      <div className="vela-grid">
        <div className="vela-intro reveal">
          <span className="eyebrow">Your guide</span>
          <h2 className="vela-h2">Meet <em style={{ color: "var(--gold)" }}>Vela</em>.</h2>
          <p className="lede vela-lede">
            Most apps talk <em>at</em> you. Vela talks with you — an astrologer who already knows both
            charts and a coach who gives you something to actually do. It never invents a placement,
            never takes a side in a shared space, and never breaches your privacy.
          </p>
        </div>
        <div className="vela-card vela-chat glass-card reveal">
          <div className="vela-chat-bar">
            <InitialAvatar name="Vela" size="sm" />
            <span className="mock-label">An example of how Vela responds</span>
          </div>
          <div className="chat-thread" style={{ maxHeight: "none" }}>
            <div className="bubble bubble-user">
              My daughter shuts down every time I try to help with homework. What's going on?
            </div>
            <div className="bubble bubble-vela">
              <div className="bubble-sender">Vela</div>
              I don't have her exact birth time, so I won't claim anything about her houses or Rising —
              that'd be guessing. But from her Taurus Moon and Capricorn Sun, here's what I can say with
              confidence: she's wired to feel safe through steadiness and competence, not reassurance.
              When you jump in to help, a Capricorn Sun kid can read it as "you don't think I can do this
              myself." Try sitting near her without taking over — presence, not correction. Let her ask.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
