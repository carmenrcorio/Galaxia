import Link from "next/link";

export default function MarketingPage() {
  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--line)", background: "rgba(16,11,34,.86)", backdropFilter: "blur(8px)" }}>
        <nav className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: "var(--gold)", fontFamily: "var(--font-fraunces)", fontSize: 26 }}>Galaxia</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/signup" className="pill-link pill-link--gold">
              Sign up
            </Link>
            <Link href="/login" className="pill-link">
              Log in
            </Link>
            <Link href="/download" className="pill-link">
              Get the app
            </Link>
          </div>
        </nav>
      </header>
      <main className="container" style={{ padding: "40px 0 80px", display: "grid", gap: 20 }}>
        <section className="glass-card" style={{ padding: 24 }}>
          <p style={{ color: "var(--gold)", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Galaxia Mea · my galaxy</p>
          <h1 className="auth-title" style={{ marginTop: 8 }}>
            The night sky belongs to everyone. Yours doesn't.
          </h1>
          <p className="muted" style={{ lineHeight: 1.7, maxWidth: 780 }}>
            Yours is small, and close, and the only one you'll ever steer your life by — the handful of people whose light you actually live by — Galaxia is a place to understand them, and tend the bonds that hold a life together.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <Link href="/signup" className="pill-link pill-link--gold">
              Sign up
            </Link>
            <Link href="/app" className="pill-link">
              Open web app
            </Link>
            <Link href="/download" className="pill-link">
              Download mobile app
            </Link>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            Mobile-first · iOS Android · private by design
          </p>
        </section>
        <section className="glass-card">
          <h2 style={{ marginTop: 0 }}>One flow: site + auth + app</h2>
          <p className="muted">Sign up on web, onboard at /welcome, open your real constellation at /app, and use the same account in mobile.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/welcome" className="pill-link">
              /welcome
            </Link>
            <Link href="/app" className="pill-link">
              /app
            </Link>
            <Link href="/app/vela" className="pill-link">
              /app/vela
            </Link>
            <Link href="/account" className="pill-link">
              /account
            </Link>
          </div>
        </section>
        <footer style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/download">Download</Link>
        </footer>
      </main>
    </>
  );
}
