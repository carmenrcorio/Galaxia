export default function TermsPage() {
  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 56, maxWidth: 860 }}>
      <h1 className="auth-title">Terms of Service</h1>
      <p className="muted">By using Galaxia, you agree to use the service lawfully and with consent for shared-space interactions.</p>
      <ul style={{ color: "var(--cream)", lineHeight: 1.8 }}>
        <li>Galaxia guidance is reflective coaching, not medical or legal advice.</li>
        <li>You are responsible for the accuracy of data you enter.</li>
        <li>Shared spaces require participant consent and may be revoked.</li>
        <li>Abusive use and attempts to bypass safety controls are prohibited.</li>
      </ul>
    </main>
  );
}
