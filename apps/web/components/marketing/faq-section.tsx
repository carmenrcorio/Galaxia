"use client";

import { useState } from "react";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need everyone's exact birth time?",
    a: (
      <>
        No — and that's the point. An exact time unlocks the deepest detail (houses, your rising sign,
        the precise Moon). But the signs, the compatibility reads, and the entire generational layer
        work from just a birth date — often just a <em>year</em>. Add the people you have, at whatever
        detail you have. The grandmother you only know a birth year for still belongs in your sky.
      </>
    ),
  },
  {
    q: "Is this actually private?",
    a: (
      <>
        Completely. The notes you keep about someone are yours alone — never shared, never shown to
        them, never fed into a conversation they can see. Anything about your children stays private
        to you. The people in here are the ones you love most; we treat that the way it deserves.
      </>
    ),
  },
  {
    q: "Is it real astrology, or AI making things up?",
    a: (
      <>
        Real. Every chart is computed from precise astronomical data — the actual positions of the
        planets at the moment someone was born. Vela, the guide, only ever interprets what's real. She
        never invents a placement.
      </>
    ),
  },
  {
    q: "Who is Galaxia for?",
    a: (
      <>
        Anyone who wants to understand the people already in their life — a partner, kids, parents,
        siblings, the friends who became family, the ones who came before. It's not for swiping on
        strangers, and it's not a daily horoscope. It's for tending the bonds that actually make a life.
      </>
    ),
  },
  {
    // Rewritten: the previous answer claimed "iOS and Android are in development" —
    // a native-app claim the product does not make. Galaxia is web-only; the honest
    // answer is simply that it's live now, with nothing to install.
    q: "When can I use it?",
    a: <>Available now on the web — no downloads, nothing to install. Sign up and you're in.</>,
  },
];

export function FaqSection() {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <section className="container" id="faq">
      <div className="faq-wrap">
        <div className="faq-head reveal">
          <span className="eyebrow" style={{ justifyContent: "center" }}>Questions</span>
          <h2 style={{ marginTop: 16 }}>Good to know.</h2>
        </div>
        <div>
          {FAQS.map((item, i) => {
            const open = openSet.has(i);
            return (
              <div key={item.q} className={`faq-item reveal${open ? " open" : ""}`}>
                <button type="button" className="faq-q" onClick={() => toggle(i)} aria-expanded={open}>
                  {item.q}
                  <span className="pm">+</span>
                </button>
                <div className="faq-a"><p>{item.a}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
