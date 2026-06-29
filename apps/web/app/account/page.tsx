import { tokens } from "@galaxia/ui";

export default function AccountPage() {
  return (
    <main style={{ padding: 32, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>Your Galaxia account</h1>
      <p style={{ color: tokens.colors.mist, lineHeight: 1.6 }}>
        This landing page is reserved for signed-in companion experiences: constellation overview, thread jump-ins,
        and subscription settings synced with mobile.
      </p>
    </main>
  );
}
