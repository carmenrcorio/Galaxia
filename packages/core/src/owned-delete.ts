/**
 * Shared copy + preview helpers for owner-scoped group/person delete.
 * Mutations live in Postgres (`delete_own_group`, `delete_own_person`);
 * clients only format confirmation and call the RPC.
 */

/** Create / persist minimum — a cohort below this is not a meaningful group. */
export const GROUP_MIN_MEMBERS = 3;

export interface GroupMemberCount {
  groupId: string;
  name: string;
  memberCount: number;
}

/** A group that will be destroyed as a side effect of person delete. */
export interface CollapsingGroupPreview {
  groupId: string;
  name: string;
  conversationCount: number;
}

/**
 * Groups that would fall below GROUP_MIN_MEMBERS after removing one member.
 * Matching `delete_own_person`: those groups are deleted with their threads.
 */
export function groupsCollapsedByMemberRemoval(
  groups: GroupMemberCount[]
): GroupMemberCount[] {
  return groups.filter((g) => g.memberCount <= GROUP_MIN_MEMBERS);
}

export function isBelowGroupMinimum(memberCount: number): boolean {
  return memberCount < GROUP_MIN_MEMBERS;
}

// FOUNDER-REVIEW: authored — group delete confirmation; names the group and
// conversation count so the user sees what history is destroyed.
export function formatGroupDeleteConfirmation(
  groupName: string,
  conversationCount: number
): string {
  const label = groupName.trim() || "this group";
  if (conversationCount <= 0) {
    return `This deletes ${label}. There are no saved conversations on this group.`;
  }
  if (conversationCount === 1) {
    return `This deletes ${label} and 1 saved conversation.`;
  }
  return `This deletes ${label} and ${conversationCount} saved conversations.`;
}

/**
 * Person-delete confirmation. Names the person, each collapsing group with its
 * own conversation count (same voice as formatGroupDeleteConfirmation), and
 * any person/pair conversations that go with them.
 *
 * FOUNDER-REVIEW: authored — person delete side-effect on groups; each
 * collapsing group named with its saved conversation count.
 */
export function formatPersonDeleteConfirmation(input: {
  personName: string;
  collapsingGroups: CollapsingGroupPreview[];
  personConversationCount: number;
}): string {
  const who = input.personName.trim() || "this person";
  const sentences: string[] = [];

  if (input.personConversationCount <= 0) {
    sentences.push(`This deletes ${who}.`);
  } else if (input.personConversationCount === 1) {
    sentences.push(`This deletes ${who} and 1 saved conversation about them.`);
  } else {
    sentences.push(
      `This deletes ${who} and ${input.personConversationCount} saved conversations about them.`
    );
  }

  for (const group of input.collapsingGroups) {
    // Same sentences as formatGroupDeleteConfirmation; "also" marks the side effect.
    const groupLine = formatGroupDeleteConfirmation(group.name, group.conversationCount);
    sentences.push(groupLine.replace(/^This deletes /, "This also deletes "));
  }

  return sentences.join(" ");
}

export const OWNED_DELETE_COPY = {
  groupConfirmButton: "Delete group",
  groupConfirmingButton: "Deleting…",
  personConfirmButton: "Delete person",
  personConfirmingButton: "Deleting…",
  groupErrorGeneric: "We could not delete this group. Nothing was removed.",
  personErrorGeneric: "We could not delete this person. Nothing was removed.",
  belowMinimumNotice:
    "This group has fewer than three people, so a cohort reading cannot run. Add people or delete the group."
} as const;
