"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailCopy } from "../../lib/email-copy";
import { fillTemplate } from "../../lib/email-copy";
import {
  CAMPAIGN_AUDIENCE_LABELS,
  CAMPAIGN_AUDIENCES,
  CAMPAIGN_SEND_CAP,
  EMAIL_CTA_PATH_KEYS,
  EMAIL_CTA_PATH_LABELS,
  type CampaignAudience,
  type CampaignStatus,
  type EmailCtaPathKey
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
 * Create or edit one admin-composed campaign. Writes through the guarded
 * /api/admin/campaigns routes. Send is a separate POST with a confirm.
 */
export function CampaignEditorForm({
  mode,
  campaign
}: {
  mode: "create" | "edit";
  campaign?: {
    id: string;
    name: string;
    status: CampaignStatus;
    audience: CampaignAudience;
    copy: EmailCopy;
  };
}) {
  const router = useRouter();
  const locked = campaign?.status === "sent" || campaign?.status === "sending";
  const [name, setName] = useState(campaign?.name ?? "");
  const [audience, setAudience] = useState<CampaignAudience>(campaign?.audience ?? "blog_chart_readings");
  const [subject, setSubject] = useState(campaign?.copy.subject ?? "");
  const [preview, setPreview] = useState(campaign?.copy.preview ?? "");
  const [paragraphs, setParagraphs] = useState(paragraphsToEditor(campaign?.copy.paragraphs ?? []));
  const [ctaLabel, setCtaLabel] = useState(campaign?.copy.ctaLabel ?? "Open Galaxia →");
  const [ctaPathKey, setCtaPathKey] = useState<EmailCtaPathKey | "">(campaign?.copy.ctaPathKey ?? "app");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const liveCopy: EmailCopy = {
    subject,
    preview,
    paragraphs: paragraphsFromEditor(paragraphs),
    ctaLabel: ctaLabel.trim() ? ctaLabel : null,
    ctaPathKey: ctaPathKey || null,
    firstEmailLine: null
  };
  const sampleVars = { firstName: "Sam", greeting: "Hi Sam," };

  async function onSave() {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const payload = {
        name,
        audience,
        subject: liveCopy.subject,
        preview: liveCopy.preview,
        paragraphs: liveCopy.paragraphs,
        ctaLabel: liveCopy.ctaLabel,
        ctaPathKey: liveCopy.ctaPathKey
      };
      const res = await fetch(mode === "create" ? "/api/admin/campaigns" : `/api/admin/campaigns/${campaign!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        campaign?: { id: string };
      };
      if (!res.ok) {
        setError(body.error ?? "Couldn't save the campaign. Please try again.");
        return;
      }
      if (mode === "create" && body.campaign?.id) {
        router.push(`/admin/emails/campaigns/${body.campaign.id}` as never);
        router.refresh();
        return;
      }
      setNotice("Saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onSendTest() {
    if (!campaign) return;
    setError(null);
    setNotice(null);
    setTesting(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true })
      });
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

  async function onSendCampaign() {
    if (!campaign) return;
    const confirmed = window.confirm(
      `Send this campaign to the whole audience? The cap is ${CAMPAIGN_SEND_CAP}. This cannot be undone.`
    );
    if (!confirmed) return;
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        sent?: number;
        failed?: number;
      };
      if (!res.ok) {
        setError(body.error ?? "Couldn't send the campaign. Please try again.");
        return;
      }
      setNotice(`Sent ${body.sent ?? 0}. Failed ${body.failed ?? 0}.`);
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {locked ? (
        <p className="muted">This campaign has been sent. Duplicate the copy into a new draft if you need to send again.</p>
      ) : null}

      <label className="muted" style={{ display: "grid", gap: 6 }}>
        Name
        <input className="field" value={name} onChange={(event) => setName(event.target.value)} disabled={locked} />
      </label>

      <label className="muted" style={{ display: "grid", gap: 6 }}>
        Audience
        <select
          className="field field--rect"
          value={audience}
          onChange={(event) => setAudience(event.target.value as CampaignAudience)}
          disabled={locked}
        >
          {CAMPAIGN_AUDIENCES.map((key) => (
            <option key={key} value={key}>
              {CAMPAIGN_AUDIENCE_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <label className="muted" style={{ display: "grid", gap: 6 }}>
        Subject
        <input className="field" value={subject} onChange={(event) => setSubject(event.target.value)} disabled={locked} />
      </label>

      <label className="muted" style={{ display: "grid", gap: 6 }}>
        Preview
        <input className="field" value={preview} onChange={(event) => setPreview(event.target.value)} disabled={locked} />
      </label>

      <label className="muted" style={{ display: "grid", gap: 6 }}>
        Paragraphs
        <textarea
          className="field field--rect"
          rows={10}
          value={paragraphs}
          onChange={(event) => setParagraphs(event.target.value)}
          disabled={locked}
        />
        <span>Blank line between paragraphs. {"{{firstName}}"} and {"{{greeting}}"} are filled per recipient.</span>
      </label>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <label className="muted" style={{ display: "grid", gap: 6 }}>
          Button label
          <input className="field" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} disabled={locked} />
        </label>
        <label className="muted" style={{ display: "grid", gap: 6 }}>
          Button path
          <select
            className="field field--rect"
            value={ctaPathKey}
            onChange={(event) => setCtaPathKey(event.target.value as EmailCtaPathKey | "")}
            disabled={locked}
          >
            <option value="">None</option>
            {EMAIL_CTA_PATH_KEYS.map((key) => (
              <option key={key} value={key}>
                {EMAIL_CTA_PATH_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="glass-card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <p className="eyebrow">Preview with sample names</p>
        <p style={{ margin: 0, color: "var(--cream)" }}>{fillTemplate(liveCopy.subject, sampleVars, "text")}</p>
        <p className="muted" style={{ margin: 0 }}>{fillTemplate(liveCopy.preview, sampleVars, "text")}</p>
        {liveCopy.paragraphs.map((paragraph, index) => (
          <p key={index} className="muted" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {fillTemplate(paragraph, sampleVars, "text")}
          </p>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="success">{notice}</p> : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {!locked ? (
          <button type="button" className="pill-link--gold" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create draft" : "Save"}
          </button>
        ) : null}
        {mode === "edit" ? (
          <button type="button" className="pill-link" onClick={onSendTest} disabled={testing}>
            {testing ? "Sending…" : "Send to me"}
          </button>
        ) : null}
        {mode === "edit" && !locked ? (
          <button type="button" className="pill-link" onClick={onSendCampaign} disabled={sending}>
            {sending ? "Sending…" : "Send campaign"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
