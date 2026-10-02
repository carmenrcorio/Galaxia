import Image from "next/image";

/** FOUNDER-REVIEW: fallback when no hero asset is set yet. */
export const ARTICLE_HERO_FALLBACK_ALT =
  "Decorative star field placeholder while the article hero image is prepared";

export function ArticleHero({
  url,
  alt,
  credit
}: {
  url: string | null;
  alt: string | null;
  credit: string | null;
}) {
  const trimmedUrl = url?.trim() ?? "";
  const trimmedAlt = alt?.trim() ?? "";
  const trimmedCredit = credit?.trim() ?? "";

  if (trimmedUrl && trimmedAlt) {
    return (
      <figure className="article-hero">
        <Image src={trimmedUrl} alt={trimmedAlt} width={1600} height={840} priority sizes="(max-width: 860px) 100vw, 860px" />
        {trimmedCredit ? <figcaption className="article-hero-credit">{trimmedCredit}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure className="article-hero article-hero--fallback" aria-label={ARTICLE_HERO_FALLBACK_ALT}>
      <div className="article-hero-fallback" role="img" aria-label={ARTICLE_HERO_FALLBACK_ALT} />
      {trimmedCredit ? <figcaption className="article-hero-credit">{trimmedCredit}</figcaption> : null}
    </figure>
  );
}
