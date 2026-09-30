import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd, stringifyJsonLdForScript } from "../components/seo/json-ld";
import { absolutePostImageUrl } from "./blog-metadata";
import { safeFigureImageSrc } from "./safe-image-url";

describe("stringifyJsonLdForScript", () => {
  it("unicode-escapes angle brackets so </script> cannot break out of the tag", () => {
    const payload = { headline: 'Evil</script><script>alert(1)</script>' };
    const serialized = stringifyJsonLdForScript(payload);
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script\\u003e");

    const html = renderToStaticMarkup(createElement(JsonLd, { data: payload }));
    expect(html).toContain("\\u003c/script\\u003e");
    expect(html).not.toMatch(/<\/script><script>/);
  });
});

describe("absolutePostImageUrl", () => {
  it("returns null for dangerous or non-https URLs", () => {
    expect(absolutePostImageUrl("http://example.com/x.png")).toBeNull();
    expect(absolutePostImageUrl("javascript:alert(1)")).toBeNull();
    expect(absolutePostImageUrl("data:image/png;base64,abc")).toBeNull();
    expect(absolutePostImageUrl("https://evil.com/x</script>.png")).toBeNull();
  });

  it("keeps valid relative and https URLs", () => {
    expect(absolutePostImageUrl("/blog/foo/hero.png")).toBe("https://galaxiamea.com/blog/foo/hero.png");
    expect(absolutePostImageUrl("https://example.com/hero.png")).toBe("https://example.com/hero.png");
  });
});

describe("safeFigureImageSrc", () => {
  it("allows same-origin relative paths", () => {
    expect(safeFigureImageSrc("/blog/example/figure.png")).toBe("/blog/example/figure.png");
  });

  it("rejects non-https absolute URLs", () => {
    expect(safeFigureImageSrc("http://example.com/figure.png")).toBeNull();
    expect(safeFigureImageSrc("//evil.com/figure.png")).toBeNull();
  });
});
