"use client";

/**
 * Slim Quick Chart entry on the marketing hero. Name + month/day/year only;
 * no BirthFields, no place search. Hands off to /chart with birth query params
 * (and optional name for local display). /chart auto-runs from those params.
 */

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MONTHS } from "../birth-fields";

export function QuickChartEntry() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i);
  const monthNum = month ? Number(month) : 0;
  const yearNum = year ? Number(year) : 0;
  const daysInMonth =
    monthNum && yearNum ? new Date(yearNum, monthNum, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function onSubmit(e: FormEvent) {
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
    const params = new URLSearchParams({
      pr: "date",
      m: String(m),
      d: String(d),
      y: String(y),
    });
    const trimmed = name.trim();
    if (trimmed) params.set("name", trimmed);
    router.push(`/chart?${params.toString()}`);
  }

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
      <form className="quick-chart-entry-form" onSubmit={onSubmit} noValidate>
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Their name (optional)"
          autoComplete="off"
          aria-label="Name (optional)"
        />
        <div className="quick-chart-entry-dates">
          <select
            className="field"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Birth month"
            required
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
          >
            <option value="">Year</option>
            {years.map((n) => (
              <option key={n} value={String(n)}>{n}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          See the chart
        </button>
        {error ? <p className="error quick-chart-entry-error">{error}</p> : null}
      </form>
    </div>
  );
}
