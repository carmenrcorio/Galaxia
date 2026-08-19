import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders reviewed legal markdown (content/legal/*.md) verbatim as JSX. Every
 * override below is a typography/layout mapping only — no override touches,
 * reorders, or drops any text node. remark-gfm is required for the Section 7
 * subprocessor table in the Privacy Policy.
 */
const components: Components = {
  h1: ({ children }) => <h1 className="auth-title legal-doc-title">{children}</h1>,
  h2: ({ children }) => <h2 className="legal-doc-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="legal-doc-h3">{children}</h3>,
  p: ({ children }) => <p className="legal-doc-p">{children}</p>,
  a: ({ href, children }) => (
    <a href={href} className="legal-doc-link">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="legal-doc-list">{children}</ul>,
  ol: ({ children }) => <ol className="legal-doc-list">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  hr: () => <hr className="legal-doc-hr" />,
  table: ({ children }) => (
    <div className="legal-doc-table-wrap">
      <table className="legal-doc-table">{children}</table>
    </div>
  )
};

export function LegalDocument({ markdown }: { markdown: string }) {
  return (
    <div className="legal-doc">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
