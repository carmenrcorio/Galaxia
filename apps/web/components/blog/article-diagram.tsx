import type { ReactNode } from "react";
import { safeFigureImageSrc } from "../../lib/safe-image-url";

/** FOUNDER-REVIEW: "Text description of this diagram" */
export const FIGURE_TEXT_DESCRIPTION_LABEL = "Text description of this diagram";

export interface ArticleDiagramProps {
  src: string;
  alt: string;
  caption: string;
  longDescription: string;
  width: number;
  height: number;
}

/**
 * Supporting figure for a post. Refuses to render when alt, caption, or the
 * long description is blank so an image never ships without its text.
 */
export function ArticleDiagram({
  src,
  alt,
  caption,
  longDescription,
  width,
  height
}: ArticleDiagramProps): ReactNode {
  const imageSrc = safeFigureImageSrc(src);
  const imageAlt = alt.trim();
  const imageCaption = caption.trim();
  const description = longDescription.trim();
  if (!imageSrc || !imageAlt || !imageCaption || !description || width < 1 || height < 1) return null;

  return (
    <figure className="article-diagram">
      <img src={imageSrc} alt={imageAlt} width={width} height={height} loading="lazy" />
      <figcaption>{imageCaption}</figcaption>
      <details className="article-diagram-description">
        <summary>{FIGURE_TEXT_DESCRIPTION_LABEL}</summary>
        <p className="article-p">{description}</p>
      </details>
    </figure>
  );
}
