import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");

function readMobile(rel: string): string {
  return readFileSync(resolve(mobileRoot, rel), "utf8");
}

describe("Phase 5 person depth: Today, EditPerson, remembrance, edges, connect", () => {
  it("profile widens the people select and mounts Today above the tab strip", () => {
    const src = readMobile("app/(app)/profile/[personId].tsx");
    expect(src).toContain("PERSON_DEPTH_SELECT");
    expect(src).toContain("shouldShowLiveTransits");
    expect(src).toContain("person_daily_nudges");
    expect(src).toContain("buildPersonDailyNudge");
    expect(src).toContain("coerceDailyNudgeRow");
    expect(src).toContain("ignoreDuplicates: true");
    expect(src).toContain("PersonTodayCards");
    expect(src).toContain('useState<PersonGroupKey>("them")');
    expect(src).toContain('groupKeys: PersonGroupKey[] = ["them", secondGroup]');
    expect(src).not.toContain("PERSON_GROUP_LABEL.now");
    expect(src).not.toContain('setActiveGroup("now")');
    const flipIdx = src.indexOf("<FlipSignCards");
    const wheelIdx = src.indexOf("<ChartWheel");
    const todayIdx = src.indexOf("<PersonTodayCards");
    const tabIdx = src.indexOf('accessibilityRole="tablist"');
    expect(flipIdx).toBeGreaterThan(0);
    expect(wheelIdx).toBeGreaterThan(flipIdx);
    expect(todayIdx).toBeGreaterThan(wheelIdx);
    expect(src).not.toContain("ChartSignTiles");
    expect(tabIdx).toBeGreaterThan(todayIdx);
    expect(src).toContain("<RetrogradeBadge retro={placement.retro} />");
    expect(readMobile("src/components/flip-sign-cards.tsx")).toContain("<RetrogradeBadge retro={tile.retro} />");
    expect(src).toContain("includeVela={false}");
    expect(src).toContain("includeRightNow={false}");
    expect(src).not.toContain("<RelationshipEdgesBox");
  });

  it("EditPerson writes existing columns, searchPlaces pick-required, passed_at separate from chart", () => {
    const edit = readMobile("src/components/edit-person-panel.tsx");
    expect(edit).toContain("searchPlaces");
    expect(edit).toContain("buildBirthInput");
    expect(edit).toContain("computeNatalChart");
    expect(edit).toContain("getPreferredHouseSystem");
    expect(edit).toContain("normalizeStarColorForWrite");
    expect(edit).toContain("normalizeStarScale");
    expect(edit).toContain("exclude_from_dailies");
    expect(edit).toContain("EXCLUDE_FROM_DAILIES_LABEL");
    expect(edit).toContain("<RelationshipEdgesBox");
    expect(edit).toContain("custom_position: null");
    expect(edit).toContain("rpc(\"delete_own_person\"");
    expect(edit).toContain("update({ passed_at: value })");
    expect(edit).not.toContain("memorial_constellation");
    expect(edit).not.toContain("died_on");
    expect(edit).toContain("Search for the birth city and pick it from the results");
  });

  it("honor and edges use un-narrowed relationships selects and core insert helpers", () => {
    const honor = readMobile("src/components/honor-declaration.tsx");
    expect(honor).toContain("Who carries their light?");
    expect(honor).toContain("livingHonorCandidates");
    expect(honor).toContain("buildHonorRelationshipInsert");
    expect(honor).toContain("connectionDiff");
    expect(honor).toMatch(/\.delete\(\)[\s\S]{0,180}\.eq\("relation_type", HONOR_RELATION_TYPE\)/);
    expect(honor).toContain('.select("id, person_a, person_b, relation_type")');

    const edges = readMobile("src/components/relationship-edges.tsx");
    expect(edges).toContain("RELATIONSHIP_PICKER_COPY");
    expect(edges).toContain("Lines on the constellation");
    expect(edges).toContain("buildRelationshipInsert");
    expect(edges).toContain("declaredBondsFromRows");
    expect(edges).toContain("partnerBondAllowed");
    expect(edges).not.toContain("buildHonorRelationshipInsert");
    expect(edges).not.toContain("HONOR_RELATION_TYPE");
    expect(edges).toContain('.eq("relation_type", bond.relationType)');
  });

  it("remembrance writes notes kind remembrance and memorial_constellation; timeline writes died_on", () => {
    const remembrance = readMobile("src/components/remembrance-space.tsx");
    expect(remembrance).toContain("REMEMBRANCE_NOTE_KIND");
    expect(remembrance).toContain("buildRemembranceNoteInsert");
    expect(remembrance).toContain("normalizeMemorialConstellationForWrite");
    expect(remembrance).toContain("memorial_constellation: normalized");
    expect(remembrance).toContain("Your reflections");
    expect(remembrance).not.toContain("Who carries their light?");

    const timeline = readMobile("src/components/memorial-timeline.tsx");
    expect(timeline).toContain("shouldShowMemorialTimeline");
    expect(timeline).toContain("validateMemorialMilestoneInput");
    expect(timeline).toContain("computeLifespanTransits");
    expect(timeline).toContain("memorial_milestones");
    expect(timeline).toContain("died_on: diedOnDraft");
  });

  it("connect send uses create_connect_invite + siteUrlFor; pending list lives on Settings; accept stays web", () => {
    const button = readMobile("src/components/connect-invite-button.tsx");
    expect(button).toContain("create_connect_invite");
    expect(button).toContain("siteUrlFor");
    expect(button).toContain("p_share_back: false");
    expect(button).toContain("CONNECT_INVITE_ACTION");
    expect(button).not.toContain("accept_connect_invite");

    const pending = readMobile("src/components/pending-connect-invites.tsx");
    expect(pending).toContain('kind", "constellation_connect"');
    expect(pending).toContain('status", "pending"');
    expect(pending).toContain("revoke_connect_invite");

    const settings = readMobile("app/(app)/(tabs)/settings.tsx");
    expect(settings).toContain("PendingConnectInvites");

    const profile = readMobile("app/(app)/profile/[personId].tsx");
    expect(profile).toContain("ConnectInviteButton");
    expect(profile).not.toContain("WebView");
    expect(profile).not.toContain("react-native-webview");
  });
});
