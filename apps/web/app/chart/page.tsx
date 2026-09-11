import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import { DESCRIPTION, TITLE } from "./chart-seo";
import QuickChartPage from "./quick-chart-page";

/**
 * Server wrapper around the client quick-chart form. Metadata stays on
 * `layout.tsx` (this page cannot export `metadata` while also remaining a
 * client component). JSON-LD lives here rather than in the layout so
 * `/chart/compare` does not inherit a WebPage graph that names `/chart`.
 */
export default function ChartPage() {
  return (
    <>
      <WebPageJsonLd path="/chart" name={TITLE} description={DESCRIPTION} />
      <QuickChartPage />
    </>
  );
}
