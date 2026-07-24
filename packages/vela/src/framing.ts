/**
 * Conversational framing for Vela — exactly one mode per request.
 * Safety (shared-mode block, relationshipType allowlist) is a separate job.
 *
 * Person tags are user-relative: "child" means the user's child.
 * Do not key on a "parent" tag. Absence of a child tag → no parenting mode.
 */

export type VelaFramingMode =
  | { kind: "group"; groupName: string }
  | { kind: "parenting"; subjectName: string }
  | { kind: "third_person_minor"; subjectName: string }
  | { kind: "default" };

export type VelaFramingSubject = {
  name: string;
  /** people.relation — user-relative tag */
  relation: string | null | undefined;
  isMinor: boolean;
};

export type ResolveVelaFramingModeInput = {
  isGroupScope: boolean;
  groupName: string | null | undefined;
  /** Single-subject focus. Ignored when isGroupScope. */
  subject: VelaFramingSubject | null;
};

/** True when the person tag means the user is this person's parent. */
export function isUserChildTag(relation: string | null | undefined): boolean {
  return (relation ?? "").trim().toLowerCase() === "child";
}

/**
 * Compute framing once. Group scope always wins. Parenting requires a minor
 * subject tagged "child". Any other minor subject → third-person minor.
 * Adults / no subject → default (no special framing block).
 */
export function resolveVelaFramingMode(input: ResolveVelaFramingModeInput): VelaFramingMode {
  if (input.isGroupScope) {
    const name = (input.groupName ?? "").trim();
    return { kind: "group", groupName: name || "this group" };
  }
  const subject = input.subject;
  if (subject?.isMinor) {
    if (isUserChildTag(subject.relation)) {
      return { kind: "parenting", subjectName: subject.name };
    }
    return { kind: "third_person_minor", subjectName: subject.name };
  }
  return { kind: "default" };
}

// FOUNDER-REVIEW: authored — Vela group framing block (prompt injection).
export function groupFramingBlock(groupName: string): string {
  return `You are answering about the group "${groupName}". "We" and "this group" mean every member listed in people and cohort.members. Speak about all of them by name. Never ask who "we" refers to.`;
}

// FOUNDER-REVIEW: authored — Vela parenting framing block (prompt injection).
export function parentingFramingBlock(subjectName: string): string {
  return `This is a parenting conversation about ${subjectName}, who is a minor and tagged as the user's child. Coach the user as their parent. Never address ${subjectName} directly.`;
}

// FOUNDER-REVIEW: authored — Vela third-person-minor framing block (prompt injection).
export function thirdPersonMinorFramingBlock(subjectName: string): string {
  return `You are speaking with the user about ${subjectName}, who is a minor. Speak about ${subjectName} in the third person. Never address them directly. Do not assume the user is their parent and do not coach the user as a parent.`;
}

/**
 * Exactly one framing block (or empty for default). Bad dual-instruction
 * states are unconstructable — callers inject only this string.
 */
export function velaFramingBlock(mode: VelaFramingMode): string {
  switch (mode.kind) {
    case "group":
      return groupFramingBlock(mode.groupName);
    case "parenting":
      return parentingFramingBlock(mode.subjectName);
    case "third_person_minor":
      return thirdPersonMinorFramingBlock(mode.subjectName);
    case "default":
      return "";
  }
}
