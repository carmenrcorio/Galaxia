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
 * Person-delete confirmation when one or more cohorts collapse with them.
 * FOUNDER-REVIEW: authored — person delete side-effect on groups.
 */
export function formatPersonDeleteConfirmation(input: {
  personName: string;
  collapsingGroupNames: string[];
  conversationCount: number;
}): string {
  const who = input.personName.trim() || "this person";
  const parts: string[] = [`This deletes ${who}`];

  if (input.collapsingGroupNames.length === 1) {
    parts.push(`and the group “${input.collapsingGroupNames[0]}” (it would drop below three people)`);
  } else if (input.collapsingGroupNames.length > 1) {
    const listed = input.collapsingGroupNames.map((n) => `“${n}”`).join(", ");
    parts.push(
      `and ${input.collapsingGroupNames.length} groups that would drop below three people (${listed})`
    );
  }

  if (input.conversationCount === 1) {
    parts.push("plus 1 saved conversation");
  } else if (input.conversationCount > 1) {
    parts.push(`plus ${input.conversationCount} saved conversations`);
  }

  return `${parts.join(", ")}.`;
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
