"use client";

/**
 * Month / day / year `<select>` row shared by BirthFields and the landing
 * mini-form. Kept free of `@galaxia/astro` so the homepage first-load graph
 * stays light (see lib/first-screen-lcp-visibility.test.ts).
 */

import { useMemo } from "react";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Closed select styling: placeholder options read lighter than a chosen value. */
export function birthSelectClass(value: string | number | undefined | null): string {
  const unset = value === "" || value === undefined || value === null;
  return unset ? "field field--placeholder" : "field";
}

export type BirthDateSelectsProps = {
  month?: number;
  day?: number;
  year?: number;
  onMonthChange: (month: number | undefined) => void;
  onDayChange: (day: number | undefined) => void;
  onYearChange: (year: number | undefined) => void;
  idPrefix?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  showLabel?: boolean;
};

export function BirthDateSelects({
  month,
  day,
  year,
  onMonthChange,
  onDayChange,
  onYearChange,
  idPrefix = "birth",
  disabled = false,
  required = false,
  className,
  showLabel = true,
}: BirthDateSelectsProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i);
  const daysInMonth = useMemo(() => {
    if (!month || !year) return 31;
    return new Date(year, month, 0).getDate();
  }, [month, year]);

  return (
    <div>
      {showLabel ? (
        <p className="helper-text" style={{ marginBottom: 5 }}>Birth date</p>
      ) : null}
      <div
        className={className ?? "birth-date-selects"}
        style={
          className
            ? undefined
            : { display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 6 }
        }
      >
        <select
          className={birthSelectClass(month)}
          id={`${idPrefix}-month`}
          name={`${idPrefix}-month`}
          aria-label="Birth month"
          value={month ?? ""}
          required={required}
          disabled={disabled}
          onChange={(e) => onMonthChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
        >
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          className={birthSelectClass(day)}
          id={`${idPrefix}-day`}
          name={`${idPrefix}-day`}
          aria-label="Birth day"
          value={day ?? ""}
          required={required}
          disabled={disabled}
          onChange={(e) => onDayChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
        >
          <option value="">Day</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          className={birthSelectClass(year)}
          id={`${idPrefix}-year`}
          name={`${idPrefix}-year`}
          aria-label="Birth year"
          value={year ?? ""}
          required={required}
          disabled={disabled}
          onChange={(e) => onYearChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
