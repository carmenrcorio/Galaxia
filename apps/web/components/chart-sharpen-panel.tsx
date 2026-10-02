"use client";

import type { BirthFormInput } from "@galaxia/astro";
import { track } from "@vercel/analytics/react";
import { useState } from "react";
import { BirthFields } from "./birth-fields";
import { Spinner } from "./spinner";

export function chartNeedsSharpen(input: BirthFormInput): boolean {
  if (input.precision === "year") return true;
  if (input.precision === "date") return true;
  if (input.precision === "exact") {
    const hasTime = input.hour !== undefined && input.minute !== undefined;
    const hasPlace = Boolean(input.birthPlace && input.lat && input.lng && input.tzOffsetMin != null);
    return !hasTime || !hasPlace;
  }
  return false;
}

export function ChartSharpenPanel({
  input,
  onChange,
  onApply,
  applying,
  idPrefix = "sharpen",
}: {
  input: BirthFormInput;
  onChange: (next: BirthFormInput) => void;
  onApply: (next: BirthFormInput) => void;
  applying: boolean;
  idPrefix?: string;
}) {
  const [phase, setPhase] = useState<2 | 3>(() =>
    input.precision === "exact" && input.hour !== undefined && input.minute !== undefined ? 3 : 2
  );

  function skipTime() {
    onChange({ ...input, precision: "date", hour: undefined, minute: undefined });
    setPhase(3);
  }

  function applyStep() {
    const working = phase === 2 ? { ...input, precision: "exact" as const } : input;
    if (phase === 2 && working.hour !== undefined && working.minute !== undefined) {
      track("birth_time_added");
      onChange(working);
      setPhase(3);
      return;
    }
    if (phase === 3 && working.birthPlace && working.lat && working.lng) {
      track("birth_place_added");
    }
    onApply(working);
  }

  return (
    <section className="glass-card fade-in" style={{ marginTop: 16, display: "grid", gap: 12 }}>
      {/* FOUNDER-REVIEW: "Sharpen your chart" */}
      <h2 style={{ color: "var(--cream)", fontFamily: "var(--serif)", fontSize: "1.1rem", margin: 0 }}>
        Sharpen your chart
      </h2>
      <p className="eyebrow" style={{ margin: 0 }}>
        Step {phase} of 3
      </p>
      {phase === 2 ? (
        <BirthFields
          input={{ ...input, precision: "exact" }}
          onChange={(next) => onChange({ ...next, precision: "exact" })}
          idPrefix={`${idPrefix}-time`}
          sections={{ precision: false, date: false, time: true, place: false }}
          showWhyTime
          onSkipExactTime={skipTime}
        />
      ) : (
        <BirthFields
          input={input}
          onChange={onChange}
          idPrefix={`${idPrefix}-place`}
          sections={{ precision: false, date: false, time: false, place: true }}
          showWhyPlace={input.precision === "exact"}
        />
      )}
      <button type="button" className="btn-primary" disabled={applying} style={{ gap: 8, justifySelf: "start" }} onClick={() => applyStep()}>
        {applying ? <Spinner size={13} color="#1a1206" /> : null}
        {/* FOUNDER-REVIEW: "Continue" / "Update chart" / "Updating…" */}
        {applying ? "Updating…" : phase === 2 ? "Continue" : "Update chart"}
      </button>
    </section>
  );
}
