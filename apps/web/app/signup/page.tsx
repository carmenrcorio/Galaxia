import type { Metadata } from "next";
import { SignupForm } from "../../components/signup-form";
import { authReturnPath } from "../../lib/safe-next-path";

const TITLE = "Start free with Galaxia";
const DESCRIPTION =
  "Create your Galaxia account with your name, email, and a password. No credit card. You add birth details after you sign in.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/signup" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/signup",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology to understand the people in your life" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology to understand the people in your life" }]
  }
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ email?: string; next?: string; redirect?: string }> }) {
  const resolved = await searchParams;
  const initialEmail = resolved.email ?? "";
  const nextPath = authReturnPath(resolved, "/welcome");
  return (
    <main className="container" style={{ paddingTop: 72, paddingBottom: 72, maxWidth: 820 }}>
      <h1 className="auth-title">Create your Galaxia account</h1>
      <p className="muted">
        Sign up once and use your account on web today. When mobile links are live, this same
        account carries over.
      </p>
      <SignupForm initialEmail={initialEmail} nextPath={nextPath} />
    </main>
  );
}
