import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FIGURE_MARKER,
  MID_NEWSLETTER_MARKER,
  injectMidNewsletterMarker,
  uniqueHeadingId
} from "../../lib/article-structure";
import { INLINE_IMAGE_MARKER_PREFIX, type PostInlineImage } from "../../lib/blog-inline-images";
import { BlogNewsletterBox } from "./blog-newsletter-box";
import { MarkdownImage } from "./markdown-image";

/**
 * Markdown renderer for a published post body.
 *
 * The `img` override uses next/image for local and https sources. remark-parse
 * still treats a standalone `![alt](src)` as an *inline* node inside a paragraph,
 * so image-only paragraphs skip the `<p>` wrapper for valid HTML.
 *
 * Heading `id`s are generated here so the in-article TOC jump links match.
 * The mid-post newsletter box is injected at render time, never stored in body.
 */
function isImageOnlyParagraph(
  node:
    | {
        children?: Array<{ type: string; tagName?: string; value?: string }>;
      }
    | undefined
): boolean {
  const children = node?.children;
  if (!children?.length) return false;
  let sawImage = false;
  for (const child of children) {
    if (child.type === "element" && child.tagName === "img") {
      sawImage = true;
      continue;
    }
    if (child.type === "text" && !child.value?.trim()) continue;
    return false;
  }
  return sawImage;
}

function flattenReactText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement(child)) {
        return flattenReactText((child.props as { children?: ReactNode }).children);
      }
      return "";
    })
    .join("");
}

export const articleMarkdownComponents: Components = {
  p: ({ node, children }) =>
    isImageOnlyParagraph(node) ? <>{children}</> : <p className="article-p">{children}</p>,
  h2: ({ children }) => <h2 className="article-h2">{children}</h2>,
  h3: ({ children }) => <h2 className="article-h2">{children}</h2>,
  blockquote: ({ children }) => <blockquote className="article-blockquote">{children}</blockquote>,
  img: ({ src, alt, title }) => <MarkdownImage src={src} alt={alt} title={title} />,
  a: ({ href, children }) => (
    <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="article-table-wrap">
      <table className="article-table">{children}</table>
    </div>
  )
};

export function ArticleMarkdown({
  children,
  slug,
  figure,
  showMidNewsletter = false,
  inlineImagesByMarker
}: {
  children: string;
  slug?: string;
  figure?: ReactNode;
  showMidNewsletter?: boolean;
  inlineImagesByMarker?: Map<string, ReactNode>;
}) {
  const body = showMidNewsletter && slug ? injectMidNewsletterMarker(children) : children;
  const seen = new Map<string, number>();
  const components: Components = {
    ...articleMarkdownComponents,
    h2: ({ children: heading }) => {
      const id = uniqueHeadingId(flattenReactText(heading), seen);
      return (
        <h2 id={id} className="article-h2">
          {heading}
        </h2>
      );
    },
    p: ({ node, children: paragraph }) => {
      const text = flattenReactText(paragraph).trim();
      if (text === FIGURE_MARKER) return figure ?? null;
      if (text.startsWith(INLINE_IMAGE_MARKER_PREFIX) && text.endsWith("%%")) {
        return inlineImagesByMarker?.get(text) ?? null;
      }
      if (showMidNewsletter && slug && text === MID_NEWSLETTER_MARKER) {
        return <BlogNewsletterBox slug={slug} />;
      }
      return isImageOnlyParagraph(node) ? <>{paragraph}</> : <p className="article-p">{paragraph}</p>;
    }
  };

  if (!children.trim()) return null;

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {body}
    </ReactMarkdown>
  );
}

export function buildInlineImagesMarkerMap(
  images: PostInlineImage[],
  render: (image: PostInlineImage, index: number) => ReactNode
): Map<string, ReactNode> {
  const map = new Map<string, ReactNode>();
  images.forEach((image, index) => {
    map.set(`%%GALAXIA_INLINE_IMAGE_${index}%%`, render(image, index));
  });
  return map;
}
