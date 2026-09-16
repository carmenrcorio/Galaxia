import type { Metadata } from "next";
import { LoginForm } from "../../components/login-form";
import { authReturnPath } from "../../lib/safe-next-path";

const TITLE = "Sign in to Galaxia";
const DESCRIPTION = "Sign in to your Galaxia account.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/login" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/login",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology to understand the people in your life" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology to understand the people in your life" }]
  }
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; redirect?: string }> }) {
  const resolved = await searchParams;
  // Default to the /start resolver (smart routing: returning users → /app,
  // new users → /welcome). An explicit deep-link `next` (or `redirect`, the
  // connect-landing alias) is respected once it has passed authReturnPath.
  const nextPath = authReturnPath(resolved);
  return (
    <main className="container" style={{ paddingTop: 72, paddingBottom: 72, maxWidth: 820 }}>
      <h1 className="auth-title">Sign in to Galaxia</h1>
            <p className="muted">
        Use your Galaxia account on web today. When mobile links are live, this same account
        carries over.
      </p>
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
