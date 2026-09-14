import Link from "next/link";
import {
  FAMILY_BRIDGE,
  PLUTO_SIGN_EXTENDED,
  WORK_VIEW_HEADING,
  WORK_VIEW_LABELS,
  ERA_READING_HEADING,
  ERA_READING_LABELS,
  getPlutoEraReading,
  getPlutoWorkView,
  plutoSourceLine,
  type GenerationalEraReading,
  type GenerationalWorkView,
  type SignKey,
} from "@galaxia/astro";
import { GALAXY_RELATION_PICKER_OPTIONS } from "@galaxia/core";
import {
  FOR_WORK_CHART_CTA,
  MARKETING_NAV_BRAND_HREF,
  MARKETING_NAV_SIGNUP,
} from "../../lib/nav-links";

/**
 * Look up a real era event from `@galaxia/astro`'s generational layer.
 * Missing data is a load-time error, not an empty card (§12).
 */
export function eraEventFromLayer(sign: SignKey, label: string) {
  const event = PLUTO_SIGN_EXTENDED[sign]?.eraEvents.find((entry) => entry.label === label);
  if (!event) {
    throw new Error(`PLUTO_SIGN_EXTENDED.${sign} is missing era event "${label}"`);
  }
  return event;
}

export function familyBridgeFromLayer(from: SignKey, to: SignKey): string {
  const text = FAMILY_BRIDGE[from]?.[to];
  if (!text) {
    throw new Error(`FAMILY_BRIDGE is missing ${from} → ${to}`);
  }
  return text;
}

/** Work relation types the app already stores, in the order this page names them. */
const WORK_RELATION_VALUES = ["colleague", "boss", "mentor", "professor"] as const;

export function workRelationLabels(): string[] {
  return WORK_RELATION_VALUES.map((value) => {
    const option = GALAXY_RELATION_PICKER_OPTIONS.find((entry) => entry.value === value);
    if (!option) {
      throw new Error(`GALAXY_RELATION_PICKER_OPTIONS is missing "${value}"`);
    }
    return option.label;
  });
}

/**
 * Three era events from `generational-layer.ts` that speak to authority,
 * institutions, trust, and change. Labels and details are the package
 * strings, not paraphrases.
 */
export const FOR_WORK_ERA_EXAMPLES = [
  eraEventFromLayer("Virgo", "Watergate"),
  eraEventFromLayer("Virgo", "The AIDS Crisis"),
  eraEventFromLayer("Scorpio", "The 2008 Crash"),
] as const;

/** Real intergenerational reading about how two eras meet a broken system. */
export const FOR_WORK_FAMILY_BRIDGE = familyBridgeFromLayer("Scorpio", "Virgo");

/**
 * Look up the work view and era reading from the package. Missing data is a
 * load-time error, not an empty card (§12).
 */
export function workViewFromLayer(sign: SignKey): GenerationalWorkView {
  const view = getPlutoWorkView(sign);
  if (!view) {
    throw new Error(`PLUTO_SIGN_EXTENDED.${sign} is missing workView`);
  }
  return view;
}

export function eraReadingFromLayer(sign: SignKey): GenerationalEraReading {
  const reading = getPlutoEraReading(sign);
  if (!reading) {
    throw new Error(`PLUTO_SIGN_EXTENDED.${sign} is missing eraReading`);
  }
  return reading;
}

/** Virgo is the era this page already quotes (Watergate, AIDS). Same sign, no new invention. */
export const FOR_WORK_EXAMPLE_SIGN: SignKey = "Virgo";
export const FOR_WORK_WORK_VIEW = workViewFromLayer(FOR_WORK_EXAMPLE_SIGN);
export const FOR_WORK_ERA_READING = eraReadingFromLayer(FOR_WORK_EXAMPLE_SIGN);
export const FOR_WORK_SOURCE_LINE = plutoSourceLine(FOR_WORK_EXAMPLE_SIGN);

export const WORK_RELATION_LABELS = workRelationLabels();

// FOUNDER-REVIEW: authored. Three workplace moments; two sentences each.
const MOMENTS = [
  {
    title: "Before a one to one",
    body: "You are about to sit down with someone whose working rhythm you only half know. Read how they are wired first, so the meeting is about the work, not about decoding them in real time.",
  },
  {
    title: "Before giving hard feedback",
    body: "Hard feedback lands differently depending on how a person meets criticism, authority, and change. Know that before you choose the words, not after they go quiet.",
  },
  {
    title: "Onboarding a new hire",
    body: "A new hire arrives with a way of working you cannot see from a resume. See the shape of their rhythm early, so you stop guessing why they move fast, go quiet, or need the plan in writing.",
  },
] as const;

function workRelationsPhrase(): string {
  const labels = WORK_RELATION_LABELS.map((label) => label.toLowerCase());
  const last = labels[labels.length - 1];
  return `${labels.slice(0, -1).join(", ")}, and ${last}`;
}

/**
 * Hero. Outcome only. The first screen is the result; the method is named
 * later in How it works.
 */
export function ForWorkHero() {
  return (
    <header className="hero container">
      <nav aria-label="Breadcrumb" className="section-page-breadcrumb">
        <Link href={MARKETING_NAV_BRAND_HREF as never}>Galaxia</Link>
        <span aria-hidden="true">/</span>
        {/* FOUNDER-REVIEW: authored breadcrumb. */}
        <span aria-current="page">For work</span>
      </nav>
      <div className="hero-text">
        {/* FOUNDER-REVIEW: authored eyebrow. */}
        <span className="eyebrow fade-in">For the people you work with</span>
        {/* FOUNDER-REVIEW: authored H1. Founder supplies the final line. Placeholder shape held. */}
        <h1 className="hero-h1 fade-in fade-in-delay-1">
          Know how this person is wired before the conversation that matters.
        </h1>
        {/* FOUNDER-REVIEW: authored lede. Outcome only on the first screen. */}
        <p className="lede fade-in fade-in-delay-2" style={{ marginTop: 18 }}>
          Before the one to one, the negotiation, or the hard feedback. A read on how they
          are wired, and what shaped them.
        </p>
      </div>
    </header>
  );
}

export function ForWorkMoments() {
  return (
    <section className="container why-not" id="moments">
      {/* FOUNDER-REVIEW: authored section head. */}
      <span className="eyebrow reveal">Three moments</span>
      <h2 className="reveal">The conversation is already on the calendar.</h2>
      <p className="body reveal">
        {/* FOUNDER-REVIEW: authored. */}
        These are the hours when knowing how someone is wired is not a nice extra. It is
        the difference between walking in cold and walking in prepared.
      </p>
      <div className="teaser-grid" style={{ marginTop: 28 }}>
        {MOMENTS.map((moment) => (
          <article key={moment.title} className="teaser-card glass-card reveal">
            <h3>{moment.title}</h3>
            <p>{moment.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * Centrepiece. Plain-language thesis, then real copy from
 * `packages/astro/src/generational-layer.ts`. Nothing here is invented.
 */
export function ForWorkGenerational() {
  return (
    <section className="edge-band" id="era">
      <div className="container edge-inner">
        <div className="edge-copy reveal">
          <div className="edge-head">
            {/* FOUNDER-REVIEW: authored. Astrology is not named yet. */}
            <span className="eyebrow edge-eyebrow">What shaped them</span>
            <h2 className="edge-h2">The era they came up in still shows up at work.</h2>
            <p className="lede edge-lede">
              {/* FOUNDER-REVIEW: authored thesis. */}
              The decade someone came of age is not trivia. It is the weather they grew up
              in: who they were taught to trust, how they meet a boss, whether a new
              process feels like progress or a threat. Two people can sit in the same
              meeting and hear two different rooms, because they came up in two different
              eras. Authority, institutions, trust, and change are learned in that weather,
              and they do not stay at home when the workday starts.
            </p>
          </div>
          <div className="teal-callout edge-callout">
            {/* FOUNDER-REVIEW: authored frame around package copy. */}
            <b style={{ color: "var(--teal)" }}>This is from the product, word for word.</b>{" "}
            <span style={{ color: "var(--mist)", fontWeight: 300 }}>
              The three notes here are entries Galaxia already keeps for the era a
              person came up in. They are not sketches, and they are not rewritten here.
            </span>
          </div>
        </div>
        <div className="cohort glass-card reveal">
          {/* FOUNDER-REVIEW: authored card eyebrow. Work view leads; era events follow as evidence. */}
          <span className="mock-label">From the generational record</span>
          <p className="eyebrow" style={{ marginTop: 8, marginBottom: 10 }}>{WORK_VIEW_HEADING}</p>
          <div className="pl-row">
            <div>
              <div className="pl-body">{WORK_VIEW_LABELS.respect}</div>
              <div className="pl-desc">{FOR_WORK_WORK_VIEW.respect}</div>
            </div>
          </div>
          <div className="pl-row">
            <div>
              <div className="pl-body">{WORK_VIEW_LABELS.decisions}</div>
              <div className="pl-desc">{FOR_WORK_WORK_VIEW.decisions}</div>
            </div>
          </div>
          <div className="pl-row">
            <div>
              <div className="pl-body">{WORK_VIEW_LABELS.friction}</div>
              <div className="pl-desc">{FOR_WORK_WORK_VIEW.friction}</div>
            </div>
          </div>
          <p className="eyebrow" style={{ marginTop: 18, marginBottom: 10 }}>{ERA_READING_HEADING}</p>
          <div className="pl-row">
            <div>
              <div className="pl-body">{ERA_READING_LABELS.authority}</div>
              <div className="pl-desc">{FOR_WORK_ERA_READING.authority}</div>
            </div>
          </div>
          <div className="pl-row">
            <div>
              <div className="pl-body">{ERA_READING_LABELS.institutions}</div>
              <div className="pl-desc">{FOR_WORK_ERA_READING.institutions}</div>
            </div>
          </div>
          <div className="pl-row">
            <div>
              <div className="pl-body">{ERA_READING_LABELS.change}</div>
              <div className="pl-desc">{FOR_WORK_ERA_READING.change}</div>
            </div>
          </div>
          <div className="pl-row">
            <div>
              <div className="pl-body">{ERA_READING_LABELS.trust}</div>
              <div className="pl-desc">{FOR_WORK_ERA_READING.trust}</div>
            </div>
          </div>
          {FOR_WORK_ERA_EXAMPLES.map((event) => (
            <div key={event.label} className="pl-row">
              <div>
                <div className="pl-body">{event.label}</div>
                <div className="pl-desc">{event.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ForWorkWhatThisIsNot() {
  return (
    <section className="container why-not" id="not-this">
      {/* FOUNDER-REVIEW: authored. Required section, not optional. */}
      <span className="eyebrow reveal">What this is not</span>
      <h2 className="reveal">A prompt for better questions, not a verdict.</h2>
      <p className="body reveal">
        {/* FOUNDER-REVIEW: authored. */}
        Use it to walk into a conversation more carefully. Do not use it to close a
        decision about someone.
      </p>
      <ul className="why-not-list">
        <li className="reveal">
          {/* FOUNDER-REVIEW: authored. */}
          <strong>This does not predict performance.</strong>{" "}
          <span>
            It will not tell you who will hit a number, who will stall, or who to promote.
            Output is still something you see in the work.
          </span>
        </li>
        <li className="reveal">
          {/* FOUNDER-REVIEW: authored. */}
          <strong>It is not a hiring tool.</strong>{" "}
          <span>
            Do not screen candidates with it, rank a shortlist with it, or treat a birth
            date as a proxy for fit. Hiring is a decision this page is not offering to make.
          </span>
        </li>
        <li className="reveal">
          {/* FOUNDER-REVIEW: authored. */}
          <strong>It is not a personality test.</strong>{" "}
          <span>
            There is no type, no badge, no score that stands in for the person in front of
            you. What you get is a way to ask a better next question.
          </span>
        </li>
      </ul>
    </section>
  );
}

export function ForWorkHowItWorks() {
  const relations = workRelationsPhrase();
  return (
    <section className="container why-not" id="how">
      <div className="how-panel">
        <div className="how-head reveal">
          {/* FOUNDER-REVIEW: authored. Language layer: this is where astrology is named. */}
          <h2>This is astrology, named plainly.</h2>
          <p>
            Real birth data. Real computed charts. No generic reading written for a
            million people who share a month.
          </p>
        </div>
        <ul className="why-not-list">
          <li className="reveal">
            {/* FOUNDER-REVIEW: authored. */}
            <strong>Real birth data.</strong>{" "}
            <span>
              A birth date is enough to start. A birth time and place, when you have them,
              unlock the deepest detail. You add the people you actually work with
              ({relations}), at the precision you have.
            </span>
          </li>
          <li className="reveal">
            {/* FOUNDER-REVIEW: authored. */}
            <strong>Real computed charts.</strong>{" "}
            <span>
              Every placement comes from astronomical positions at birth, not from a
              sun-sign guess and not from an AI inventing what is not there. The chart is
              calculated. The words interpret what was calculated.
            </span>
          </li>
          <li className="reveal">
            {/* FOUNDER-REVIEW: authored. */}
            <strong>No generic readings.</strong>{" "}
            <span>
              The read is for this person in this role, not a blurb for everyone born in
              the same week. {WORK_RELATION_LABELS.join(", ")} are relationship types the
              product already keeps, because work is already part of the inner circle you
              steer a life by.
            </span>
          </li>
        </ul>
        <div className="teal-callout" style={{ marginTop: 28 }}>
          {/* FOUNDER-REVIEW: authored frame. The paragraph that follows is package copy. */}
          <b style={{ color: "var(--teal)" }}>A real reading, not a sketch.</b>{" "}
          <span style={{ color: "var(--mist)", fontWeight: 300 }}>
            When two people at work came up in different eras, this is the kind of sentence
            the generational layer already writes. It is about how each of you learned to
            fix what is broken. It is not a score.
          </span>
          <p className="body" style={{ marginTop: 16 }}>
            {FOR_WORK_FAMILY_BRIDGE}
          </p>
          <p className="body" style={{ marginTop: 16 }}>
            {/* FOUNDER-REVIEW: authored. Names the placement after the outcome, never hidden. */}
            The work reading and the era notes on this page come from the same record.
            {` ${FOR_WORK_SOURCE_LINE}`}
          </p>
        </div>
      </div>
    </section>
  );
}

export function ForWorkClose() {
  return (
    <section className="container close" id="join">
      {/* FOUNDER-REVIEW: authored close. */}
      <h2 className="close-h reveal">
        Read them before the conversation that matters.
      </h2>
      <div className="close-cta hero-actions reveal">
        <Link href={FOR_WORK_CHART_CTA.href as never} className="btn-primary">
          {FOR_WORK_CHART_CTA.label}
        </Link>
        <Link href={MARKETING_NAV_SIGNUP.href as never} className="pill-link hero-login-btn">
          {MARKETING_NAV_SIGNUP.label}
        </Link>
      </div>
    </section>
  );
}
