import type { Metadata } from "next";
import { LoginForm } from "../../components/login-form";

// FOUNDER-REVIEW: rewritten (no U+2014).
const TITLE = "Log in to Galaxia";
const DESCRIPTION = "Sign in to your Galaxia account.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/login",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  }
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const resolved = await searchParams;
  // Default to the /start resolver (smart routing: returning users → /app,
  // new users → /welcome). An explicit deep-link `next` is respected as-is.
  const nextPath = resolved.next ?? "/start";
  return (
    <main className="container" style={{ paddingTop: 72, paddingBottom: 72, maxWidth: 820 }}>
      <h1 className="auth-title">Sign in to Galaxia</h1>
      {/* FOUNDER-REVIEW: authored — matches the future-tense mobile framing on signup/account/download. */}
      <p className="muted">
        Use your Galaxia account on web today. When mobile links are live, this same account
        carries over.
      </p>
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
