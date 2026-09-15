// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PostEditorForm } from "./post-editor-form";
import type { AdminPostDetail } from "../../lib/admin/posts";
import type { BlogCategory } from "../../lib/blog";
import { BODY_WORD_WARN_LIMIT } from "../../lib/admin/post-body-blocks";

const push = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh })
}));

const CATEGORIES: BlogCategory[] = [
  { slug: "guides", label: "Astrology guides", emptyNote: "More soon." }
];

const IMAGES = [
  {
    path: "synastry-chart-meaning.svg",
    name: "synastry-chart-meaning.svg",
    url: "https://cdn.example/blog-images/synastry-chart-meaning.svg"
  }
];

function samplePost(overrides: Partial<AdminPostDetail> = {}): AdminPostDetail {
  return {
    id: "post-1",
    slug: "synastry-chart-meaning",
    title: "What a Synastry Chart Tells You",
    dek: "A dek.",
    category: "guides",
    body: "## Heading\n\nA paragraph.\n\n![Moon](https://cdn.example/blog-images/photos/moon.jpg)",
    hero_image_url: IMAGES[0]!.url,
    status: "published",
    read_time_minutes: 4,
    published_at: "2026-08-04T12:00:00.000Z",
    created_at: "2026-08-04T12:00:00.000Z",
    updated_at: "2026-09-14T12:00:00.000Z",
    ...overrides
  };
}

function renderEdit(post: AdminPostDetail = samplePost()) {
  return render(
    <PostEditorForm mode="edit" categories={CATEGORIES} post={post} images={IMAGES} />
  );
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  refresh.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PostEditorForm — hero, blocks, explicit save", () => {
  it("shows the current hero image and none set when missing", () => {
    const { unmount } = renderEdit();
    expect(screen.getByRole("heading", { name: "Hero image" })).toBeTruthy();
    expect(document.querySelector(`img[src="${IMAGES[0]!.url}"]`)).toBeTruthy();
    unmount();

    renderEdit(samplePost({ hero_image_url: null }));
    expect(screen.getByText("none set")).toBeTruthy();
  });

  it("renders body headings, paragraphs, and image thumbnails as blocks", () => {
    renderEdit();
    expect(screen.getByRole("heading", { name: "Body photo blocks" })).toBeTruthy();
    expect((screen.getByDisplayValue("## Heading") as HTMLTextAreaElement).value).toBe("## Heading");
    expect((screen.getByDisplayValue("A paragraph.") as HTMLTextAreaElement).value).toBe("A paragraph.");
    expect(document.querySelector('img[src="https://cdn.example/blog-images/photos/moon.jpg"]')).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Insert image after" })).toHaveLength(3);
  });

  it("shows last saved and does not auto-save on edit", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderEdit();
    expect(screen.getByText("Last saved 14 Sep 2026, 12:00 UTC")).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("A paragraph."), { target: { value: "Edited paragraph." } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Save PATCHes body and hero_image_url and stays on the editor", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        post: samplePost({ updated_at: "2026-09-15T02:50:00.000Z", body: "Edited paragraph." })
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    renderEdit();
    fireEvent.change(screen.getByDisplayValue("A paragraph."), { target: { value: "Edited paragraph." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/posts/post-1");
    expect(init.method).toBe("PATCH");
    const payload = JSON.parse(String(init.body)) as { body: string; heroImageUrl: string };
    expect(payload.body).toContain("Edited paragraph.");
    expect(payload.heroImageUrl).toBe(IMAGES[0]!.url);
    await waitFor(() => expect(screen.getByText("Last saved 15 Sep 2026, 02:50 UTC")).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });

  it("warns before save when the rewritten body is over 10000 words", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderEdit(samplePost({ body: Array.from({ length: BODY_WORD_WARN_LIMIT + 1 }, () => "word").join(" ") }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(String(confirm.mock.calls[0]?.[0])).toContain("10,000 words");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Remove image drops that markdown line from the next save payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, post: samplePost({ updated_at: "2026-09-15T03:00:00.000Z" }) })
    });
    vi.stubGlobal("fetch", fetchMock);
    renderEdit();
    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as {
      body: string;
    };
    expect(payload.body).not.toContain("![Moon]");
    expect(payload.body).toContain("## Heading");
  });
});
