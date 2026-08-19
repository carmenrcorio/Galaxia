/**
 * Remembrance. Sits between "The shift" and "why not a horoscope app": the loved
 * ones who came before are part of the same thesis (Galaxia is built for the people
 * in your life, including the ones who are gone). Mirrors the WhySection markup
 * pattern (section.shift.container + eyebrow + h2 + body) exactly, so it inherits
 * that section's mobile behavior with no new CSS.
 */
export function RemembranceSection() {
  return (
    <section className="shift container" id="remembrance">
      {/* FOUNDER-REVIEW: authored - remembrance section. */}
      <span className="eyebrow reveal">Remembrance</span>
      <h2 className="reveal">The loved ones you've lost are still part of your sky.</h2>
      <p className="body reveal">
        Galaxia helps you memorialize your loved ones who are gone. Add a parent, a
        grandparent, anyone who came before, and their real chart stays fully readable and
        added as a constellation or ancient light in your Galaxy. Understanding a relationship
        shouldn't have to end when someone passes away.
      </p>
    </section>
  );
}
