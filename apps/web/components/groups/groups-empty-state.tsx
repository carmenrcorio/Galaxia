"use client";

/**
 * Groups landing when the user has no saved groups.
 *
 * Fewer than three people: a labelled example reading (precomputed
 * charts, fictional names) above the create requirement and an add-person
 * link. Three or more people: skip the example and offer one tap to build
 * a group from the people they already have, named (capped at eight).
 */

import { sunSignFromChart } from "@galaxia/core";
import Link from "next/link";
import { useState } from "react";
import { EMPTY_STATE_WELCOME_HREF } from "../../lib/nav-links";
import {
  GROUPS_CREATE_REQUIREMENT,
  GROUPS_EMPTY_ADD_SOMEONE,
  GROUPS_EMPTY_BUILD_THIS_GROUP,
  GROUPS_EXAMPLE_BADGE,
  GROUPS_EXAMPLE_NOTICE,
  GROUPS_EXAMPLE_TITLE,
  groupsEmptyBuildWith,
  groupsEmptyPeopleStatus,
  groupsEmptyPrefillPeople,
} from "../../lib/groups-copy";
import { exampleGroupReading } from "../../lib/groups-example";
import { AddPersonForm, AskAfterAdd, type AddPersonSavedInfo } from "../add-person-form";
import { InitialAvatar } from "../initial-avatar";
import { GroupReadingBody } from "./group-reading-body";

export interface EmptyStatePerson {
  id: string;
  display_name: string;
  sunSign?: string | null;
  passed_at?: string | null;
}

interface GroupsEmptyStateProps {
  people: EmptyStatePerson[];
  onBuildWithPeople: (personIds: string[]) => void;
  userId?: string | null;
  onPersonAdded?: (info: AddPersonSavedInfo) => void;
}

export function GroupsEmptyState({ people, onBuildWithPeople, userId, onPersonAdded }: GroupsEmptyStateProps) {
  const [saved, setSaved] = useState<AddPersonSavedInfo | null>(null);
  if (people.length >= 3) {
    const prefill = groupsEmptyPrefillPeople(people);
    const names = prefill.map((p) => p.display_name);
    return (
      <section className="glass-card fade-in" aria-label="Build a group from your people">
        <p className="card-title" style={{ marginBottom: 8 }}>{groupsEmptyBuildWith(names)}</p>
        <div className="avatar-cluster" style={{ marginBottom: 14 }}>
          {prefill.map((p) => (
            <InitialAvatar
              key={p.id}
              name={p.display_name}
              personId={p.id}
              sunSign={p.sunSign}
              memorial={Boolean(p.passed_at)}
            />
          ))}
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => onBuildWithPeople(prefill.map((p) => p.id))}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {GROUPS_EMPTY_BUILD_THIS_GROUP}
        </button>
      </section>
    );
  }

  const example = exampleGroupReading();
  const status = groupsEmptyPeopleStatus(people.length);

  return (
    <>
      <section className="glass-card fade-in" aria-label="Example group reading">
        <p className="eyebrow" style={{ marginBottom: 8 }}>{GROUPS_EXAMPLE_BADGE}</p>
        <h2 className="page-title" style={{ marginBottom: 10 }}>{GROUPS_EXAMPLE_TITLE}</h2>
        <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, marginBottom: 14 }}>
          {GROUPS_EXAMPLE_NOTICE}
        </p>
        <div className="avatar-cluster" style={{ marginBottom: 10 }}>
          {example.chartGridMembers.map((m) => (
            <InitialAvatar
              key={m.id}
              name={m.name}
              personId={m.id}
              sunSign={sunSignFromChart(m.chart)}
            />
          ))}
        </div>
        <p className="muted" style={{ fontSize: ".82rem", marginBottom: 14 }}>{example.memberNames.join(", ")}</p>
        <p style={{ fontStyle: "italic", color: "var(--cream)", fontSize: "1rem", lineHeight: 1.5, margin: 0 }}>
          {example.overlay.label}
        </p>
      </section>

      <GroupReadingBody
        cohort={example}
        chartGridMembers={example.chartGridMembers}
        resolvePairPersonId={() => null}
        onOpenPair={() => undefined}
        allowShare={false}
      />

      <section className="glass-card fade-in" aria-label="Create a group">
        <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, margin: "0 0 10px" }}>
          {GROUPS_CREATE_REQUIREMENT}
        </p>
        <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, margin: "0 0 14px" }}>
          {status}
        </p>
        {userId ? (
          <div style={{ marginBottom: 16 }}>
            <AddPersonForm
              userId={userId}
              idPrefix="groups-add"
              showStatus={false}
              onSaved={(info) => {
                setSaved(info);
                onPersonAdded?.(info);
              }}
            />
            {saved ? (
              <div style={{ marginTop: 12 }}>
                <AskAfterAdd userId={userId} info={saved} />
              </div>
            ) : null}
          </div>
        ) : null}
        <Link href={EMPTY_STATE_WELCOME_HREF as never} className="btn-primary" style={{ display: "inline-flex", justifyContent: "center" }}>
          {GROUPS_EMPTY_ADD_SOMEONE}
        </Link>
      </section>
    </>
  );
}
