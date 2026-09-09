"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The homepage's old anchor sections (#shift, #generations, #vela, #trust,
 * #pricing) each moved to a standalone page — see the removal notes in
 * app/page.tsx. A hash fragment is never sent in the HTTP request (the
 * browser keeps it entirely client-side), so a bookmarked or shared
 * `galaxiamea.com/#generations` link still resolves this same `/` route on
 * the server; only client JS can read `location.hash` and send the visitor
 * on to where that content actually lives now.
 */
const HASH_REDIRECTS: Record<string, string> = {
  "#shift": "/why-galaxia",
  "#generations": "/generations",
  "#vela": "/meet-vela",
  "#trust": "/security",
  "#pricing": "/pricing"
};

export function HashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const target = HASH_REDIRECTS[window.location.hash];
    if (target) router.replace(target);
  }, [router]);

  return null;
}
