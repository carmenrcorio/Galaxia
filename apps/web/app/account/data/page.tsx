import { requireUser } from "../../../lib/supabase/require-user";
import type { CSSProperties } from "react";

export default async function AccountDataPage() {
  const { user } = await requireUser("/account/data");

  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 56, maxWidth: 820 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42 }}>Your data</h1>
      <p style={{ color: "var(--mist)" }}>
        We keep your relationship graph private. Notes are owner-only and never included in shared-mode conversations.
      </p>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Data export</h2>
        <p style={{ color: "var(--mist)" }}>Email support to request an export until self-serve export UI is added.</p>
        <p style={{ color: "var(--gold-soft)" }}>support@galaxia.app · Account: {user.email}</p>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Delete account</h2>
        <p style={{ color: "var(--mist)" }}>
          Account deletion is irreversible. Contact support with your account email and we will process your request.
        </p>
      </section>
    </main>
  );
}

const card: CSSProperties = {
  marginTop: 16,
  border: "1px solid var(--line)",
  background: "var(--ink2)",
  borderRadius: 16,
  padding: 18
};
