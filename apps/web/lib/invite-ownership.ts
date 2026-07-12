/**
 * Ownership guard for birth_data invites.
 * The invite's person_id must belong to the inviter (from_user) before any
 * service_role write — closes the cross-user invite write hole from the RLS audit.
 */
export function invitePersonOwnedByInviter(
  person: { owner_id: string } | null | undefined,
  fromUser: string
): boolean {
  return !!person && !!fromUser && person.owner_id === fromUser;
}
