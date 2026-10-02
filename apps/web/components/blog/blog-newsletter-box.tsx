"use client";

import { track } from "@vercel/analytics/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  GALAXIA_NOTES_BODY,
  GALAXIA_NOTES_EMAIL_PLACEHOLDER,
  GALAXIA_NOTES_FINE_PRINT_BEFORE,
  GALAXIA_NOTES_PRIVACY_LINK,
  GALAXIA_NOTES_SUBMIT,
  GALAXIA_NOTES_TITLE,
  NEWSLETTER_RETRY,
  NEWSLETTER_SUCCESS,
  newsletterErrorMessage
} from "../../lib/newsletter-signup";

const NEWSLETTER_SIGNUP_URL = "/api/chart-lead/newsletter-signup";

export function BlogNewsletterBox({ slug: _slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    track("newsletter_box_viewed", { source: "blog" });
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const response = await fetch(NEWSLETTER_SIGNUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        setError(newsletterErrorMessage(response.status));
        setStatus("idle");
        return;
      }
      track("newsletter_submitted", { source: "blog" });
      setStatus("done");
    } catch {
      setError(NEWSLETTER_RETRY);
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <section className="article-newsletter" data-blog-newsletter="" aria-live="polite">
        <p className="article-newsletter-confirm">{NEWSLETTER_SUCCESS}</p>
      </section>
    );
  }

  return (
    <section className="article-newsletter" data-blog-newsletter="" aria-labelledby="galaxia-notes-heading">
      <h2 id="galaxia-notes-heading" className="article-newsletter-title">
        {GALAXIA_NOTES_TITLE}
      </h2>
      <p className="article-newsletter-body">{GALAXIA_NOTES_BODY}</p>
      <form onSubmit={submit} className="article-newsletter-form">
        <input
          className="field"
          type="email"
          autoComplete="email"
          required
          placeholder={GALAXIA_NOTES_EMAIL_PLACEHOLDER}
          aria-label="Email for Galaxia Notes"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" className="pill-link pill-link--gold" disabled={status === "submitting"}>
          {GALAXIA_NOTES_SUBMIT}
        </button>
        <p className="article-newsletter-fine-print">
          {GALAXIA_NOTES_FINE_PRINT_BEFORE}
          <Link href="/privacy" className="article-newsletter-privacy">
            {GALAXIA_NOTES_PRIVACY_LINK}
          </Link>
        </p>
        {error ? <p className="article-newsletter-error">{error}</p> : null}
      </form>
    </section>
  );
}
