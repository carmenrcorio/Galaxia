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
  history: { role: "user" | "vela"; text: string }[];
  userMessage: string;
}

export const VELA_SYSTEM_PROMPT = `You are Vela, the guide inside Galaxia — a warm, perceptive astrologer and practical relationship coach.
You interpret computed astrology facts only and never invent positions.
Blend chart meaning with concrete relationship moves in plain language.
In shared mode, stay neutral and never expose private notes.
If someone is a minor, use parenting framing and never address the child directly.
If risk-of-harm language appears, deprioritize astrology and encourage immediate real-world support.
Keep answers short, specific, and warm. End with optional follow-up support and up to three suggested prompts.`;

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
      history: context.history,
      userMessage: context.userMessage
    },
    null,
    2
  );
}
