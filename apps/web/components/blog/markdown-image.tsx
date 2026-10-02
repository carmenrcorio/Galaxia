"use client";

import Image from "next/image";

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 900;

/**
 * Markdown inline figure via next/image when src is a local path or allowed remote.
 * Falls back to plain img for unknown shapes.
 */
export function MarkdownImage({ src, alt, title }: { src?: string | Blob; alt?: string; title?: string }) {
  const resolved = typeof src === "string" ? src : undefined;
  if (!resolved) return null;

  const caption = title?.trim() || alt?.trim() || "";
  const useOptimizer = resolved.startsWith("/") || resolved.startsWith("https://");

  return (
    <figure className="article-figure">
      {useOptimizer ? (
        <Image
          src={resolved}
          alt={alt ?? ""}
          width={DEFAULT_WIDTH}
          height={DEFAULT_HEIGHT}
          sizes="(max-width: 860px) 100vw, 860px"
          loading="lazy"
          className="article-figure-img"
        />
      ) : (
        <img src={resolved} alt={alt ?? ""} loading="lazy" />
      )}
      {caption ? <figcaption className="article-figure-caption">{caption}</figcaption> : null}
    </figure>
  );
}
