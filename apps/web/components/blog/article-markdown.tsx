import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown renderer for a published post body.
 *
 * The `img` override wraps screenshots in `<figure class="article-figure">`
 * so the CSS in globals.css can size and frame them. remark-parse still
 * treats a standalone `![alt](src)` as an *inline* node inside a paragraph,
 * so a naive `<p><figure>` tree is invalid HTML: the browser hoists the
 * figure out of the `<p>` before React hydrates, which is React #418 on
 * any post that has an image (only synastry-chart-meaning, as of this
 * writing). When a paragraph's only real children are images, we skip the
 * `<p>` wrapper so the figure is a direct child of the article.
 *
 * This is not a relaxation of the renderer (no raw HTML, no
 * `rehype-raw`, no `suppressHydrationWarning`). It is the valid-HTML
 * counterpart of the figure wrap.
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

export const articleMarkdownComponents: Components = {
  p: ({ node, children }) =>
    isImageOnlyParagraph(node) ? <>{children}</> : <p className="article-p">{children}</p>,
  h2: ({ children }) => <h2 className="article-h2">{children}</h2>,
  h3: ({ children }) => <h2 className="article-h2">{children}</h2>,
  blockquote: ({ children }) => <blockquote className="article-blockquote">{children}</blockquote>,
  img: ({ src, alt }) => (
    <figure className="article-figure">
      <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} />
    </figure>
  ),
  a: ({ href, children }) => (
    <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      {children}
    </a>
  )
};

export function ArticleMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={articleMarkdownComponents}>
      {children}
    </ReactMarkdown>
  );
}
