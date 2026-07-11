"use client";

import { useEffect, useRef, useState } from "react";

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
  // The scroll-reveal `in` class is normally added imperatively by the
  // page-wide RevealObserver (`classList.add("in")`). That works for static
  // sections, but these FAQ rows re-render on every open/close: React rebuilds
  // each row's `className` from the values below and, because it doesn't know
  // about the imperatively-added `in`, wipes it — reverting the row to
  // `.reveal`'s `opacity:0; translateY(26px)` and making the whole item vanish
  // on click. Owning reveal state in React keeps `in` on re-render.
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealedSet(new Set(FAQS.map((_, i) => i)));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setRevealedSet((prev) => {
              if (prev.has(idx)) return prev;
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    itemRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

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
            const inView = revealedSet.has(i);
            return (
              <div
                key={item.q}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                data-index={i}
                className={`faq-item reveal${inView ? " in" : ""}${open ? " open" : ""}`}
              >
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
