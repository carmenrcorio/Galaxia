import { GALAXIA_HELP_EMAIL } from "@galaxia/core";

/**
 * Layer one press kit. Lead with outcome. Astrology is not the first word
 * in the boilerplate. Metadata on /press keeps the astrology keywords.
 * See design/galaxia-voice-layers.md.
 */
export function PressKitSection() {
  return (
    <section className="container why-not" id="press">
      {/* FOUNDER-REVIEW: layer-one press materials. */}
      <span className="eyebrow reveal">Boilerplate</span>
      <h2 className="reveal">One sentence.</h2>
      <p className="body reveal">
        Galaxia is relationship intelligence for the people already in your life: a private map
        of how you and your inner circle are built, and a guide for showing up with more care.
      </p>

      <h2 className="reveal" style={{ marginTop: 48 }}>The short version.</h2>
      <p className="body reveal">
        Most tools in this space talk to you about you, or help you swipe on strangers. Galaxia
        is built for the bonds that actually shape a day: partner, kids, parents, siblings,
        friends. Add someone once. See where you flow, where you catch, and what they need from
        you. Vela, the private guide, reads only the facts already on the chart. It never
        invents a placement, and it never tells you what will happen next. Guidance, not
        fortune telling.
      </p>

      <ul className="why-not-list">
        <li className="reveal">
          <strong>Founded.</strong>{" "}
          <span>Galaxia Mea LLC. Simpsonville, South Carolina. Press: {GALAXIA_HELP_EMAIL}.</span>
        </li>
        <li className="reveal">
          <strong>What it is not.</strong>{" "}
          <span>
            Not a daily horoscope. Not a dating app. Not a prediction engine. The sky describes
            how a person is built.
          </span>
        </li>
        <li className="reveal">
          <strong>How to try it.</strong>{" "}
          <span>
            galaxiamea.com. Web today. A 14-day trial, then one honest monthly plan. No credit
            card to start.
          </span>
        </li>
      </ul>
    </section>
  );
}
