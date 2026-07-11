import { SignupForm } from "../../components/signup-form";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ email?: string; next?: string }> }) {
  const resolved = await searchParams;
  const initialEmail = resolved.email ?? "";
  return (
    <main className="container" style={{ paddingTop: 72, paddingBottom: 72, maxWidth: 820 }}>
      <h1 className="auth-title">Create your Galaxia account</h1>
      <p className="muted">Sign up once and use the same account on web and in the mobile app.</p>
      <SignupForm initialEmail={initialEmail} nextPath={resolved.next} />
    </main>
  );
}
