import type { Metadata } from "next";
import { SignupForm } from "../../components/signup-form";

const TITLE = "Start Free — Galaxia";
const DESCRIPTION =
  "Create your Galaxia account. No credit card required — enter your birth details and see your real natal chart in under a minute.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/signup",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  }
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ email?: string; next?: string }> }) {
  const resolved = await searchParams;
  const initialEmail = resolved.email ?? "";
  return (
    <main className="container" style={{ paddingTop: 72, paddingBottom: 72, maxWidth: 820 }}>
      <h1 className="auth-title">Create your Galaxia account</h1>
      <p className="muted">
        Sign up once and use your account on web today. When mobile links are live, this same
        account carries over.
      </p>
      <SignupForm initialEmail={initialEmail} nextPath={resolved.next} />
    </main>
  );
}
