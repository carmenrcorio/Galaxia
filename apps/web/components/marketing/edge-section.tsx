import { InitialAvatar } from "../initial-avatar";

/**
 * The Edge — the generational layer, foregrounded as the differentiator
 * (reframed eyebrow/heading; content is the same real feature, just no
 * longer presented as one feature among several). Cohort mockup reuses the
 * exact .pl-row/.glyph-sq/.pl-body/.pl-desc classes the real Groups page
 * renders shared-sky rows with, and InitialAvatar for the cluster.
 */
export function EdgeSection() {
  return (
    <section className="container" id="generations">
      <div className="gen-grid">
        <div className="reveal">
          <span className="eyebrow">The edge</span>
          <h2 style={{ margin: "20px 0 22px" }}>The sky you were all born under.</h2>
          <p className="lede">
            The slow planets — the ones that shape a whole generation — drift so gently that everyone
            born within a few years shares them. It's why siblings feel cut from the same cloth, why a
            friend group just <em>gets</em> each other, and why the people who came before you saw the
            world the way they did. No other tool in this space reads your whole circle this way — what
            you share, and where you quietly diverge.
          </p>
          <div className="teal-callout" style={{ marginTop: 26 }}>
            <b style={{ color: "var(--teal)" }}>It needs only a birth year.</b>{" "}
            <span style={{ color: "var(--mist)", fontWeight: 300 }}>
              So the people you have the least on — a grandmother, an old friend, the ones who came
              before — still take their place in your sky.
            </span>
          </div>
        </div>
        <div className="cohort glass-card reveal">
          <div className="mock-sub mock-sub--eyebrow">Your group · the cousins</div>
          <div className="avatar-cluster" style={{ margin: "6px 0 18px" }}>
            <InitialAvatar name="Sam" size="sm" />
            <InitialAvatar name="Mia" size="sm" />
            <InitialAvatar name="Nia" size="sm" />
            <InitialAvatar name="Jo" size="sm" />
            <span className="avatar avatar-sm cluster-more">+2</span>
          </div>
          <span className="mock-label">Your shared sky</span>
          <div className="pl-row">
            <div className="glyph-sq" style={{ color: "var(--air)" }}>♅</div>
            <div><div className="pl-body">Uranus in Aquarius</div><div className="pl-desc">The reformers — wired to question the rules</div></div>
          </div>
          <div className="pl-row">
            <div className="glyph-sq" style={{ color: "var(--earth)" }}>♆</div>
            <div><div className="pl-body">Neptune in Capricorn</div><div className="pl-desc">A pragmatic, build-it kind of dreaming</div></div>
          </div>
          <div className="pl-row">
            <div className="glyph-sq" style={{ color: "var(--rose)" }}>♇</div>
            <div><div className="pl-body">Pluto in Scorpio</div><div className="pl-desc">Intensity, loyalty, all-or-nothing depth</div></div>
          </div>
          <div className="gen-split">
            <span className="mock-label" style={{ color: "var(--rose)" }}>Where you split · fault line</span>
            <p className="gen-split-note">The youngest carries Pluto in Sagittarius — more restless and free, less guarded than the rest of you.</p>
          </div>
          <p className="mock-example-tag">Illustrative example</p>
        </div>
      </div>
    </section>
  );
}
