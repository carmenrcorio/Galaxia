import Image from "next/image";
import { safeFigureImageSrc } from "../../lib/safe-image-url";
import type { PostInlineImage } from "../../lib/blog-inline-images";

export function ArticleInlineImage({ image }: { image: PostInlineImage }) {
  const src = safeFigureImageSrc(image.url);
  if (!src) return null;

  return (
    <figure className="article-inline-image">
      <Image
        src={src}
        alt={image.alt}
        width={1600}
        height={900}
        sizes="(max-width: 860px) 100vw, 860px"
        loading="lazy"
        className="article-inline-image-img"
      />
      {image.caption ? <figcaption className="article-inline-image-caption">{image.caption}</figcaption> : null}
      {image.credit ? <p className="article-inline-image-credit">{image.credit}</p> : null}
    </figure>
  );
}
