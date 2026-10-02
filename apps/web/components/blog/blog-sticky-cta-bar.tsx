"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackBlogClick } from "./blog-analytics";
import { BLOG_ANALYTICS } from "../../lib/blog-index";
import type { BlogIntroCta } from "../../lib/blog-cta";

const DISMISS_KEY = "galaxia_blog_sticky_dismissed";
const SCROLL_SHOW_FRACTION = 0.4;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isTargetVisible(selector: string): boolean {
  const node = document.querySelector(selector);
  if (!node) return false;
  const rect = node.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewHeight * 0.85 && rect.bottom > viewHeight * 0.15;
}

/** Sticky mobile CTA; same offer as the intro card. */
export function BlogStickyCtaBar({ slug, cta }: { slug: string; cta: BlogIntroCta }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
      return;
    }

    const onScroll = () => {
      if (dismissed) return;
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      const scrolled = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      const pastThreshold = scrolled >= SCROLL_SHOW_FRACTION;
      const blocked =
        isTargetVisible("[data-blog-newsletter]") ||
        isTargetVisible(".article-closing-cta") ||
        isTargetVisible(".article-chart-reading");
      setVisible(pastThreshold && !blocked);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [dismissed]);

  if (dismissed || !visible) return null;

  const motionClass = prefersReducedMotion() ? "article-sticky-cta--static" : "article-sticky-cta--animate";

  return (
    <div className={`article-sticky-cta ${motionClass}`} role="region" aria-label="Quick next step">
      <Link
        href={cta.href as never}
        className="btn-primary article-sticky-cta-link"
        onClick={() => trackBlogClick(BLOG_ANALYTICS.cta, slug, "intro")}
      >
        {cta.button}
      </Link>
      <button
        type="button"
        className="article-sticky-cta-dismiss"
        aria-label="Dismiss"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
      >
        ×
      </button>
    </div>
  );
}
