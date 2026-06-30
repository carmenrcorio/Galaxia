export default function PrivacyPage() {
  return (
    <main className="container" style={{ padding: "56px 0", maxWidth: 860 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42 }}>Privacy Policy</h1>
      <p style={{ color: "var(--mist)" }}>
        The people in Galaxia are the ones you love most. We treat that with care.
      </p>
      <ul style={{ color: "var(--cream)", lineHeight: 1.8 }}>
        <li>Your private notes are owner-only, never shown to the person they are about.</li>
        <li>Shared-mode Vela conversations never include private notes.</li>
        <li>No two-way AI/shared chat where a participant is a minor.</li>
        <li>Charts are computed from astronomical data; AI interprets computed facts.</li>
        <li>Data export and deletion requests are available at /account/data.</li>
      </ul>
    </main>
  );
}
