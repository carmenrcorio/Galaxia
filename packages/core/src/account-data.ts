/**
 * Account data export + delete helpers (pure / shared).
 * API routes own auth and I/O; this module owns field allowlists, the export
 * shape, and copy gates. Web and mobile both import these so delete/export
 * copy cannot drift.
 */

export const DELETE_CONFIRMATION_WORD = "delete";

/**
 * What the person is asked to type. Uppercase reads as a deliberate act on a
 * phone keyboard; the match itself stays case-insensitive so a lowercase
 * "delete" is still accepted and nobody is stuck on a shift key.
 */
export const DELETE_CONFIRMATION_DISPLAY_WORD = "DELETE";

/**
 * Profile columns safe to include in a user export.
 * No Stripe ids, no billing plumbing, no auth token, no row id.
 */
export const EXPORT_PROFILE_FIELDS = ["display_name", "timezone", "house_system"] as const;

export type ExportProfileField = (typeof EXPORT_PROFILE_FIELDS)[number];

/** One export per hour per user. Enforced server side by an atomic RPC. */
export const ACCOUNT_EXPORT_RATE_LIMIT = { limit: 1, windowSeconds: 3600 } as const;

/** Statuses that should show the cancel-first billing warning (warn only, never gate). */
export function shouldWarnBillingOnDelete(status: string | null | undefined): boolean {
  return status === "active" || status === "past_due" || status === "lifetime";
}

export function isDeleteConfirmation(value: string | null | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === DELETE_CONFIRMATION_WORD;
}

/** `galaxia-export-2026-09-27.json`. Date only: one file per day reads cleanly in a downloads folder. */
export function accountExportFilename(exportedAt: Date | string = new Date()): string {
  const date = typeof exportedAt === "string" ? new Date(exportedAt) : exportedAt;
  const iso = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  return `galaxia-export-${iso.slice(0, 10)}.json`;
}

// ─── Row shapes read from Supabase ─────────────────────────────────────────
// Only the columns the export is allowed to read. Anything not listed here
// never reaches the file, including owner_id, linked_user_id, and every
// internal uuid.

export interface ExportProfileRow {
  display_name?: string | null;
  timezone?: string | null;
  house_system?: string | null;
}

export interface ExportPersonRow {
  id: string;
  display_name?: string | null;
  relation?: string | null;
  is_self?: boolean | null;
  is_minor?: boolean | null;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_precision?: string | null;
  birth_lat?: number | null;
  birth_lng?: number | null;
  tz_offset_min?: number | null;
  passed_at?: string | null;
  died_on?: string | null;
  memorial_constellation?: string | null;
  created_at?: string | null;
}

export interface ExportChartRow {
  person_id: string;
  house_system?: string | null;
  computed_at?: string | null;
  data?: unknown;
}

export interface ExportNoteRow {
  about_person?: string | null;
  pair_low?: string | null;
  pair_high?: string | null;
  group_id?: string | null;
  body?: string | null;
  kind?: string | null;
  theme?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  withdrawn_at?: string | null;
}

export interface ExportRelationshipRow {
  person_a?: string | null;
  person_b?: string | null;
  relation_type?: string | null;
}

export interface ExportMilestoneRow {
  profile_id?: string | null;
  date?: string | null;
  title?: string | null;
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ExportGroupRow {
  id: string;
  name?: string | null;
  kind?: string | null;
  created_at?: string | null;
}

export interface ExportGroupMemberRow {
  group_id?: string | null;
  person_id?: string | null;
}

// ─── Emitted shape ─────────────────────────────────────────────────────────

export interface AccountExportPlacement {
  body: string;
  sign: string | null;
  degree: number | null;
  house: number | null;
  retrograde: boolean;
}

export interface AccountExportChart {
  house_system: string | null;
  computed_at: string | null;
  ascendant_sign: string | null;
  midheaven_sign: string | null;
  placements: AccountExportPlacement[];
}

export interface AccountExportBirth {
  date: string | null;
  time: string | null;
  place: string | null;
  precision: string | null;
  latitude: number | null;
  longitude: number | null;
  utc_offset_minutes: number | null;
}

export interface AccountExportMemorial {
  remembered: boolean;
  died_on: string | null;
  constellation: string | null;
}

export interface AccountExportPerson {
  name: string | null;
  relationship_type: string | null;
  is_self: boolean;
  is_minor: boolean;
  added_at: string | null;
  birth: AccountExportBirth;
  memorial: AccountExportMemorial;
  chart: AccountExportChart | null;
}

export interface AccountExportNote {
  person: string | null;
  about_pair: [string | null, string | null] | null;
  group: string | null;
  kind: string | null;
  theme: string | null;
  tags: string[];
  content: string | null;
  created_at: string | null;
  withdrawn_at: string | null;
}

export interface AccountExportRelationship {
  relationship_type: string | null;
  people: [string | null, string | null];
}

export interface AccountExportMilestone {
  person: string | null;
  date: string | null;
  title: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AccountExportGroup {
  name: string | null;
  kind: string | null;
  created_at: string | null;
  members: (string | null)[];
}

export interface AccountExportPayload {
  export_format: "galaxia-account-export";
  export_version: 1;
  exported_at: string;
  /** Plain-language note about what a reader is holding and what is not in it. */
  about: string;
  profile: {
    name: string | null;
    email: string | null;
    timezone: string | null;
    house_system: string | null;
  };
  people: AccountExportPerson[];
  relationships: AccountExportRelationship[];
  groups: AccountExportGroup[];
  notes: AccountExportNote[];
  memorial_milestones: AccountExportMilestone[];
}

export interface AccountExportInput {
  exportedAt?: Date | string;
  email: string | null;
  profile: ExportProfileRow | null;
  people: ExportPersonRow[];
  charts: ExportChartRow[];
  relationships: ExportRelationshipRow[];
  groups: ExportGroupRow[];
  groupMembers: ExportGroupMemberRow[];
  notes: ExportNoteRow[];
  milestones: ExportMilestoneRow[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Stored charts are `@galaxia/astro` NatalChart documents. Read them
 * defensively: an older engine version may be missing fields, and a missing
 * placement is reported as absent rather than filled in with a guess (§12).
 */
function toExportChart(row: ExportChartRow | undefined): AccountExportChart | null {
  if (!row) return null;
  const data = asRecord(row.data);
  const rawPlacements = Array.isArray(data?.placements) ? data.placements : [];
  const placements: AccountExportPlacement[] = [];
  for (const entry of rawPlacements) {
    const placement = asRecord(entry);
    const body = asString(placement?.body);
    if (!placement || !body) continue;
    placements.push({
      body,
      sign: asString(placement.sign),
      degree: asNumber(placement.degree),
      house: asNumber(placement.house),
      retrograde: placement.retro === true
    });
  }
  return {
    house_system: row.house_system ?? asString(data?.houseSystem),
    computed_at: row.computed_at ?? null,
    ascendant_sign: asString(data?.asc),
    midheaven_sign: asString(data?.mc),
    placements
  };
}

/**
 * Builds the downloadable export from owned rows.
 *
 * People are referenced by name, never by row id: an export is for the
 * person who wrote the data, and a uuid is internal plumbing they cannot use.
 * Vela threads and messages are deliberately absent (conversations are
 * ephemeral by design), as is anything from the billing or auth layer.
 */
export function buildAccountExport(input: AccountExportInput): AccountExportPayload {
  const exportedAt =
    typeof input.exportedAt === "string"
      ? input.exportedAt
      : (input.exportedAt ?? new Date()).toISOString();

  const nameById = new Map<string, string | null>();
  for (const person of input.people) nameById.set(person.id, person.display_name ?? null);
  const nameOf = (id: string | null | undefined): string | null =>
    id ? (nameById.get(id) ?? null) : null;

  const chartByPerson = new Map<string, ExportChartRow>();
  for (const chart of input.charts) {
    if (chart.person_id) chartByPerson.set(chart.person_id, chart);
  }

  const memberNamesByGroup = new Map<string, (string | null)[]>();
  for (const member of input.groupMembers) {
    if (!member.group_id) continue;
    const list = memberNamesByGroup.get(member.group_id) ?? [];
    list.push(nameOf(member.person_id));
    memberNamesByGroup.set(member.group_id, list);
  }

  const people: AccountExportPerson[] = input.people.map((person) => ({
    name: person.display_name ?? null,
    relationship_type: person.relation ?? null,
    is_self: person.is_self === true,
    is_minor: person.is_minor === true,
    added_at: person.created_at ?? null,
    birth: {
      date: person.birth_date ?? null,
      time: person.birth_time ?? null,
      place: person.birth_place ?? null,
      precision: person.birth_precision ?? null,
      latitude: person.birth_lat ?? null,
      longitude: person.birth_lng ?? null,
      utc_offset_minutes: person.tz_offset_min ?? null
    },
    memorial: {
      remembered: Boolean(person.passed_at || person.died_on),
      died_on: person.died_on ?? null,
      constellation: person.memorial_constellation ?? null
    },
    chart: toExportChart(chartByPerson.get(person.id))
  }));

  const relationships: AccountExportRelationship[] = input.relationships.map((row) => ({
    relationship_type: row.relation_type ?? null,
    people: [nameOf(row.person_a), nameOf(row.person_b)]
  }));

  const groups: AccountExportGroup[] = input.groups.map((group) => ({
    name: group.name ?? null,
    kind: group.kind ?? null,
    created_at: group.created_at ?? null,
    members: memberNamesByGroup.get(group.id) ?? []
  }));

  const groupNameById = new Map<string, string | null>();
  for (const group of input.groups) groupNameById.set(group.id, group.name ?? null);

  const notes: AccountExportNote[] = input.notes.map((note) => ({
    person: nameOf(note.about_person),
    about_pair:
      note.pair_low || note.pair_high ? [nameOf(note.pair_low), nameOf(note.pair_high)] : null,
    group: note.group_id ? (groupNameById.get(note.group_id) ?? null) : null,
    kind: note.kind ?? null,
    theme: note.theme ?? null,
    tags: note.tags ?? [],
    content: note.body ?? null,
    created_at: note.created_at ?? null,
    withdrawn_at: note.withdrawn_at ?? null
  }));

  const memorialMilestones: AccountExportMilestone[] = input.milestones.map((row) => ({
    person: nameOf(row.profile_id),
    date: row.date ?? null,
    title: row.title ?? null,
    note: row.note ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null
  }));

  return {
    export_format: "galaxia-account-export",
    export_version: 1,
    exported_at: exportedAt,
    about: ACCOUNT_EXPORT_COPY.fileAbout,
    profile: {
      name: input.profile?.display_name ?? null,
      email: input.email,
      timezone: input.profile?.timezone ?? null,
      house_system: input.profile?.house_system ?? null
    },
    people,
    relationships,
    groups,
    notes,
    memorial_milestones: memorialMilestones
  };
}

export const ACCOUNT_DELETE_COPY = {
  title: "Delete your account",
  lead:
    "This permanently deletes your Galaxia account and everything in it: people, charts, notes, groups, saved readings, and conversations.",
  irreversible:
    "This cannot be undone. Account deletion is different from a trial ending. When a trial ends, your galaxy stays saved. Deleting your account removes it.",
  typePrompt: 'Type the word "delete" to confirm.',
  confirmButton: "Delete my account forever",
  shareHonesty:
    "Share links you create while signed in stop working when your account is deleted, when you revoke them, or when they expire. Anonymous share links cannot be tied to your account and expire on their own.",
  billingWarning:
    "Deleting your account does not cancel billing. If you have an active subscription (or lifetime access billed through our payment provider), cancel it first so you are not charged after your account is gone.",
  billingLinkLabel: "Cancel subscription",
  errorGeneric: "We could not delete your account. Nothing was removed. Please try again.",
  successRedirectNote: "Your account has been deleted."
} as const;

/**
 * FOUNDER-REVIEW: Settings "Account" section and its delete confirmation.
 * `body` is the approved wording, verbatim.
 */
export const ACCOUNT_SECTION_COPY = {
  title: "Account",
  lead: "Take your data with you, or close your account for good.",
  exportButton: "Download my data",
  exportBusy: "Preparing your file",
  exportHelp:
    "A JSON file of your profile, your people and their charts, your notes, your relationships, your groups, and your remembrance milestones. Vela conversations are not included: they are never stored as part of your record.",
  deleteButton: "Delete my account"
} as const;

/** FOUNDER-REVIEW: the confirmation modal. `body` is the approved wording, verbatim. */
export const ACCOUNT_DELETE_MODAL_COPY = {
  title: "Delete my account",
  body: "This will permanently delete your account, your constellation, and everything in it. This cannot be undone.",
  typePrompt: `Type ${DELETE_CONFIRMATION_DISPLAY_WORD} to confirm.`,
  confirmButton: "Delete my account forever",
  confirmBusy: "Deleting your account",
  cancelButton: "Keep my account"
} as const;

export const ACCOUNT_EXPORT_COPY = {
  title: "Export your data",
  lead:
    "Download a machine-readable JSON file of the data in your account: profile, people, charts, relationships, groups, notes, and remembrance milestones.",
  button: "Download export",
  fileAbout:
    "Everything Galaxia stores for this account, written for a person to read. Vela conversations are not kept as part of your record, so they are not in this file.",
  errorGeneric: "We could not build your export. Please try again.",
  errorRateLimited: "You can download one export an hour. Try again a little later."
} as const;
