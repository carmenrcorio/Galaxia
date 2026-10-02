import type { BirthFormInput } from "@galaxia/astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeChartLeadEmail, parseChartLeadBirthInput } from "./chart-lead";

/** Documented source values for chart_leads.source (see migration 20261002180200). */
export type ChartLeadSource = "homepage" | "chart" | "blog" | "welcome" | "free_chart";

export type UpsertChartLeadInput = {
  email: string;
  source: ChartLeadSource;
  /** When omitted, existing chart_data is preserved on update. */
  chartData?: BirthFormInput | null;
  /** Chart transit / save-by-email opt-in. */
  subscribed?: boolean;
  /** Galaxia Notes newsletter opt-in. */
  consentMarketing?: boolean;
};

export type UpsertChartLeadResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Creates or updates a chart_leads row (service-role client only).
 * Used by POST /api/chart-lead, POST /api/chart-lead/newsletter-signup, and
 * any server route that captures marketing or chart email consent.
 */
export async function upsertChartLead(
  supabase: SupabaseClient,
  input: UpsertChartLeadInput
): Promise<UpsertChartLeadResult> {
  const email = normalizeChartLeadEmail(input.email);
  let chartDataJson: Record<string, unknown> | null | undefined;
  if (input.chartData === null) {
    chartDataJson = null;
  } else if (input.chartData !== undefined) {
    chartDataJson = parseChartLeadBirthInput(input.chartData) as unknown as Record<string, unknown>;
  }

  const { data: existing, error: readError } = await supabase
    .from("chart_leads")
    .select("email, chart_data, subscribed, consent_marketing, source")
    .eq("email", email)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (existing) {
    const patch: Record<string, unknown> = { source: input.source };
    if (chartDataJson !== undefined) {
      patch.chart_data = chartDataJson;
    }
    if (input.subscribed !== undefined) {
      patch.subscribed = input.subscribed;
    }
    if (input.consentMarketing === true) {
      patch.consent_marketing = true;
    }
    const { error } = await supabase.from("chart_leads").update(patch).eq("email", email);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  const insertRow: Record<string, unknown> = {
    email,
    source: input.source,
    chart_data: chartDataJson ?? null,
    subscribed: input.subscribed ?? false,
    consent_marketing: input.consentMarketing ?? false,
  };

  const { error } = await supabase.from("chart_leads").insert(insertRow);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Blog newsletter box (parallel branch): email-only Galaxia Notes opt-in.
 * chart_data stays null; consent_marketing is set true.
 */
export async function submitNewsletterSignup(
  supabase: SupabaseClient,
  email: string
): Promise<UpsertChartLeadResult> {
  return upsertChartLead(supabase, {
    email,
    source: "blog",
    chartData: null,
    consentMarketing: true,
    subscribed: false,
  });
}
