import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import { DESCRIPTION, TITLE } from "./chart-seo";
import QuickChartPage from "./quick-chart-page";

/**
 * Server wrapper around the client quick-chart form. Metadata stays on
 * `layout.tsx` (this page cannot export `metadata` while also remaining a
 * client component). JSON-LD lives here rather than in the layout so
 * `/chart/compare` does not inherit a WebPage graph that names `/chart`.
 *
 * Session is NOT read here. Reading cookies would dynamize the SEO URL for
 * every visitor, including crawlers. The client form starts from the logged-out
 * chrome (useViewer userId is null until a session is found), so the
 * server-rendered HTML a crawler sees is the public funnel: same metadata,
 * canonical, and structured data as before.
 */
export default function ChartPage() {
  return (
    <>
      <WebPageJsonLd path="/chart" name={TITLE} description={DESCRIPTION} />
      <QuickChartPage />
    </>
  );
}
