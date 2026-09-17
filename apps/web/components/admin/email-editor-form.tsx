"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomCheck } from "../custom-check";
import type { EmailCopy } from "../../lib/email-copy";
import { fillTemplate, previewVarsForKind } from "../../lib/email-copy";
import {
  EMAIL_CTA_PATH_KEYS,
  EMAIL_CTA_PATH_LABELS,
  type EmailCtaPathKey,
  type EmailEditableField,
  type EmailKind
} from "../../lib/email-kinds";

function paragraphsToEditor(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

function paragraphsFromEditor(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Edit one automation (or inspect a GoTrue system email). Saves through
 * PATCH /api/admin/emails/[kind]; send-to-me through POST .../test.
 */
export function EmailEditorForm({
  kind,
  category,
  editableFields,
  enabled: initialEnabled,
  copy: initialCopy,
  canTest
}: {
  kind: EmailKind;
  category: "automation" | "system";
  editableFields: EmailEditableField[];
  enabled: boolean;
  copy: EmailCopy;
  canTest: boolean;
}) {
  const router = useRouter();
  const readOnly = category === "system" || editableFields.length === 0;
  const [subject, setSubject] = useState(initialCopy.subject);
  const [preview, setPreview] = useState(initialCopy.preview);
  const [paragraphs, setParagraphs] = useState(paragraphsToEditor(initialCopy.paragraphs));
  const [ctaLabel, setCtaLabel] = useState(initialCopy.ctaLabel ?? "");
  const [ctaPathKey, setCtaPathKey] = useState<EmailCtaPathKey | "">(initialCopy.ctaPathKey ?? "");
  const [firstEmailLine, setFirstEmailLine] = useState(initialCopy.firstEmailLine ?? "");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const vars = previewVarsForKind(kind);
  const liveCopy: EmailCopy = {
    subject,
    preview,
    paragraphs: paragraphsFromEditor(paragraphs),
    ctaLabel: ctaLabel.trim() ? ctaLabel : null,
    ctaPathKey: ctaPathKey || null,
    firstEmailLine: firstEmailLine.trim() ? firstEmailLine : null
  };

  function canEdit(field: EmailEditableField): boolean {
    return !readOnly && editableFields.includes(field);
  }

  async function onSave() {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/emails/${encodeURIComponent(kind)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: liveCopy.subject,
          preview: liveCopy.preview,
          paragraphs: liveCopy.paragraphs,
          ctaLabel: liveCopy.ctaLabel,
          ctaPathKey: liveCopy.ctaPathKey,
          firstEmailLine: liveCopy.firstEmailLine,
          enabled
        })
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Couldn't save this email. Please try again.");
        return;
      }
      setNotice("Saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onSendTest() {
    setError(null);
    setNotice(null);
    setTesting(true);
    try {
      const res = await fetch(`/api/admin/emails/${encodeURIComponent(kind)}/test`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string; to?: string };
      if (!res.ok) {
        setError(body.error ?? "Couldn't send the test. Please try again.");
        return;
      }
      setNotice(body.to ? `Sent to ${body.to}.` : "Sent.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {category === "automation" ? (
        <CustomCheck
          checked={!enabled}
          onChange={(paused) => setEnabled(!paused)}
          label="Pause this email. The next cron run will skip it."
          id="email-pause"
        />
      ) : (
        <p className="muted">
          Sign-in emails are edited in Supabase Auth, not here. Resend a confirmation or password reset from a user&apos;s admin page.
        </p>
      )}

      {canEdit("subject") || readOnly ? (
        <label className="muted" style={{ display: "grid", gap: 6 }}>
          Subject
          <input
            className="field"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={!canEdit("subject")}
          />
        </label>
      ) : null}

      {canEdit("preview") || readOnly ? (
        <label className="muted" style={{ display: "grid", gap: 6 }}>
          Preview
          <input
            className="field"
            value={preview}
            onChange={(event) => setPreview(event.target.value)}
            disabled={!canEdit("preview")}
          />
        </label>
      ) : null}

      {canEdit("paragraphs") ? (
        <label className="muted" style={{ display: "grid", gap: 6 }}>
          Paragraphs
          <textarea
            className="field field--rect"
            rows={10}
            value={paragraphs}
            onChange={(event) => setParagraphs(event.target.value)}
          />
          <span>Blank line between paragraphs. Use {"{{name}}"} for a filled value, and **bold** for emphasis.</span>
        </label>
      ) : null}

      {canEdit("first_email_line") ? (
        <label className="muted" style={{ display: "grid", gap: 6 }}>
          First-email line
          <input
            className="field"
            value={firstEmailLine}
            onChange={(event) => setFirstEmailLine(event.target.value)}
          />
        </label>
      ) : null}

      {canEdit("cta_label") || canEdit("cta_path_key") ? (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          {canEdit("cta_label") ? (
            <label className="muted" style={{ display: "grid", gap: 6 }}>
              Button label
              <input
                className="field"
                value={ctaLabel}
                onChange={(event) => setCtaLabel(event.target.value)}
              />
            </label>
          ) : null}
          {canEdit("cta_path_key") ? (
            <label className="muted" style={{ display: "grid", gap: 6 }}>
              Button path
              <select
                className="field field--rect"
                value={ctaPathKey}
                onChange={(event) => setCtaPathKey(event.target.value as EmailCtaPathKey | "")}
              >
                <option value="">None</option>
                {EMAIL_CTA_PATH_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {EMAIL_CTA_PATH_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {kind === "nudge.sky_today" || kind === "letter.weekly" || kind === "chart.reading" ? (
        <p className="muted">
          The sky sentence, letter portraits, and chart placements are computed at send time and cannot be edited here.
        </p>
      ) : null}

      <div className="glass-card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <p className="eyebrow">Preview with sample names</p>
        <p style={{ margin: 0, color: "var(--cream)" }}>{fillTemplate(liveCopy.subject, vars, "text")}</p>
        <p className="muted" style={{ margin: 0 }}>{fillTemplate(liveCopy.preview, vars, "text")}</p>
        {liveCopy.paragraphs.map((paragraph, index) => (
          <p key={index} className="muted" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {fillTemplate(paragraph.replaceAll("{{builtList}}", vars.builtListText ?? ""), vars, "text")}
          </p>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="success">{notice}</p> : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {category === "automation" ? (
          <button type="button" className="pill-link--gold" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
        {canTest ? (
          <button type="button" className="pill-link" onClick={onSendTest} disabled={testing}>
            {testing ? "Sending…" : "Send to me"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
