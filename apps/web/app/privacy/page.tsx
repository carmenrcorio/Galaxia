export default function PrivacyPage() {
  return (
    <main className="container" style={{ padding: "56px 0", maxWidth: 860 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42 }}>Privacy Policy</h1>
      <p style={{ color: "var(--mist)" }}>The people in Galaxia are the ones you love most. We treat that with care.</p>
      <ul style={{ color: "var(--cream)", lineHeight: 1.8 }}>
        <li>Your notes are private to you and never shared with the person they are about.</li>
        <li>Shared-space conversations do not include your private notes.</li>
        <li>No two-way AI chat with children; parent guidance about a child stays with the parent.</li>
        <li>Charts are computed from real astronomical data; AI interprets, it does not invent placements.</li>
        <li>You can request account export and account deletion from /account/data.</li>
      </ul>
    </main>
  );
}
