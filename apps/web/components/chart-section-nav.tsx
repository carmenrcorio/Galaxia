"use client";

/**
 * Person profile chrome: one tab layer (Who they are / You and them, or
 * Remembrance on a memorial profile). Today sits above this strip.
 * Jump chips remain available as ChartSectionNav for other surfaces; the
 * person page no longer mounts a second nav layer.
 */

import type { PersonGroupKey, PersonNavSection, PersonPageGroup } from "@galaxia/core";

/**
 * Quiet astrology-term line inside a renamed person-profile section.
 * The tab chip uses the plain-language label; this is the vocabulary
 * a reader who knows the chart terms is looking for.
 * FOUNDER-REVIEW: vocab subhead. Terms come from PERSON_TAB_VOCAB.
 */
export function ChartVocabSubhead({ term }: { term: string }) {
  return <p className="chart-vocab-subhead">{term}</p>;
}

export function ChartSectionNav({
  sections,
  ariaLabel = "Jump to section",
  onJump,
}: {
  sections: PersonNavSection[];
  ariaLabel?: string;
  onJump?: (id: PersonNavSection["id"]) => void;
}) {
  if (sections.length === 0) return null;

  return (
    <nav
      className="chart-section-nav"
      aria-label={ariaLabel}
    >
      <ul className="chart-section-nav__list">
        {sections.map((s) => (
          <li key={s.id} style={{ flexShrink: 0 }}>
            <a
              href={`#${s.id}`}
              className="chart-section-nav__chip"
              onClick={
                onJump
                  ? (event) => {
                      event.preventDefault();
                      onJump(s.id);
                    }
                  : undefined
              }
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PersonProfileNav({
  groups,
  activeGroup,
  onGroupChange,
  personName,
}: {
  groups: PersonPageGroup[];
  activeGroup: PersonGroupKey;
  onGroupChange: (group: PersonGroupKey) => void;
  personName: string;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="person-profile-nav">
      <div
        className="person-group-tabs"
        role="tablist"
        aria-label={`Sections of ${personName}'s profile`}
      >
        {groups.map((group) => {
          const selected = group.key === activeGroup;
          return (
            <button
              key={group.key}
              type="button"
              role="tab"
              id={`person-group-${group.key}`}
              aria-selected={selected}
              aria-controls={`person-group-panel-${group.key}`}
              className="person-group-tab"
              onClick={() => onGroupChange(group.key)}
            >
              {group.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
