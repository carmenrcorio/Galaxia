import Link from "next/link";
import type { CSSProperties } from "react";
import { ConstellationHero } from "../components/constellation-hero";
import { WaitlistForm } from "../components/waitlist-form";

export default function MarketingPage() {
  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--line)", background: "rgba(16,11,34,.9)", backdropFilter: "blur(8px)" }}>
        <nav className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0" }}>
          <div style={{ fontFamily: "var(--font-fraunces)", color: "var(--gold)", fontSize: 28 }}>Galaxia</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <a href="#shift">Why Galaxia</a>
            <a href="#generations">Generations</a>
            <a href="#vela">Meet Vela</a>
            <a href="#trust">Privacy</a>
            <a href="#join" style={{ background: "var(--gold)", color: "var(--ink)", borderRadius: 999, padding: "8px 14px", fontWeight: 700 }}>
              Early access
            </a>
          </div>
        </nav>
      </header>

      <main className="container" style={{ padding: "40px 0 80px", display: "grid", gap: 56 }}>
        <section style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 28, alignItems: "center" }}>
          <div>
            <p style={eyebrow}>Galaxia Mea · my galaxy</p>
            <h1 style={heroTitle}>The night sky belongs to everyone. Yours doesn't.</h1>
            <p style={lede}>
              Yours is small, and close, and the only one you'll ever steer your life by — the handful of people whose
              light you actually live by. Galaxia is a place to understand them, and tend the bonds that hold a life
              together.
            </p>
            <WaitlistForm source="hero" />
            <p style={{ color: "var(--mist2)", marginTop: 8 }}>Mobile-first · iOS Android · private by design</p>
          </div>
          <ConstellationHero />
        </section>

        <section id="shift">
          <p style={eyebrow}>The shift</p>
          <h2 style={sectionTitle}>Astrology forgot the people you love.</h2>
          <p style={sectionBody}>
            Every other app is built for you alone — your horoscope, your transits — or for swiping on strangers. But
            the relationships that actually shape your days are the ones already in your life: your partner, your
            kids, your mother, your siblings, the friends who became family — even the ones who came before. Galaxia
            is built for them.
          </p>
        </section>

        <section className="truths">
          <p style={eyebrow}>How it works</p>
          <h2 style={sectionTitle}>See them. Understand them. Tend the bond.</h2>
          <div style={{ display: "grid", gap: 16 }}>
            <article style={card}>
              <h3 style={cardTitle}>01 — See — See them clearly.</h3>
              <p style={sectionBody}>
                Open anyone's real birth chart — not a stripped-down vibe, but the actual placements, houses, and
                aspects, in language that finally makes sense. Depth for the astrology lover; clarity for everyone
                else.
              </p>
              <p style={mock}>
                Your mom / Rosa · Cancer Sun · Pisces Moon · Cancer Rising · ♋ Sun Cancer · ♓ Moon Pisces · ♋ Rising
                Cancer · ☽ Moon in Pisces — Emotional world · tender, absorbent · ♀ Venus in Gemini — How she loves ·
                playful, talkative · ♂ Mars in Leo — Drive · warm, proud, generous.
              </p>
            </article>
            <article style={card}>
              <h3 style={cardTitle}>02 — Understand — Understand what's between you.</h3>
              <p style={sectionBody}>
                Compare any two people and see where you flow, where you catch, and exactly what each of you needs
                from the other — read differently whether you're partners, parent and child, or siblings. Not a
                dating-app score. A real map.
              </p>
            </article>
            <article style={card}>
              <h3 style={cardTitle}>03 — Tend — Tend the bond.</h3>
              <p style={sectionBody}>
                Vela, your AI astrologer and relationship coach, helps you navigate the hard conversations — drawing on
                the chart and plain good sense. Ask privately, or open a consented shared space where Vela helps you
                both, without ever taking a side.
              </p>
              <p style={mock}>
                Ask Vela · private · About Daniel · Why do we keep having the same fight? → Here's the root: you move
                fast and say it out loud; Daniel goes quiet to keep the peace. Winning isn't the goal — naming the
                pattern before you're in it is. Try: "we're doing the thing again, can we slow down?"
              </p>
            </article>
          </div>
        </section>

        <section id="generations">
          <p style={eyebrow}>The generational layer</p>
          <h2 style={sectionTitle}>The sky you were all born under.</h2>
          <p style={sectionBody}>
            The slow planets — the ones that shape a whole generation — drift so gently that everyone born within a
            few years shares them. It's why siblings feel cut from the same cloth, why a friend group just gets each
            other, and why the people who came before you saw the world the way they did. Galaxia reads it across your
            whole circle: what you share, and where you quietly diverge.
          </p>
          <aside style={{ ...card, borderColor: "var(--teal)" }}>
            <strong style={{ color: "var(--teal)" }}>It needs only a birth year.</strong> So the people you have the
            least on — a grandmother, an old friend, the ones who came before — still take their place in your sky.
          </aside>
          <p style={mock}>
            Your group / The cousins · Shared sky: Uranus in Aquarius, Neptune in Capricorn, Pluto in Scorpio · Fault
            line: youngest carries Pluto in Sagittarius — more restless and free, less guarded than the rest of you.
          </p>
        </section>

        <section id="vela">
          <p style={eyebrow}>Your guide</p>
          <h2 style={sectionTitle}>Meet Vela.</h2>
          <p style={sectionBody}>
            Most apps talk at you. Vela talks with you — an astrologer who already knows both charts and a coach who
            gives you something to actually do. Every answer comes from two angles at once: what the stars show, and
            plain relationship sense. It never invents the chart, never takes a side in a shared space, and never
            breaches your privacy.
          </p>
          <p style={mock}>
            Vela · parenting guidance · She's 16 and shuts me out. What do I do? → Sofia's Capricorn Moon needs to
            feel competent, not managed. She doesn't open up head-on — she opens up sideways, low-stakes. Drop the
            face-to-face talk; sit beside her in the car and let silence do half the work. Want a gentle way to
            start?
          </p>
        </section>

        <section id="trust">
          <p style={eyebrow}>Built on trust</p>
          <h2 style={sectionTitle}>Private by design.</h2>
          <p style={sectionBody}>
            The people in here are the ones you love most. We treat that the way it deserves.
          </p>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
            <article style={card}>
              <h3 style={cardTitle}>Your notes are yours</h3>
              <p style={sectionBody}>
                What you write about someone is private to you — always. It's never shared, and never fed into a
                conversation they can see.
              </p>
            </article>
            <article style={card}>
              <h3 style={cardTitle}>Family-safe</h3>
              <p style={sectionBody}>
                No two-way AI chat with children. Conversations about a child are private guidance for the parent —
                never content aimed at the kid.
              </p>
            </article>
            <article style={card}>
              <h3 style={cardTitle}>Real astrology, real data</h3>
              <p style={sectionBody}>
                Charts are computed from precise birth data — not guessed by an AI. The stars are the foundation; the
                AI only ever interprets what's real.
              </p>
            </article>
          </div>
        </section>

        <section className="faq">
          <p style={eyebrow}>Questions</p>
          <h2 style={sectionTitle}>Good to know.</h2>
          <FaqItem
            question="Do I need everyone's exact birth time?"
            answer="No — and that's the point. An exact time unlocks the deepest detail (houses, your rising sign, the precise Moon). But the signs, the compatibility reads, and the entire generational layer work from just a birth date — often just a year. Add the people you have, at whatever detail you have. The grandmother you only know a birth year for still belongs in your sky."
          />
          <FaqItem
            question="Is this actually private?"
            answer="Completely. The notes you keep about someone are yours alone — never shared, never shown to them, never fed into a conversation they can see. Anything about your children stays private to you. The people in here are the ones you love most; we treat that the way it deserves."
          />
          <FaqItem
            question="Is it real astrology, or AI making things up?"
            answer="Real. Every chart is computed from precise astronomical data — the actual positions of the planets at the moment someone was born. Vela, the guide, only ever interprets what's real. She never invents a placement."
          />
          <FaqItem
            question="Who is Galaxia for?"
            answer="Anyone who wants to understand the people already in their life — a partner, kids, parents, siblings, the friends who became family, the ones who came before. It's not for swiping on strangers, and it's not a daily horoscope. It's for tending the bonds that actually make a life."
          />
          <FaqItem
            question="When can I use it?"
            answer="We're building it now, for iOS and Android. Join the early-access list and you'll be among the first to map your galaxy."
          />
        </section>

        <section id="join" style={{ textAlign: "center", padding: "32px 0" }}>
          <h2 style={{ ...heroTitle, fontSize: "clamp(36px,5vw,58px)" }}>
            The small, bright, irreplaceable galaxy that is yours.
          </h2>
          <div style={{ display: "grid", placeItems: "center" }}>
            <WaitlistForm source="close" />
            <p style={{ color: "var(--mist2)" }}>Be among the first to map your galaxy.</p>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--line)", padding: "22px 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", color: "var(--mist2)" }}>
          <span style={{ color: "var(--gold)", fontFamily: "var(--font-fraunces)" }}>Galaxia</span>
          <span>The people you love, written in the stars. · © 2026 Galaxia</span>
          <span style={{ display: "flex", gap: 10 }}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </span>
        </div>
      </footer>
    </>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details style={card}>
      <summary style={{ fontWeight: 700, cursor: "pointer" }}>{question}</summary>
      <p style={{ ...sectionBody, marginTop: 10 }}>{answer}</p>
    </details>
  );
}

const eyebrow: CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: ".08em",
  color: "var(--gold-soft)",
  fontSize: 12,
  marginBottom: 6
};

const heroTitle: CSSProperties = {
  fontFamily: "var(--font-fraunces)",
  fontSize: "clamp(44px,7vw,80px)",
  lineHeight: 1.02,
  margin: "6px 0 16px"
};

const sectionTitle: CSSProperties = {
  fontFamily: "var(--font-fraunces)",
  fontSize: "clamp(32px,4.5vw,54px)",
  lineHeight: 1.1,
  margin: "6px 0 12px"
};

const lede: CSSProperties = {
  color: "var(--mist)",
  lineHeight: 1.7,
  fontSize: 18,
  maxWidth: 680
};

const sectionBody: CSSProperties = {
  color: "var(--mist)",
  lineHeight: 1.7
};

const card: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 16,
  background: "var(--ink2)",
  padding: 18
};

const cardTitle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 22,
  fontFamily: "var(--font-fraunces)"
};

const mock: CSSProperties = {
  border: "1px dashed var(--line)",
  borderRadius: 12,
  padding: 12,
  color: "var(--cream)",
  lineHeight: 1.6,
  background: "rgba(23,17,48,.6)",
  fontSize: 14
};
