"use client";

/**
 * Page-wide scroll-reveal, ported from the raw HTML string's SCRIPT:
 * every `.reveal` element fades up once when it enters the viewport.
 * One observer for the whole page, same as before (was a single
 * `document.querySelectorAll('.reveal')` pass in the removed inline script).
 */

import { useEffect } from "react";

export function RevealObserver() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // globals.css already forces .reveal to opacity:1/transform:none under
      // prefers-reduced-motion, but skip the observer entirely too — no
      // motion to trigger, so there's nothing for it to do.
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }
      },
      // Fire well before the element scrolls into view (positive bottom margin
      // expands the root ~a quarter-viewport downward) so the short fade has
      // already finished by the time content reaches the reading zone — it's
      // never caught mid-fade at a hard-to-read opacity during a normal scroll.
      { threshold: 0, rootMargin: "0px 0px 25% 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
