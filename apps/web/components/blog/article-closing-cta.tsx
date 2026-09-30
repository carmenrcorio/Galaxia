import { BlogCtaLink } from "./blog-analytics";
import type { BlogClosingCta } from "../../lib/blog-cta";

/**
 * The one closing call to action on a post. The button goes to the same
 * place as that post's inline link, and records blog_cta_click with cta
 * "closing".
 */
export function ArticleClosingCta({ slug, cta }: { slug: string; cta: BlogClosingCta }) {
  return (
    <section className="article-closing-cta" aria-labelledby="article-closing-cta-heading">
      <h2 id="article-closing-cta-heading" className="article-closing-cta-title">
        {cta.heading}
      </h2>
      <p>{cta.body}</p>
      <BlogCtaLink href={cta.href} slug={slug} cta="closing" className="btn-primary">
        {cta.button}
      </BlogCtaLink>
    </section>
  );
}
