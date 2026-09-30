"use client";

import { track } from "@vercel/analytics/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BLOG_ANALYTICS, type BlogAnalyticsEvent, type BlogCtaKind } from "../../lib/blog-index";

/**
 * Click events already covered by Vercel Web Analytics. Properties are the
 * post slug and, for a CTA, which CTA. Nothing else is sent.
 */
export function trackBlogClick(event: BlogAnalyticsEvent, slug: string, cta?: BlogCtaKind): void {
  if (!slug) return;
  if (cta) {
    track(event, { slug, cta });
    return;
  }
  track(event, { slug });
}

export function BlogTrackedLink({
  href,
  className,
  event,
  slug,
  children
}: {
  href: string;
  className: string;
  event: BlogAnalyticsEvent;
  slug: string;
  children: ReactNode;
}) {
  return (
    <Link href={href as never} className={className} onClick={() => trackBlogClick(event, slug)}>
      {children}
    </Link>
  );
}

export function BlogCtaLink({
  href,
  slug,
  cta,
  className,
  children
}: {
  href: string;
  slug: string;
  cta: BlogCtaKind;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={className} onClick={() => trackBlogClick(BLOG_ANALYTICS.cta, slug, cta)}>
      {children}
    </a>
  );
}
