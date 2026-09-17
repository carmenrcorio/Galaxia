import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_DELETE_COPY, ACCOUNT_EXPORT_COPY } from "@galaxia/core";
import { requestAccountDelete, requestAccountExport } from "./account-api";
import { SITE_URL_VAR } from "./env";

const ORIGINAL = process.env[SITE_URL_VAR];

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env[SITE_URL_VAR];
  else process.env[SITE_URL_VAR] = ORIGINAL;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mobile account export/delete call the web routes (D5)", () => {
  it("export GETs /api/account/export with the session Bearer", async () => {
    process.env[SITE_URL_VAR] = "https://galaxiamea.com";
    const fetchMock = vi.fn(async () =>
      new Response('{"exported_at":"2026-09-17T00:00:00.000Z"}', {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="galaxia-export-abcd1234.json"'
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestAccountExport("user-jwt");
    expect(result).toEqual({
      ok: true,
      json: '{"exported_at":"2026-09-17T00:00:00.000Z"}',
      filename: "galaxia-export-abcd1234.json"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://galaxiamea.com/api/account/export");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer user-jwt");
  });

  it("delete POSTs { confirmation } to /api/account/delete with the session Bearer", async () => {
    process.env[SITE_URL_VAR] = "https://galaxiamea.com";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestAccountDelete("user-jwt", " DELETE ");
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://galaxiamea.com/api/account/delete");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer user-jwt");
    expect(init.body).toBe(JSON.stringify({ confirmation: "delete" }));
  });

  it("refuses a wrong confirmation word without calling the network", async () => {
    process.env[SITE_URL_VAR] = "https://galaxiamea.com";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestAccountDelete("user-jwt", "yes");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/delete/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the shared generic copy when the site URL is missing, never a fabricated host", async () => {
    delete process.env[SITE_URL_VAR];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const exported = await requestAccountExport("user-jwt");
    const deleted = await requestAccountDelete("user-jwt", "delete");
    expect(exported).toEqual({ ok: false, error: ACCOUNT_EXPORT_COPY.errorGeneric });
    expect(deleted).toEqual({ ok: false, error: ACCOUNT_DELETE_COPY.errorGeneric });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
