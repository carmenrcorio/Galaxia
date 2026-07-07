import { LoginForm } from "../../components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const resolved = await searchParams;
  const nextPath = resolved.next ?? "/app";
  return (
    <main className="container" style={{ padding: "72px 0", maxWidth: 820 }}>
      <h1 className="auth-title">Sign in to Galaxia</h1>
      <p className="muted">Use the same email + password account as mobile.</p>
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
