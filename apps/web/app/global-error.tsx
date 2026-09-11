"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Root error boundary. Next.js requires this file to render its own
 * `<html>`/`<body>` because it replaces the root layout. Copy is generic on
 * purpose — never name the monitoring vendor in user-facing UI
 * (ENGINEERING.md §7).
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b0a12",
          color: "#ece8df",
          fontFamily: "Georgia, serif"
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem" }}>
          <p>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1rem",
              padding: "0.6rem 1.2rem",
              background: "transparent",
              color: "#ece8df",
              border: "1px solid rgba(230,174,108,0.4)",
              borderRadius: 8,
              cursor: "pointer"
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
