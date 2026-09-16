import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGE_CONFIRMATION_REQUIRED,
  AGE_GATE_REJECTED_MESSAGE,
  signupViaServer
} from "./signup";
import { SITE_URL_VAR } from "./env";

const ORIGINAL_SITE_URL = process.env[SITE_URL_VAR];
const fetchMock = vi.fn();

function setSiteUrl(value: string | undefined) {
  if (value === undefined) {
    delete process.env[SITE_URL_VAR];
  } else {
    process.env[SITE_URL_VAR] = value;
  }
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  setSiteUrl("https://galaxiamea.com");
});

afterEach(() => {
  vi.unstubAllGlobals();
  setSiteUrl(ORIGINAL_SITE_URL);
});

describe("signupViaServer", () => {
  it("does not send the request when the age-gate checkbox is unchecked", async () => {
    const result = await signupViaServer({
      email: "a@example.com",
      password: "password1",
      ageConfirmed: false
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: AGE_GATE_REJECTED_MESSAGE });
  });

  it("POSTs email, password, and age_confirmed from the checkbox to the web signup route", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: "u1" }, session: null })
    });

    const result = await signupViaServer({
      email: "a@example.com",
      password: "password1",
      ageConfirmed: true
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://galaxiamea.com/api/auth/signup");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual({
      email: "a@example.com",
      password: "password1",
      age_confirmed: true
    });
    expect(result).toEqual({ ok: true, session: null });
  });

  it("maps 400 Age confirmation required to the checkbox copy", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: AGE_CONFIRMATION_REQUIRED })
    });

    const result = await signupViaServer({
      email: "a@example.com",
      password: "password1",
      ageConfirmed: true
    });

    expect(result).toEqual({ ok: false, error: AGE_GATE_REJECTED_MESSAGE });
  });

  it("surfaces other API errors unchanged", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "User already registered" })
    });

    const result = await signupViaServer({
      email: "a@example.com",
      password: "password1",
      ageConfirmed: true
    });

    expect(result).toEqual({ ok: false, error: "User already registered" });
  });

  it("returns the session so the client can persist it", async () => {
    const session = {
      access_token: "at",
      refresh_token: "rt"
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: "u1" }, session })
    });

    const result = await signupViaServer({
      email: "a@example.com",
      password: "password1",
      ageConfirmed: true
    });

    expect(result).toEqual({ ok: true, session });
  });
});

describe("mobile signup screen wiring", () => {
  const src = readFileSync(resolve(__dirname, "../../app/index.tsx"), "utf8");

  it("routes Create account through the web signup API, not supabase.auth.signUp", () => {
    expect(src).toContain("signupViaServer");
    expect(src).toContain("ageConfirmed");
    expect(src).not.toContain("supabase.auth.signUp");
  });

  it("keeps the Create account button disabled until the age-gate checkbox is true", () => {
    expect(src).toContain('testID="age-gate-checkbox"');
    expect(src).toContain("disabled={submitting || !ageConfirmed}");
  });

  it("does not change sign-in: Sign in still uses supabase.auth.signInWithPassword", () => {
    expect(src).toContain("supabase.auth.signInWithPassword");
  });
});
