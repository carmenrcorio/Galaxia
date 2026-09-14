"use client";

/**
 * Groups landing when the user has no saved groups.
 *
 * Fewer than three people: a labelled example reading (computed charts,
 * fictional names) above the create requirement and an add-person link.
 * Three or more people: skip the example and offer one tap to build a
 * group from the people they already have, named.
 */

import Link from "next/link";
import { InitialAvatar } from "../initial-avatar";
import {
  GROUPS_CREATE_REQUIREMENT,
  GROUPS_EMPTY_ADD_SOMEONE,
  GROUPS_EMPTY_BUILD_THIS_GROUP,
  GROUPS_EXAMPLE_BADGE,
  GROUPS_EXAMPLE_NOTICE,
  GROUPS_EXAMPLE_TITLE,
  groupsEmptyBuildWith,
  groupsEmptyPeopleStatus,
} from "../../lib/groups-copy";
import { exampleGroupReading } from "../../lib/groups-example";
import { EMPTY_STATE_WELCOME_HREF } from "../../lib/nav-links";
import { GroupReadingBody } from "./group-reading-body";

export interface EmptyStatePerson {
  id: string;
  display_name: string;
}

interface GroupsEmptyStateProps {
  people: EmptyStatePerson[];
  onBuildWithPeople: (personIds: string[]) => void;
}

export function GroupsEmptyState({ people, onBuildWithPeople }: GroupsEmptyStateProps) {
  const names = people.map((p) => p.display_name);
  if (people.length >= 3) {
    return (
      <section className="glass-card fade-in" aria-label="Build a group from your people">
        <p className="card-title" style={{ marginBottom: 8 }}>{groupsEmptyBuildWith(names)}</p>
        <div className="avatar-cluster" style={{ marginBottom: 14 }}>
          {people.map((p) => <InitialAvatar key={p.id} name={p.display_name} />)}
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => onBuildWithPeople(people.map((p) => p.id))}
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
          {example.memberNames.map((name) => <InitialAvatar key={name} name={name} />)}
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
        <Link href={EMPTY_STATE_WELCOME_HREF as never} className="btn-primary" style={{ display: "inline-flex", justifyContent: "center" }}>
          {GROUPS_EMPTY_ADD_SOMEONE}
        </Link>
      </section>
    </>
  );
}
