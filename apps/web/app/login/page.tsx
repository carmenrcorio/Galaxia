import { LoginClient } from "./login-client";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const resolved = await searchParams;
  const nextPath = resolved.next ?? "/account";
  return (
    <main className="container" style={{ padding: "72px 0" }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 48, marginBottom: 10 }}>Sign in to Galaxia</h1>
      <p style={{ color: "var(--mist)", maxWidth: 640 }}>
        Use the same account as mobile. Your constellation, entitlement, and shared-space invites are synced.
      </p>
      <LoginClient nextPath={nextPath} />
    </main>
  );
}
