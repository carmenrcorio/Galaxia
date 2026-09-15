import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for the admin posts list + slug editor and the
 * /api/admin/posts/images route. Pages and routes are not imported
 * (vitest.config.ts scopes discovery to lib/** and components/**; routes
 * pull in server-only via require-admin.ts).
 */

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

function readFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("/admin/posts list — requireAdmin layout gate, slug links, hero column", () => {
  const src = readFile("apps/web/app/admin/posts/page.tsx");

  it("never imports require-admin.ts (the layout owns the gate, same as /admin/analytics)", () => {
    expect(src).not.toMatch(/from\s+["'][./]*lib\/require-admin["']/);
  });

  it("does not add an owner-email special case", () => {
    expect(src).not.toContain("NEXT_PUBLIC_ADMIN_EMAIL");
    expect(src).not.toMatch(/user\.email/);
  });

  it("lists published and draft posts with title, status, published_at, and whether hero_image_url is set", () => {
    expect(src).toContain("listPostsForAdmin(serviceRoleClient)");
    expect(src).toContain("<th>Title</th>");
    expect(src).toContain("<th>Status</th>");
    expect(src).toContain("<th>Published</th>");
    expect(src).toContain("<th>Hero</th>");
    expect(src).toContain('post.hero_image_url ? "set" : "none"');
  });

  it("links each row to /admin/posts/{slug}, not the uuid", () => {
    expect(src).toContain("`/admin/posts/${post.slug}`");
    expect(src).not.toContain("`/admin/posts/${post.id}`");
  });
});

describe("/admin/posts/[slug] editor — requireAdmin layout gate, slug lookup", () => {
  const src = readFile("apps/web/app/admin/posts/[slug]/page.tsx");

  it("never imports require-admin.ts", () => {
    expect(src).not.toMatch(/from\s+["'][./]*lib\/require-admin["']/);
  });

  it("does not add an owner-email special case", () => {
    expect(src).not.toContain("NEXT_PUBLIC_ADMIN_EMAIL");
    expect(src).not.toMatch(/user\.email/);
  });

  it("loads the post by slug (with uuid fallback) and lists blog-images", () => {
    expect(src).toContain("getPostForAdminBySlugOrId(serviceRoleClient, slug)");
    expect(src).toContain("listBlogImages(serviceRoleClient)");
  });

  it("renders PostEditorForm in edit mode", () => {
    expect(src).toContain('<PostEditorForm mode="edit"');
  });
});

describe("GET/POST /api/admin/posts/images — requireAdminApi independent of the /admin layout", () => {
  const src = readFile("apps/web/app/api/admin/posts/images/route.ts");

  it("imports and calls requireAdminApi in GET and POST", () => {
    expect(src).toContain('import { requireAdminApi } from "../../../../../lib/require-admin"');
    expect(src).toMatch(/export async function GET\(/);
    expect(src).toMatch(/export async function POST\(/);
    const getSrc = src.slice(src.indexOf("export async function GET("), src.indexOf("export async function POST("));
    const postSrc = src.slice(src.indexOf("export async function POST("));
    expect(getSrc).toMatch(/await requireAdminApi\(\)/);
    expect(postSrc).toMatch(/await requireAdminApi\(\)/);
    expect(getSrc).toMatch(/if\s*\(\s*guard\s+instanceof\s+NextResponse\s*\)\s*return\s+guard;/);
    expect(postSrc).toMatch(/if\s*\(\s*guard\s+instanceof\s+NextResponse\s*\)\s*return\s+guard;/);
  });

  it("never calls requireAdmin (the redirect version)", () => {
    expect(src).not.toContain("requireAdmin(");
  });

  it("GET lists blog-images via listBlogImages; POST uploads via uploadPostImage", () => {
    expect(src).toContain("listBlogImages(serviceRoleClient)");
    expect(src).toContain("uploadPostImage(serviceRoleClient, file)");
  });
});

describe("20260915024600_blog_images_photo_uploads.sql", () => {
  const sql = readFile("supabase/migrations/20260915024600_blog_images_photo_uploads.sql");

  it("widens blog-images to raster photos without dropping SVG", () => {
    expect(sql).toContain("blog-images");
    expect(sql).toContain("image/svg+xml");
    expect(sql).toContain("image/png");
    expect(sql).toContain("image/jpeg");
    expect(sql).toContain("image/webp");
    expect(sql).toContain("image/gif");
    expect(sql).toContain("8388608");
    expect(sql).not.toContain("\u2014");
  });
});
