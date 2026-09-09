import type { Metadata } from "next";
import { BlogHeader } from "../../components/blog/blog-header";
import { SiteFooter } from "../../components/marketing/site-footer";
import { formatPostDate, getPost } from "../../lib/blog";

const TITLE = "What a Synastry Chart Actually Tells You About Your Relationship";
const DESCRIPTION =
  "Not a compatibility score. A synastry chart maps where two people flow easily and where they reliably catch — and what to do about each. How to read one for a relationship you are already in.";

/**
 * Public long-form article — no auth, no Supabase dependency. Mirrors the
 * metadata pattern app/page.tsx uses for its most-shared link: restate the
 * full openGraph/twitter objects (Next merges metadata per top-level key,
 * not deep-per-field — see app/layout.tsx) so this page gets real title/
 * description in link previews instead of falling back to the generic
 * "Galaxia" defaults every other route inherits.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/synastry-chart-meaning",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  }
};

export default function SynastryChartMeaningPage() {
  const post = getPost("synastry-chart-meaning");
  if (!post) {
    throw new Error("Missing blog metadata for synastry-chart-meaning — see lib/blog.ts");
  }

  return (
    <>
      <BlogHeader />
      <main className="container article-page article-content">
        <h1 className="auth-title article-title">
          What a synastry chart actually tells you about your relationship
        </h1>
        <p className="article-meta">
          By {post.byline} · {formatPostDate(post.date)} · {post.readTimeMinutes} min read
        </p>

        <p className="article-p">
          Most writing about synastry is aimed at someone standing at the beginning of something, trying to decide
          whether to walk in. Score out of ten. Green flags, red flags, verdict.
        </p>
        <p className="article-p">That is almost never who is reading.</p>
        <p className="article-p">
          The person searching this is usually eight months or eleven years into something. They are not leaving.
          They want to know why the same argument keeps arriving in different clothes, and whether there is anything
          to be done about it.
        </p>
        <p className="article-p">
          For that person, &ldquo;are we compatible&rdquo; is the wrong question. It has already been answered, by
          years of evidence. Here is the better one.
        </p>

        <h2 className="article-h2">What a synastry chart is, in two minutes</h2>
        <p className="article-p">Two real birth charts, overlaid.</p>
        <p className="article-p">
          A birth chart is a map of where the planets actually were at the moment someone was born — computed from
          astronomical data, not generated or guessed. A synastry chart puts two of those maps on top of each other
          and looks at the angles between them. Your Moon sits at a certain degree. Their Mars sits at another. The
          angle between those two points is called an aspect, and some angles are smooth and some are abrasive.
        </p>
        <p className="article-p">That is the whole mechanism. Two maps, and the geometry between them.</p>
        <p className="article-p">
          It is worth being blunt about what this is not. It is not prediction — nothing here forecasts events, and
          any page that tells you a chart can is selling something. It is not a verdict on whether the relationship is
          good. And it is not a personality test that excuses anyone&rsquo;s behavior. It is a description of a
          pattern. What you do with the pattern is entirely yours.
        </p>

        <h2 className="article-h2">The only distinction that matters: flows and catches</h2>
        <p className="article-p">Strip away the vocabulary and a synastry chart tells you two things.</p>
        <p className="article-p">
          Some things between you and this person are structurally easy. Effortless in a way neither of you had to
          build. You talk about a hard subject and it just goes fine. You have a rhythm for making decisions together
          that other couples apparently have to negotiate.
        </p>
        <p className="article-p">
          And some things are structurally effortful. Not broken — effortful. There is a place where you two reliably
          catch, and you have probably been catching there since the first year.
        </p>
        <p className="article-p">Both are permanent. Neither is a problem.</p>
        <p className="article-p">
          This is the reframe that changes how the whole chart reads. Most people arrive at synastry assuming the
          difficult aspects are the diagnosis and the easy ones are the filler. It is backwards, and it costs people
          years.
        </p>
        <p className="article-p">
          Here is what that looks like once it stops being abstract — a real flows-and-catches reading, pulled
          straight from inside the app for an actual pair:
        </p>

        <figure className="article-figure">
          <img
            src="/synastry-flows-catches.png"
            alt="Galaxia's flows and catches card showing a relational dynamic with Nurture it and Ease it guidance"
          />
          <figcaption className="article-caption">
            This is what a flows/catches reading looks like inside Galaxia.
          </figcaption>
        </figure>

        <h2 className="article-h2">Why the easy parts are the dangerous ones</h2>
        <p className="article-p">
          Here is the counterintuitive part, and if you take one thing from this page, take this.
        </p>
        <p className="article-p">Nobody notices ease.</p>
        <p className="article-p">
          Friction is legible. It announces itself, it interrupts your week, it makes you want to look up a synastry
          chart. Ease does nothing. It just quietly holds a great deal of weight for a very long time without ever
          asking for attention.
        </p>
        <p className="article-p">
          Which means that in almost every long relationship there is something genuinely rare happening between two
          people that neither of them has ever said out loud. Not because they do not feel it. Because it never came
          up. It never had to.
        </p>
        <p className="article-p">
          The language Galaxia uses for these is a nurture line, and it says the thing plainly:
        </p>

        <blockquote className="article-blockquote">
          <p className="article-p" style={{ margin: 0 }}>
            <strong>Nurture it:</strong> Don&rsquo;t let this ease go unspoken between you — say the affection out
            loud even when it feels obvious — warmth this easy is exactly what gets taken for granted.
          </p>
        </blockquote>

        <p className="article-p">
          That is the risk. Not that the ease disappears. That it goes unnamed for so long it stops registering as a
          gift and starts registering as a baseline — and a baseline is something you only notice when it is gone.
        </p>
        <p className="article-p">
          So: read the easy aspects first. Before you look at a single hard one. Find out what has been carrying you,
          and then go say it to the person.
        </p>

        <h2 className="article-h2">Reading the catches without building a case</h2>
        <p className="article-p">Now the hard aspects — and the reason the reading order matters so much.</p>
        <p className="article-p">
          If you pull a synastry chart while annoyed, and you read the difficult aspects first, you will find them.
          They will be accurate. And they will confirm exactly the hypothesis you walked in holding. A chart read in
          that order cannot tell you anything you did not already believe; it can only give your existing case a
          better vocabulary.
        </p>
        <p className="article-p">
          Read after the easy aspects, the same placement reads differently. Not as a sentence handed down, but as
          one specific place where effort is required, inside a structure that is otherwise holding fine.
        </p>
        <p className="article-p">
          There is also a distinction worth making between two kinds of friction, because they call for opposite
          responses.
        </p>
        <p className="article-p">
          <strong>Friction you are managing forever</strong> repeats identically. Same fight, same words, same
          ending, every time. That is not structural. That is a conversation neither of you has had yet, wearing a
          costume. It is fixable, and the fix is usually saying the tender thing before it hardens into scorekeeping —
          naming what you actually need, early, while it is still a request rather than a grievance.
        </p>
        <p className="article-p">
          <strong>Structural friction</strong> changes shape. You are arguing about the dishes, then about the
          calendar, then about a text message, and it is obviously the same nerve every time. That one you do not
          fix. You name it. Out loud, to each other, ideally before you are in it: <em>we are doing the thing again.</em>
        </p>
        <p className="article-p">
          The difference between a couple that manages a hard aspect well and one that does not is almost never the
          aspect. It is whether they have a shared name for it.
        </p>

        <h2 className="article-h2">What a chart cannot tell you</h2>
        <p className="article-p">This section is here because no competing page has it, and because it is true.</p>
        <p className="article-p">
          A synastry chart cannot tell you whether to stay. It describes a pattern; it does not weigh a life. Two
          people with a difficult chart and the will to name things out loud will do better than two people with a
          smooth chart and nothing to say to each other.
        </p>
        <p className="article-p">
          It cannot tell you who is at fault. Aspects are mutual. There is no configuration in which the chart takes a
          side.
        </p>
        <p className="article-p">
          It cannot substitute for the conversation. This is the big one. A chart can hand you unusually precise
          language for something you have felt for years and never been able to phrase. That is genuinely valuable —
          most stuck arguments are stuck on vocabulary. But the language is only useful once it leaves the page and
          gets said to the person it is about.
        </p>
        <p className="article-p">
          And it cannot forecast. Nothing in a chart tells you what will happen next month. Anything that claims
          otherwise is not reading astronomy.
        </p>

        <figure className="article-figure">
          <img
            src="/synastry-dynamic-table.png"
            alt="Galaxia's dynamic table showing six relational dimensions between two people"
          />
        </figure>

        <h2 className="article-h2">Reading yours</h2>
        <p className="article-p">
          You need two birth dates. Birth times, as exact as you can get them, unlock the deepest layer — houses,
          rising signs, the precise Moon — but you do not need them to start. The signs, the aspect readings, and the
          generational layer all work from a date alone, sometimes from just a year.
        </p>
        <p className="article-p">
          That last part matters more than it sounds. It means the people you have the least information about — a
          grandparent, a parent who is gone, an old friend — still have a place in the reading.
        </p>
        <p className="article-p">
          Galaxia does this for the people already in your life rather than for strangers: your partner, your kids,
          your parents, your siblings, the friends who became family. Every chart is computed from real astronomical
          data, and every interpretation is written and curated rather than generated, which is why it will tell you
          what it does not know instead of guessing.
        </p>
        <p className="article-p">
          Compare any two people, see where you flow and where you catch, and get a specific thing to do about each.
        </p>

        <div className="article-cta">
          <a className="btn-primary" href="https://galaxiamea.com">
            Start 14 days free
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
