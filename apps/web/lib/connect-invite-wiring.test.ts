import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

const EM = "\u2014";

describe("constellation connect UI wiring", () => {
  it("ships /connect/[token] as its own route, not a branch of /invite", () => {
    expect(existsSync(join(REPO_ROOT, "apps/web/app/connect/[token]/page.tsx"))).toBe(true);
    const invite = read("apps/web/app/invite/[token]/page.tsx");
    expect(invite).toContain('invite.kind === "constellation_connect"');
    expect(invite).toContain("permanentRedirect(connectPath(token) as never)");
    const connect = read("apps/web/app/connect/[token]/page.tsx");
    expect(connect).toContain("ConnectAcceptView");
    expect(connect).toContain("getConnectInviteLanding");
    expect(connect).toContain("notFound()");
    expect(connect).not.toContain("AskBirthData");
    expect(connect).not.toContain("birth_data");
  });

  it("keeps /s/[token] and /r/[slug] as the share snapshot and native bridge", () => {
    expect(existsSync(join(REPO_ROOT, "apps/web/app/s/[token]/page.tsx"))).toBe(true);
    expect(existsSync(join(REPO_ROOT, "apps/web/app/r/[slug]/page.tsx"))).toBe(true);
    const share = read("apps/web/app/s/[token]/page.tsx");
    expect(share).toContain("ShareSnapshotView");
    const bridge = read("apps/web/app/r/[slug]/page.tsx");
    expect(bridge).toContain("galaxia://${slug}");
  });

  it("does not put /connect on the auth or entitlement gate", () => {
    const src = read("apps/web/middleware.ts");
    expect(src).toContain("/connect/[token] is public on purpose");
    expect(src).not.toMatch(/path\.startsWith\("\/connect"\)/);
    expect(src).not.toMatch(/["']\/connect/);
  });

  it("preserves next and redirect through login and signup", () => {
    const login = read("apps/web/app/login/page.tsx");
    const signup = read("apps/web/app/signup/page.tsx");
    const safe = read("apps/web/lib/safe-next-path.ts");
    expect(safe).toContain("export function authReturnPath");
    expect(login).toContain("authReturnPath(resolved)");
    expect(signup).toContain('authReturnPath(resolved, "/welcome")');
    const form = read("apps/web/components/login-form.tsx");
    const signupForm = read("apps/web/components/signup-form.tsx");
    expect(form).toContain("signupWithNextHref");
    expect(signupForm).toContain("loginWithNextHref");
  });

  it("adds /connect/* to AASA next to /invite/* and /r/*", () => {
    const aasa = read("apps/web/app/.well-known/apple-app-site-association/route.ts");
    expect(aasa).toContain('"/connect/*"');
    expect(aasa).toContain('"/invite/*"');
    expect(aasa).toContain('"/r/*"');
  });

  it("strips a trailing slash on /connect/:token in next.config", () => {
    const src = read("apps/web/next.config.mjs");
    expect(src).toMatch(/source:\s*["']\/connect\/:token\/["']/);
    expect(src).toMatch(/destination:\s*["']\/connect\/:token["']/);
    expect(src).not.toContain("vercel.json");
  });

  it("generate and revoke call the existing RPCs, never a new invitations table", () => {
    const button = read("apps/web/components/connect-invite-button.tsx");
    const pending = read("apps/web/components/pending-connect-invites.tsx");
    const accept = read("apps/web/components/connect-accept-view.tsx");
    expect(button).toContain('rpc("create_connect_invite"');
    expect(button).toContain("p_share_back: false");
    expect(pending).toContain('rpc("revoke_connect_invite"');
    expect(accept).toContain('rpc("accept_connect_invite"');
    expect(accept).toContain('p_share_level: "chart"');
    expect(accept).toContain('rpc("add_sender_to_constellation"');
    expect(button).not.toContain("from(\"invites\").insert");
    expect(pending).not.toContain("create table");
  });

  it("hides the generate action through canOfferConnectInvite and isMinorForSafety", () => {
    const button = read("apps/web/components/connect-invite-button.tsx");
    const lib = read("apps/web/lib/connect-invite.ts");
    expect(button).toContain("canOfferConnectInvite(person)");
    expect(lib).toContain("isMinorForSafety");
    expect(lib).toContain('band === "children"');
    expect(lib).toContain("usesAncientLight");
    expect(lib).toContain("passed_at");
  });

  it("wires generate onto the person profile and edit panel, not the constellation overlay", () => {
    const person = read("apps/web/app/app/person/[id]/page.tsx");
    const edit = read("apps/web/components/edit-person-panel.tsx");
    const home = read("apps/web/app/app/page.tsx");
    expect(person).toContain("ConnectInviteButton");
    expect(person).toContain("!usesAncientLight(person)");
    expect(edit).toContain("ConnectInviteButton");
    expect(edit).toContain("!usesAncientLight(person)");
    expect(home).not.toContain("ConnectInviteButton");
    expect(home).toContain("unackedPersonIds");
    expect(home).not.toContain("notifications");
  });

  it("person profile acknowledges an accepted invite instead of inventing a notification table", () => {
    const person = read("apps/web/app/app/person/[id]/page.tsx");
    expect(person).toContain("acknowledgeConnectIfNeeded");
    expect(person).toContain('rpc("acknowledge_connect_accept"');
    expect(person).not.toContain("notifications");
  });

  it("settings lists pending constellation_connect invites and live share links", () => {
    const settings = read("apps/web/app/app/settings/page.tsx");
    const pending = read("apps/web/components/pending-connect-invites.tsx");
    expect(settings).toContain("PendingConnectInvites");
    expect(settings).toContain("PendingShareLinks");
    expect(pending).toContain('id="pending-connections"');
    expect(pending).toContain('kind", "constellation_connect"');
    expect(pending).toContain('status", "pending"');
  });

  it("accept interstitial offers compare and constellation, not a redirect straight home", () => {
    const accept = read("apps/web/components/connect-accept-view.tsx");
    expect(accept).toContain("connectConnectedHeading");
    expect(accept).toContain("CONNECT_SEE_COMPARISON");
    expect(accept).toContain("CONNECT_GO_CONSTELLATION");
    expect(accept).toContain("connectCompareHref");
  });

  it("rate-limit migration replaces create_connect_invite without a second table", () => {
    const sql = read("supabase/migrations/20260914260000_create_connect_invite_rate_limit.sql");
    expect(sql).toContain("create or replace function public.create_connect_invite");
    expect(sql).toContain("Too many open invitations");
    expect(sql).toContain("interval '24 hours'");
    expect(sql).toContain("v_open >= 10");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("grant execute on function public.create_connect_invite(text, uuid, boolean) to authenticated");
    expect(sql).not.toMatch(/create table/i);
    expect(sql).not.toContain("\u2014");
    expect(sql).toMatch(/Safe to apply via `supabase db push`/);
  });

  it("AskBirthData still writes birth_data and never constellation_connect", () => {
    const ask = read("apps/web/components/ask-birth-data.tsx");
    const ensure = read("apps/web/lib/ensure-birth-data-invite.ts");
    const core = read("packages/core/src/birth-data-invite.ts");
    expect(ensure).toContain("birthDataInviteInsertRow");
    expect(ask).toContain("ensureBirthDataInvite");
    expect(core).toContain("/invite/");
    expect(ask).not.toContain("constellation_connect");
    expect(ensure).not.toContain("constellation_connect");
  });

  it("authored connect copy is tagged FOUNDER-REVIEW and has no em dash", () => {
    const files = [
      "apps/web/lib/connect-invite.ts",
      "apps/web/components/connect-accept-view.tsx",
      "apps/web/components/connect-invite-button.tsx",
      "apps/web/components/pending-connect-invites.tsx",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src, rel).toContain("FOUNDER-REVIEW");
      const withoutComments = src
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*\/\/.*$/gm, " ")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
      expect(withoutComments, rel).not.toContain(EM);
    }
  });
});
