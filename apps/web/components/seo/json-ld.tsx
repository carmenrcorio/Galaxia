/**
 * Reusable JSON-LD structured-data injector.
 *
 * A plain server component (no "use client", no hooks) so the
 * `<script type="application/ld+json">` tag it renders is present in the
 * initial server-rendered HTML — not injected after hydration — which is
 * what search engines and other crawlers that don't execute JS actually
 * read. Do not add "use client" to this file or to anything that wraps it;
 * that would move the script tag out of the server-rendered output.
 *
 * Accepts either a single JSON-LD object or an array of them. Schema.org
 * allows multiple graphs in one <script> tag as a JSON array, so a page
 * that needs more than one type (e.g. Organization + FAQPage) can pass
 * `[orgSchema, faqSchema]` instead of rendering two separate <JsonLd />s.
 */
export type JsonLdObject = Record<string, unknown>;

interface JsonLdProps {
  data: JsonLdObject | JsonLdObject[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON-LD must be raw, unescaped JSON inside the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
