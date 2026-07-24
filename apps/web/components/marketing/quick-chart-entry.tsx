"use client";

/**
 * Slim Quick Chart entry on the marketing hero. Name + month/day/year only;
 * no BirthFields, no place search. Computes via POST /api/quick-chart and
 * reveals Sun/Moon inline — no navigation off the marketing page.
 */

import type { NatalChart } from "@galaxia/astro";
import { useState, type FormEvent } from "react";
import { MONTHS } from "../birth-fields";
import { NatalSignReveal } from "../natal-sign-reveal";
import { Spinner } from "../spinner";

type RevealResult = {
  chart: NatalChart;
  displayDate: string;
  birthPlace: string | null;
  birthDate: string;
};

export function QuickChartEntry() {
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RevealResult | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i);
  const monthNum = month ? Number(month) : 0;
  const yearNum = year ? Number(year) : 0;
  const daysInMonth =
    monthNum && yearNum ? new Date(yearNum, monthNum, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function fullChartHrefFor(m: number, d: number, y: number, displayName: string): string {
    const params = new URLSearchParams({
      pr: "date",
      m: String(m),
      d: String(d),
      y: String(y),
    });
    if (displayName) params.set("name", displayName);
    return `/chart?${params.toString()}`;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const m = Number(month);
    const d = Number(day);
    const y = Number(year);
    if (!m || !d || !y) {
      // FOUNDER-REVIEW: authored - mini-form validation.
      setError("Add a month, day, and year to see the chart.");
      return;
    }
    if (d > new Date(y, m, 0).getDate()) {
      // FOUNDER-REVIEW: authored - mini-form validation.
      setError("That day is not in the month you picked.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quick-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { precision: "date", month: m, day: d, year: y },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        // FOUNDER-REVIEW: authored - mini-form compute failure.
        setError(typeof body.error === "string" ? body.error : "Could not compute that chart.");
        return;
      }
      setResult({
        chart: body.chart,
        displayDate: body.displayDate,
        birthPlace: body.birthPlace ?? null,
        birthDate: body.birthDate,
      });
    } catch {
      // FOUNDER-REVIEW: authored - mini-form network failure.
      setError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function tryAnother() {
    setResult(null);
    setError(null);
  }

  const trimmedName = name.trim();
  const fullChartHref =
    result && month && day && year
      ? fullChartHrefFor(Number(month), Number(day), Number(year), trimmedName)
      : undefined;

  return (
    <div className="quick-chart-entry glass-card fade-in fade-in-delay-3">
      {/* FOUNDER-REVIEW: authored - hero Quick Chart entry framing. */}
      <div className="quick-chart-entry-copy">
        <span className="eyebrow">Try it free</span>
        <h2 className="quick-chart-entry-h">See someone&rsquo;s real chart.</h2>
        <p className="quick-chart-entry-lede">
          Enter a name and birthday. No signup. You get a real computed chart, not a daily horoscope.
        </p>
      </div>

      {result ? (
        <div className="quick-chart-entry-result">
          <NatalSignReveal
            chart={result.chart}
            displayDate={result.displayDate}
            birthPlace={result.birthPlace}
            name={trimmedName || undefined}
            birthDate={result.birthDate}
            birthPrecision="date"
            fullChartHref={fullChartHref}
            signupHref="/signup"
            className="quick-chart-entry-reveal"
          />
          <button type="button" className="pill-link quick-chart-entry-again" onClick={tryAnother}>
            {/* FOUNDER-REVIEW: authored - reset mini-form after inline reveal. */}
            Try another birthday
          </button>
        </div>
      ) : (
        <form className="quick-chart-entry-form" onSubmit={onSubmit} noValidate>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Their name (optional)"
            autoComplete="off"
            aria-label="Name (optional)"
            disabled={loading}
          />
          <div className="quick-chart-entry-dates">
            <select
              className="field"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Birth month"
              required
              disabled={loading}
            >
              <option value="">Month</option>
              {MONTHS.map((label, i) => (
                <option key={label} value={String(i + 1)}>{label}</option>
              ))}
            </select>
            <select
              className="field"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              aria-label="Birth day"
              required
              disabled={loading}
            >
              <option value="">Day</option>
              {days.map((n) => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </select>
            <select
              className="field"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              aria-label="Birth year"
              required
              disabled={loading}
            >
              <option value="">Year</option>
              {years.map((n) => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ gap: 8 }}>
            {loading ? <Spinner size={13} color="#1a1206" /> : null}
            {/* FOUNDER-REVIEW: authored - mini-form pending label. */}
            {loading ? "Computing…" : "See the chart"}
          </button>
          {error ? <p className="error quick-chart-entry-error">{error}</p> : null}
        </form>
      )}
    </div>
  );
}
