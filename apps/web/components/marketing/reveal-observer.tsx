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
    let io: IntersectionObserver | null = null;
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        return;
      }
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0, rootMargin: "0px 0px 25% 0px" }
      );
      document.querySelectorAll(".reveal").forEach((el) => io!.observe(el));
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(attach, { timeout: 2000 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
        io?.disconnect();
      };
    }
    const id = window.setTimeout(attach, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
      io?.disconnect();
    };
  }, []);

  return null;
}
