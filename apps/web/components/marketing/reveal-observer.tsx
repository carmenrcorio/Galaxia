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
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
