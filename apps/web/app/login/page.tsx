import { LoginForm } from "../../components/login-form";

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
