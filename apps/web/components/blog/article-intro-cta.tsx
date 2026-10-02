import { BlogCtaLink } from "./blog-analytics";
import type { BlogIntroCta } from "../../lib/blog-cta";

/** Slim intro card before the first H2. One primary button per section. */
export function ArticleIntroCta({ slug, cta }: { slug: string; cta: BlogIntroCta }) {
  return (
    <section className="article-intro-cta" aria-labelledby="article-intro-cta-heading">
      <h2 id="article-intro-cta-heading" className="visually-hidden">
        Next step
      </h2>
      <p className="article-intro-cta-body">{cta.body}</p>
      <BlogCtaLink href={cta.href} slug={slug} cta="intro" className="btn-primary">
        {cta.button}
      </BlogCtaLink>
    </section>
  );
}
