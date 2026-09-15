import { describe, expect, it, vi } from "vitest";
import { getPostForAdminBySlugOrId, listPostsForAdmin } from "./posts";

const DETAIL = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  slug: "synastry-chart-meaning",
  title: "What a Synastry Chart Tells You",
  dek: "A dek.",
  category: "guides",
  body: "Hello.",
  hero_image_url: "https://cdn.example/hero.svg",
  status: "published",
  read_time_minutes: 1,
  published_at: "2026-08-04T12:00:00.000Z",
  created_at: "2026-08-04T12:00:00.000Z",
  updated_at: "2026-09-14T12:00:00.000Z"
};

function fakeFrom(handler: (table: string) => unknown) {
  return { from: vi.fn(handler) } as never;
}

describe("listPostsForAdmin", () => {
  it("selects hero_image_url alongside title, status, and published_at", async () => {
    const order = vi.fn().mockResolvedValue({ data: [DETAIL], error: null });
    const select = vi.fn().mockReturnValue({ order });
    const client = fakeFrom(() => ({ select }));
    const rows = await listPostsForAdmin(client);
    expect(select).toHaveBeenCalledWith("id, slug, title, status, published_at, hero_image_url, created_at");
    expect(rows[0]?.hero_image_url).toBe(DETAIL.hero_image_url);
  });
});

describe("getPostForAdminBySlugOrId", () => {
  it("looks up by slug first", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: DETAIL, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const client = fakeFrom(() => ({ select }));
    const post = await getPostForAdminBySlugOrId(client, "synastry-chart-meaning");
    expect(eq).toHaveBeenCalledWith("slug", "synastry-chart-meaning");
    expect(eq).not.toHaveBeenCalledWith("id", expect.anything());
    expect(post?.slug).toBe("synastry-chart-meaning");
  });

  it("falls back to id when the path is a uuid and no slug matches", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: DETAIL, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const client = fakeFrom(() => ({ select }));
    const post = await getPostForAdminBySlugOrId(client, DETAIL.id);
    expect(eq).toHaveBeenNthCalledWith(1, "slug", DETAIL.id);
    expect(eq).toHaveBeenNthCalledWith(2, "id", DETAIL.id);
    expect(post?.id).toBe(DETAIL.id);
  });
});
