"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MONTHS } from "../birth-fields";
import {
  CHART_READING_CONFIRMATION,
  CHART_READING_EMAIL_PLACEHOLDER,
  CHART_READING_FRAMING,
  CHART_READING_NAME_PLACEHOLDER,
  CHART_READING_NETWORK_ERROR,
  CHART_READING_PLACE_PLACEHOLDER,
  CHART_READING_SEND_FAILED,
  CHART_READING_SUBMIT
} from "../../lib/chart-reading-copy";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i);

export function ChartReadingCapture() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(CHART_READING_CONFIRMATION);

  const daysInMonth = useMemo(() => {
    if (!month || !year) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }, [month, year]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const response = await fetch("/api/blog/chart-reading-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          month: month ? Number(month) : undefined,
          day: day ? Number(day) : undefined,
          year: year ? Number(year) : undefined,
          birthPlace
        })
      });
      const body = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(body.error ?? CHART_READING_SEND_FAILED);
        setStatus("idle");
        return;
      }
      setConfirmation(body.message ?? CHART_READING_CONFIRMATION);
      setStatus("done");
    } catch {
      setError(CHART_READING_NETWORK_ERROR);
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <section className="article-chart-reading" aria-live="polite">
        <p className="article-chart-reading-confirm">{confirmation}</p>
      </section>
    );
  }

  return (
    <section className="article-chart-reading" aria-labelledby="chart-reading-framing">
      <p id="chart-reading-framing" className="article-chart-reading-framing">
        {CHART_READING_FRAMING}
      </p>
      <form onSubmit={submit} className="article-chart-reading-form">
        <input
          className="field"
          type="email"
          autoComplete="email"
          aria-label="Email"
          aria-describedby="chart-reading-framing"
          placeholder={CHART_READING_EMAIL_PLACEHOLDER}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="field"
          type="text"
          autoComplete="name"
          aria-label="Name"
          placeholder={CHART_READING_NAME_PLACEHOLDER}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="article-chart-reading-date">
          <select
            className="field"
            aria-label="Birth month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            <option value="">Month</option>
            {MONTHS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="field"
            aria-label="Birth day"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          >
            <option value="">Day</option>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            className="field"
            aria-label="Birth year"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            <option value="">Year</option>
            {YEARS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <input
          className="field"
          type="text"
          autoComplete="address-level2"
          aria-label="Birthplace"
          placeholder={CHART_READING_PLACE_PLACEHOLDER}
          value={birthPlace}
          onChange={(event) => setBirthPlace(event.target.value)}
        />
        <div className="article-chart-reading-actions">
          <button type="submit" className="btn-primary" disabled={status === "submitting"}>
            {CHART_READING_SUBMIT}
          </button>
          <Link href="/privacy" className="article-chart-reading-privacy">
            Privacy
          </Link>
        </div>
        {error ? <p className="article-chart-reading-error">{error}</p> : null}
      </form>
    </section>
  );
}
