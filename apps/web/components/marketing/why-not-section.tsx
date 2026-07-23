/**
 * Short contrast vs generic horoscope apps. Names no competitors.
 * Relationship intelligence / real charts / people you keep.
 */
export function WhyNotSection() {
  return (
    <section className="container why-not" id="why-not">
      {/* FOUNDER-REVIEW: authored - why not a horoscope app. */}
      <span className="eyebrow reveal">Why not a horoscope app</span>
      <h2 className="reveal">Because your people are not a daily blurb.</h2>
      <p className="body reveal">
        Most astrology apps serve a sun-sign line for the day, or a one-off reading you forget.
        Galaxia is relationship intelligence for the real people in your life.
      </p>
      <ul className="why-not-list">
        <li className="reveal">
          <strong>Real people, not a generic day.</strong>{" "}
          <span>
            Built around the charts of your partner, kids, parents, and friends, not a daily blurb
            written for millions of strangers who share a sun sign.
          </span>
        </li>
        <li className="reveal">
          <strong>Real computed charts, not generated text.</strong>{" "}
          <span>
            Every placement comes from astronomical positions at birth. Guidance interprets what is
            on the chart. It does not invent what is not there.
          </span>
        </li>
        <li className="reveal">
          <strong>People you keep, not one-off readings.</strong>{" "}
          <span>
            Add someone once. Return when the conversation gets hard, the season shifts, or you
            simply want to show up with more care.
          </span>
        </li>
      </ul>
    </section>
  );
}
