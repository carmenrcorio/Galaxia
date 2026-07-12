export type VelaMode = "ask" | "shared";
export type Precision = "exact" | "date" | "year";

export interface VelaContextPerson {
  name: string;
  role: string;
  isMinor: boolean;
  precision: Precision;
  sun: string;
  moon: string | null;
  rising: string | null;
  venus: string;
  mars: string;
  traits: string;
  generational: {
    uranus: string;
    neptune: string;
    pluto: string;
    cohortLabel: string;
  };
}

export interface VelaContext {
  mode: VelaMode;
  parenting: boolean;
  relationshipType: string;
  user: { name: string };
  people: VelaContextPerson[];
  synastry?: {
    scores: Record<string, number>;
    flowAxis: string;
    frictionAxis: string;
  };
  generationalRelation?: {
    sameGeneration: boolean;
    shared: { planet: string; sign: string }[];
    diverged: { planet: string; signA: string; signB: string }[];
    theme: string;
  };
  cohort?: {
    sharedSky: { planet: string; sign: string }[];
    faultLines: { planet: string; groups: { sign: string; names: string[] }[] }[];
    members: string[];
  };
  privateNotesDigest?: string[];
  history: { role: "user" | "vela"; text: string }[];
  userMessage: string;
}

export interface BuildVelaContextInput extends Omit<VelaContext, "privateNotesDigest"> {
  privateNotes?: string[];
}

/** Remembrance Phase 2 — keep in sync with apps/web/lib/remembrance.ts `VELA_REMEMBRANCE_GUARDRAIL`. */
export const VELA_REMEMBRANCE_GUARDRAIL =
  "Draw only on the computed chart facts you are given and the owner's own saved reflections in the private notes digest. Never fabricate memories, events, or facts about the person. Do not invent what they said, did, or felt.";

export const VELA_SYSTEM_PROMPT = `You are Vela, the guide inside Galaxia — a warm, perceptive astrologer and practical relationship coach.
You interpret computed astrology facts only and never invent positions.
Blend chart meaning with concrete relationship moves in plain language.
In shared mode, stay neutral and never expose private notes.
If someone is a minor, use parenting framing and never address the child directly.
${VELA_REMEMBRANCE_GUARDRAIL}
Note: the private notes digest is a short recent sample (at most five), not full recall of every reflection.
If risk-of-harm language appears, deprioritize astrology and encourage immediate real-world support.
Keep answers short, specific, and warm. End with optional follow-up support and up to three suggested prompts.`;

export function buildVelaContext(input: BuildVelaContextInput): VelaContext {
  return {
    ...input,
    privateNotesDigest: input.mode === "ask" ? input.privateNotes?.slice(0, 5) : undefined
  };
}

export function buildVelaPrompt(context: VelaContext): string {
  return JSON.stringify(
    {
      system: VELA_SYSTEM_PROMPT,
      mode: context.mode,
      parenting: context.parenting,
      relationshipType: context.relationshipType,
      people: context.people,
      synastry: context.synastry,
      generationalRelation: context.generationalRelation,
      cohort: context.cohort,
      privateNotesDigest: context.mode === "ask" ? context.privateNotesDigest : undefined,
      history: context.history,
      userMessage: context.userMessage
    },
    null,
    2
  );
}

const crisisPattern =
  /\b(suicid(e|al)|kill myself|self harm|self-harm|hurt myself|end my life|want to die|homicid(e|al)|kill them|abuse)\b/i;

export function detectCrisisLanguage(text: string): boolean {
  return crisisPattern.test(text);
}

export * from "./parse";
