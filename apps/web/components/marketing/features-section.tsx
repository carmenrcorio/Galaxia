import { InitialAvatar } from "../initial-avatar";

/**
 * Core features — Add / Understand / Care. Renamed from See/Understand/Tend
 * per spec (the real first move for a new user is adding someone, not
 * "seeing" a chart that doesn't exist yet). Mockups reuse the SAME classes
 * the real app renders with (.sign-chip, .glyph-sq, .pl-body/.pl-desc,
 * .compat-word, .bubble, InitialAvatar) rather than marketing-only lookalikes,
 * so "consistent with the app UI" is literal, not just styled-to-resemble.
 * All names/values below are representative sample data, not real accounts.
 */
export function FeaturesSection() {
  return (
    <section className="container" id="how">
      <div className="how-head reveal">
        <h2>Add them. Understand them. Care for the bond.</h2>
        <p>Three moves, in order. Each one turns a chart into something you can actually do.</p>
      </div>
      <div className="steps">
        <div className="step reveal">
          <div className="step-text">
            <span className="step-num">01 — Add</span>
            <h3>Add anyone in your life.</h3>
            <p>
              A name and a birth date is enough to start — a full birth time and place unlocks the
              deepest detail. Add the people you have, at whatever precision you have.{" "}
              <em>Depth for the astrology lover; clarity for everyone else.</em>
            </p>
          </div>
          <div className="mock glass-card">
            <div className="mock-top">
              <InitialAvatar name="Rosa" />
              <div>
                <div className="mock-name">Rosa · your mom</div>
                <div className="mock-sub">Cancer Sun · Pisces Moon · Cancer Rising</div>
              </div>
            </div>
            <div className="mock-chips">
              <div className="sign-chip"><span className="sign-chip__glyph">♋</span><span className="sign-chip__label">Sun</span><span className="sign-chip__value">Cancer</span></div>
              <div className="sign-chip"><span className="sign-chip__glyph">☽</span><span className="sign-chip__label">Moon</span><span className="sign-chip__value">Pisces</span></div>
              <div className="sign-chip"><span className="sign-chip__glyph">♋</span><span className="sign-chip__label">Rising</span><span className="sign-chip__value">Cancer</span></div>
            </div>
            <div className="pl-row">
              <div className="glyph-sq" style={{ color: "var(--water)" }}>☽</div>
              <div><div className="pl-body">Moon in Pisces</div><div className="pl-desc">Emotional world · tender, absorbent</div></div>
            </div>
            <div className="pl-row">
              <div className="glyph-sq" style={{ color: "var(--air)" }}>♀</div>
              <div><div className="pl-body">Venus in Gemini</div><div className="pl-desc">How she loves · playful, talkative</div></div>
            </div>
            <p className="mock-example-tag">Illustrative example</p>
          </div>
        </div>

        <div className="step reveal">
          <div className="step-text">
            <span className="step-num">02 — Understand</span>
            <h3>Understand what's between you.</h3>
            <p>
              Compare any two people and see where you flow, where you catch, and exactly what each of
              you needs from the other — read differently whether you're partners, parent and child, or
              siblings. <em>Not a dating-app score. A real map.</em>
            </p>
          </div>
          <div className="mock glass-card">
            <span className="mock-label">Reading as · Partners</span>
            <div className="mock-top" style={{ marginBottom: 10 }}>
              <div className="avatar-cluster">
                <InitialAvatar name="You" />
                <InitialAvatar name="Daniel" />
              </div>
              <div style={{ marginLeft: 6 }}>
                <div className="mock-name" style={{ fontSize: ".98rem" }}>You &amp; Daniel</div>
                <div className="mock-sub">your dynamic</div>
              </div>
            </div>
            <div className="mock-compat">
              <div className="mock-compat-row">
                <span>Emotional ease</span>
                <span className="compat-word compat-high">Effortless</span>
              </div>
              <div className="mock-compat-row">
                <span>Communication</span>
                <span className="compat-word compat-mid">Workable</span>
              </div>
              <div className="mock-compat-row">
                <span>Warmth</span>
                <span className="compat-word compat-high">Easy &amp; warm</span>
              </div>
            </div>
            <p className="tip-block"><b>→ What Daniel needs from you</b><br />Lead with the feeling, not the verdict. Libra freezes when it feels judged, and opens when it feels invited.</p>
            <p className="mock-example-tag">Illustrative example</p>
          </div>
        </div>

        <div className="step reveal">
          <div className="step-text">
            <span className="step-num">03 — Care</span>
            <h3>Care for the bond.</h3>
            <p>
              Vela, your AI astrologer and relationship coach, helps you navigate the hard conversations
              — drawing on the chart <em>and</em> plain good sense. Ask privately, or open a consented
              shared space where Vela helps you both, without ever taking a side.
            </p>
          </div>
          <div className="mock glass-card">
            <span className="mock-label">Ask Vela · private · about Daniel</span>
            <div className="chat-thread" style={{ maxHeight: "none" }}>
              <div className="bubble bubble-user">Why do we keep having the same fight?</div>
              <div className="bubble bubble-vela">
                <div className="bubble-sender">Vela</div>
                Here's the root: you move fast and say it out loud; Daniel goes quiet to keep the peace.
                Winning isn't the goal — naming the pattern before you're in it is. Try: "we're doing the
                thing again, can we slow down?"
              </div>
            </div>
            <p className="mock-example-tag">Illustrative example</p>
          </div>
        </div>
      </div>
    </section>
  );
}
