/**
 * Shipped email copy and the interpolator used by the admin editor and by
 * crons when a published email_templates row exists. Computed bodies
 * (nudge copy_resolved, letter portraits, chart placements) are never
 * stored here.
 *
 * Variable syntax is `{{name}}` only. Unknown names fail validation on
 * save and render as empty at send time so a typo cannot leak braces to
 * an inbox. `{{builtList}}` is the one raw-HTML slot (day 11 counts).
 * `**word**` becomes the cream <strong> used in the existing Compare line.
 */

import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
import {
  type AutomationEmailKind,
  type EmailCtaPathKey,
  type EmailEditableField,
  type EmailKind,
  type TrialEmailKind,
  isEmailCtaPathKey
} from "./email-kinds";

export interface EmailCopy {
  subject: string;
  preview: string;
  paragraphs: string[];
  ctaLabel: string | null;
  ctaPathKey: EmailCtaPathKey | null;
  firstEmailLine: string | null;
}

export const EMAIL_VAR_RE = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g;

const RAW_HTML_VARS = new Set(["builtList"]);

const LAYER_ONE_SUBJECT_START =
  /^(astrology|sky|galaxy|natal|synastry|horoscope|transit|venus|mars|moon)\b/i;

export const ALLOWED_TEMPLATE_VARS: Record<AutomationEmailKind, readonly string[]> = {
  "trial.day1": ["greeting", "circleSubject", "addedName", "personName", "trialEndDate", "peopleCount"],
  "trial.day4_one": ["greeting", "onePersonLine", "personName", "peopleCount"],
  "trial.day4_multi": ["greeting", "needSubject", "personName", "peopleCount"],
  "trial.day11": [
    "greeting",
    "trialEndDate",
    "peopleCount",
    "notesCount",
    "threadsCount",
    "groupsCount",
    "builtList",
    "builtListText"
  ],
  "trial.day14": ["greeting", "peopleCount", "helpEmail"],
  "nudge.sky_today": ["greeting", "subjectPersonName", "copyResolved", "firstEmailLine"],
  "letter.weekly": ["greeting", "letterSubject", "opening"],
  "chart.reading": ["chartSubject"]
};

export const DEFAULT_EMAIL_COPY: Record<AutomationEmailKind, EmailCopy> = {
  "trial.day1": {
    subject: "{{circleSubject}}",
    preview: "Add one more person. A year is enough.",
    paragraphs: [
      "You've added {{addedName}}.",
      "Add one more person. A date is enough. A year is enough.",
      "Your trial runs through {{trialEndDate}}. Nothing will be charged before then."
    ],
    ctaLabel: "Add someone else →",
    ctaPathKey: "welcome",
    firstEmailLine: null
  },
  "trial.day4_multi": {
    subject: "{{needSubject}}",
    preview: "Open Compare. It's built from their charts.",
    paragraphs: [
      "You've mapped {{peopleCount}} people.",
      "Open **Compare**, choose two of them, and read what they need from you. It's built from their actual placements."
    ],
    ctaLabel: "Compare two people →",
    ctaPathKey: "compare",
    firstEmailLine: null
  },
  "trial.day4_one": {
    subject: "Add one more person",
    preview: "A date works. A year works.",
    paragraphs: [
      "{{onePersonLine}}",
      "Add someone you actually live beside. A date works. A year works."
    ],
    ctaLabel: "Add someone →",
    ctaPathKey: "welcome",
    firstEmailLine: null
  },
  "trial.day11": {
    subject: "Your trial ends {{trialEndDate}}",
    preview: "Nothing will be charged. Everything stays saved.",
    paragraphs: [
      "Your trial ends on {{trialEndDate}}. We never asked for a card, so nothing will be charged. When it ends, access pauses until you choose to continue.",
      "Here's what you've built:",
      "{{builtList}}",
      "All of it stays saved. If you continue, it's exactly where you left it."
    ],
    ctaLabel: "Continue with Galaxia →",
    ctaPathKey: "subscribe",
    firstEmailLine: null
  },
  "trial.day14": {
    subject: "Your people are still here",
    preview: "Nothing was deleted. Come back whenever.",
    paragraphs: [
      "Your trial has ended. We haven't charged you.",
      "Everything you built is saved. {{peopleCount}} people, your notes, your charts. Nothing has been deleted.",
      `If it wasn't right, one line to {{helpEmail}} is enough. It goes to the person who built this.`
    ],
    ctaLabel: "Pick up where you left off →",
    ctaPathKey: "app",
    firstEmailLine: null
  },
  "nudge.sky_today": {
    subject: "{{subjectPersonName}}, today",
    preview: "One note on how to show up for them.",
    paragraphs: ["For **{{subjectPersonName}}** today:", "{{copyResolved}}"],
    ctaLabel: "Open Galaxia →",
    ctaPathKey: "app",
    firstEmailLine:
      "You're getting this because you're a Galaxia member. Turn it off any time from the link below."
  },
  "letter.weekly": {
    subject: "{{letterSubject}}",
    preview: "Who in your circle has something real moving.",
    paragraphs: [],
    ctaLabel: "open this week in Galaxia",
    ctaPathKey: "app",
    firstEmailLine: null
  },
  "chart.reading": {
    subject: "{{chartSubject}}",
    preview: "Three placements, in the words we already have.",
    paragraphs: [],
    ctaLabel: null,
    ctaPathKey: null,
    firstEmailLine: null
  }
};

export function trialEmailKindToCopyKind(kind: TrialEmailKind): AutomationEmailKind {
  return `trial.${kind}`;
}

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function collectTemplateVars(copy: EmailCopy): string[] {
  const found = new Set<string>();
  const scan = (text: string | null | undefined) => {
    if (!text) return;
    for (const match of text.matchAll(EMAIL_VAR_RE)) {
      if (match[1]) found.add(match[1]);
    }
  };
  scan(copy.subject);
  scan(copy.preview);
  scan(copy.ctaLabel);
  scan(copy.firstEmailLine);
  for (const paragraph of copy.paragraphs) scan(paragraph);
  return [...found];
}

export function fillTemplate(input: string, vars: Record<string, string>, mode: "html" | "text"): string {
  return input.replace(EMAIL_VAR_RE, (_, key: string) => {
    const value = vars[key] ?? "";
    if (mode === "html" && RAW_HTML_VARS.has(key)) return value;
    if (mode === "html") return emphasizeHtml(escapeEmailHtml(value));
    return value;
  });
}

function emphasizeHtml(escaped: string): string {
  return escaped.replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="color:#F4ECDB">$1</strong>'
  );
}

export function emphasizeParagraphHtml(raw: string, vars: Record<string, string>): string {
  if (raw.includes("{{builtList}}")) {
    return fillTemplate(raw, vars, "html");
  }
  const filled = fillTemplate(raw, vars, "text");
  return emphasizeHtml(escapeEmailHtml(filled));
}

export interface EmailCopyIssue {
  field: string;
  message: string;
}

const EM_DASH = "\u2014";

export function validateEmailCopy(
  kind: EmailKind,
  copy: EmailCopy,
  editable: readonly EmailEditableField[]
): EmailCopyIssue[] {
  const issues: EmailCopyIssue[] = [];
  const check = (field: string, value: string | null) => {
    if (!value) return;
    if (value.includes(EM_DASH)) {
      issues.push({ field, message: "Em dashes are not used in Galaxia copy. Rewrite the sentence." });
    }
  };

  if (editable.includes("subject")) {
    const subject = copy.subject.trim();
    if (!subject) issues.push({ field: "subject", message: "Subject is required." });
    check("subject", subject);
    const filledProbe = fillTemplate(subject, previewVarsForKind(kind), "text").trim();
    if (filledProbe && LAYER_ONE_SUBJECT_START.test(filledProbe)) {
      issues.push({
        field: "subject",
        message: "The subject has to lead with a person or an outcome, not an astrology word."
      });
    }
  }
  if (editable.includes("preview")) {
    if (!copy.preview.trim()) issues.push({ field: "preview", message: "Preview is required." });
    check("preview", copy.preview);
  }
  if (editable.includes("cta_label") && copy.ctaLabel) check("cta_label", copy.ctaLabel);
  if (editable.includes("first_email_line") && copy.firstEmailLine) check("first_email_line", copy.firstEmailLine);
  if (editable.includes("paragraphs")) {
    for (const paragraph of copy.paragraphs) check("paragraphs", paragraph);
    if (copy.paragraphs.every((p) => !p.trim()) && kind.startsWith("trial.")) {
      issues.push({ field: "paragraphs", message: "At least one paragraph is required." });
    }
  }
  if (editable.includes("cta_path_key") && copy.ctaPathKey && !isEmailCtaPathKey(copy.ctaPathKey)) {
    issues.push({ field: "cta_path_key", message: "Choose a Galaxia path for the button." });
  }

  const allowed =
    kind in ALLOWED_TEMPLATE_VARS ? ALLOWED_TEMPLATE_VARS[kind as AutomationEmailKind] : [];
  const allowedSet = new Set(allowed);
  for (const name of collectTemplateVars(copy)) {
    if (kind.startsWith("auth.")) continue;
    if (kind === "campaign" as string) continue;
    if (!allowedSet.has(name) && kind !== ("campaign" as EmailKind)) {
      // campaign kinds are not in ALLOWED_TEMPLATE_VARS; handled below
    }
    if (allowed.length > 0 && !allowedSet.has(name)) {
      issues.push({
        field: "variables",
        message: `{{${name}}} is not a variable this email can fill.`
      });
    }
  }
  return issues;
}

export function validateCampaignCopy(copy: EmailCopy): EmailCopyIssue[] {
  const issues: EmailCopyIssue[] = [];
  if (!copy.subject.trim()) issues.push({ field: "subject", message: "Subject is required." });
  if (!copy.preview.trim()) issues.push({ field: "preview", message: "Preview is required." });
  if (copy.paragraphs.every((p) => !p.trim())) {
    issues.push({ field: "paragraphs", message: "At least one paragraph is required." });
  }
  for (const [field, value] of [
    ["subject", copy.subject],
    ["preview", copy.preview],
    ["cta_label", copy.ctaLabel ?? ""],
    ...copy.paragraphs.map((p) => ["paragraphs", p] as const)
  ]) {
    if (value.includes(EM_DASH)) {
      issues.push({ field, message: "Em dashes are not used in Galaxia copy. Rewrite the sentence." });
    }
  }
  const filled = fillTemplate(copy.subject, { firstName: "Sam" }, "text");
  if (LAYER_ONE_SUBJECT_START.test(filled)) {
    issues.push({
      field: "subject",
      message: "The subject has to lead with a person or an outcome, not an astrology word."
    });
  }
  const allowed = new Set(["firstName", "greeting"]);
  for (const name of collectTemplateVars(copy)) {
    if (!allowed.has(name)) {
      issues.push({ field: "variables", message: `{{${name}}} is not a variable this campaign can fill.` });
    }
  }
  if (copy.ctaPathKey && !isEmailCtaPathKey(copy.ctaPathKey)) {
    issues.push({ field: "cta_path_key", message: "Choose a Galaxia path for the button." });
  }
  return issues;
}

export function previewVarsForKind(kind: EmailKind): Record<string, string> {
  const greeting = "Hi Sam,";
  const builtItems = [
    ["3", "people"],
    ["2", "private notes, visible only to you"],
    ["1", "conversations with Vela"],
    ["1", "constellations you named"]
  ];
  const builtList = `<ul style="color:#b9aede;margin:0 0 14px;padding-left:18px">${builtItems
    .map(([n, label]) => `<li><strong style="color:#F4ECDB">${n}</strong> ${label}</li>`)
    .join("")}</ul>`;
  const builtListText = builtItems.map(([n, label]) => `- ${n} ${label}`).join("\n");
  const base: Record<string, string> = {
    greeting,
    firstName: "Sam",
    personName: "Riley",
    addedName: "Riley",
    circleSubject: "Riley is in your circle now",
    needSubject: "What Riley needs from you",
    onePersonLine: "You've added Riley. Almost nothing here works with one person.",
    peopleCount: "3",
    notesCount: "2",
    threadsCount: "1",
    groupsCount: "1",
    trialEndDate: "24 July",
    helpEmail: GALAXIA_HELP_EMAIL,
    builtList,
    builtListText,
    subjectPersonName: "Riley",
    copyResolved: "The daily note from the sky engine lands here.",
    firstEmailLine:
      "You're getting this because you're a Galaxia member. Turn it off any time from the link below.",
    letterSubject: "Riley, this week",
    opening: "This week's letter is about Riley. The rest of the circle is quiet.",
    chartSubject: "What a Cancer Moon actually does"
  };
  if (kind === "trial.day1") {
    // keep defaults
  }
  return base;
}

export function trialTemplateVars(input: {
  firstName: string | null;
  personName?: string;
  peopleCount: number;
  notesCount: number;
  threadsCount: number;
  groupsCount: number;
  trialEndDate: string;
}): Record<string, string> {
  const person = (input.personName ?? "").trim();
  const greeting = input.firstName?.trim() ? `Hi ${input.firstName.trim()},` : "Hi there,";
  const builtItems: [string, string][] = [
    [String(input.peopleCount), "people"],
    [String(input.notesCount), "private notes, visible only to you"],
    [String(input.threadsCount), "conversations with Vela"],
    [String(input.groupsCount), "constellations you named"]
  ];
  return {
    greeting,
    firstName: (input.firstName ?? "").trim(),
    personName: person,
    addedName: person || "someone",
    circleSubject: person ? `${person} is in your circle now` : "Someone is in your circle now",
    needSubject: person ? `What ${person} needs from you` : "What they need from you",
    onePersonLine: person
      ? `You've added ${person}. Almost nothing here works with one person.`
      : "Almost nothing here works with one person.",
    peopleCount: String(input.peopleCount),
    notesCount: String(input.notesCount),
    threadsCount: String(input.threadsCount),
    groupsCount: String(input.groupsCount),
    trialEndDate: input.trialEndDate,
    helpEmail: GALAXIA_HELP_EMAIL,
    builtList: `<ul style="color:#b9aede;margin:0 0 14px;padding-left:18px">${builtItems
      .map(([n, label]) => `<li><strong style="color:#F4ECDB">${n}</strong> ${label}</li>`)
      .join("")}</ul>`,
    builtListText: builtItems.map(([n, label]) => `- ${n} ${label}`).join("\n")
  };
}

export function parseParagraphs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
