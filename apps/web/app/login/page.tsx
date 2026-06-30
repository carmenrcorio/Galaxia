import { LoginForm } from "../../components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const resolved = await searchParams;
  const nextPath = resolved.next ?? "/account";
  return (
    <main className="container auth-page">
      <h1 className="auth-title">Sign in to Galaxia</h1>
      <p className="muted auth-copy">Use the same email + password account as mobile. Your account works across web and app.</p>
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
