import { describe, expect, it, vi } from "vitest";
import {
  BLOG_IMAGES_BUCKET,
  BLOG_IMAGES_PHOTO_PREFIX,
  InvalidPostImageError,
  listBlogImages,
  uploadPostImage
} from "./post-images";

function fakeStorage(entriesByFolder: Record<string, Array<{ name: string; id: string | null }>>) {
  const list = vi.fn(async (folder = "") => {
    const data = entriesByFolder[folder] ?? [];
    return { data, error: null };
  });
  const upload = vi.fn(async () => ({ error: null }));
  const getPublicUrl = vi.fn((path: string) => ({
    data: { publicUrl: `https://cdn.example/${BLOG_IMAGES_BUCKET}/${path}` }
  }));
  const from = vi.fn(() => ({ list, upload, getPublicUrl }));
  return {
    client: { storage: { from } } as never,
    from,
    list,
    upload,
    getPublicUrl
  };
}

describe("listBlogImages", () => {
  it("lists root files and recurses into photos/", async () => {
    const { client, from } = fakeStorage({
      "": [
        { name: "synastry-chart-meaning.svg", id: "file-1" },
        { name: "photos", id: null }
      ],
      photos: [{ name: "moon.jpg", id: "file-2" }]
    });

    const images = await listBlogImages(client);
    expect(from).toHaveBeenCalledWith(BLOG_IMAGES_BUCKET);
    expect(images.map((image) => image.path)).toEqual(["photos/moon.jpg", "synastry-chart-meaning.svg"]);
    expect(images[0]?.url).toBe(`https://cdn.example/${BLOG_IMAGES_BUCKET}/photos/moon.jpg`);
  });

  it("skips dotfiles", async () => {
    const { client } = fakeStorage({
      "": [{ name: ".emptyFolderPlaceholder", id: "file-x" }]
    });
    expect(await listBlogImages(client)).toEqual([]);
  });
});

describe("uploadPostImage", () => {
  it("uploads raster photos to blog-images/photos/ and returns the public URL", async () => {
    const { client, from, upload } = fakeStorage({});
    const file = new File([new Uint8Array([1, 2, 3])], "hero.png", { type: "image/png" });
    const result = await uploadPostImage(client, file);

    expect(from).toHaveBeenCalledWith(BLOG_IMAGES_BUCKET);
    expect(result.path).toMatch(new RegExp(`^${BLOG_IMAGES_PHOTO_PREFIX}/[0-9a-f-]+\\.png$`));
    expect(result.url).toBe(`https://cdn.example/${BLOG_IMAGES_BUCKET}/${result.path}`);
    expect(upload).toHaveBeenCalledWith(
      result.path,
      expect.any(ArrayBuffer),
      expect.objectContaining({ contentType: "image/png", cacheControl: "31536000", upsert: false })
    );
  });

  it("rejects an unsupported mime type before touching storage", async () => {
    const { client, upload } = fakeStorage({});
    const file = new File(["not-an-image"], "notes.txt", { type: "text/plain" });
    await expect(uploadPostImage(client, file)).rejects.toBeInstanceOf(InvalidPostImageError);
    expect(upload).not.toHaveBeenCalled();
  });
});
