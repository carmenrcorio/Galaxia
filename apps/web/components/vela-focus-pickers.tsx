"use client";

import { GroupPickerField, type GroupPickerOption } from "./group-picker-field";
import { PersonPickerField, type PersonPickerOption } from "./person-picker";

export type VelaFocusScope = "person" | "pair" | "group";

// FOUNDER-REVIEW: "Understand" slot label
export const VELA_PERSON_SLOT_LABEL = "Understand";
// FOUNDER-REVIEW: "Person A" and "Person B" pair slot labels
export const VELA_PAIR_SLOT_A_LABEL = "Person A";
export const VELA_PAIR_SLOT_B_LABEL = "Person B";
// FOUNDER-REVIEW: "Group" slot label
export const VELA_GROUP_SLOT_LABEL = "Group";

export const VELA_ADD_PERSON_HREF = "/app/add-person";
export const VELA_ADD_GROUP_HREF = "/app/groups";

export function VelaFocusPickers({
  scope,
  people,
  groups,
  subjectId,
  pairId,
  groupId,
  onSubjectSelect,
  onPairSelect,
  onGroupSelect,
  loading,
  error,
  loadingLabel,
  errorLabel,
  retryLabel,
  onRetry
}: {
  scope: VelaFocusScope;
  people: readonly PersonPickerOption[];
  groups: readonly GroupPickerOption[];
  subjectId: string | null;
  pairId: string | null;
  groupId: string | null;
  onSubjectSelect: (id: string) => void;
  onPairSelect: (id: string) => void;
  onGroupSelect: (id: string) => void;
  loading?: boolean;
  error?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  if (loading) {
    return <p className="muted" style={{ margin: 0, minHeight: 40 }}>{loadingLabel}</p>;
  }
  if (error) {
    return (
      <div>
        <p className="muted" style={{ margin: 0 }}>{errorLabel}</p>
        <button type="button" className="pill-link" onClick={onRetry}>{retryLabel}</button>
      </div>
    );
  }

  if (scope === "group") {
    return (
      <GroupPickerField
        label={VELA_GROUP_SLOT_LABEL}
        groups={groups}
        selectedId={groupId}
        onSelect={onGroupSelect}
        addGroupHref={VELA_ADD_GROUP_HREF}
      />
    );
  }

  if (scope === "pair") {
    return (
      <div className="vela-focus-pair">
        <PersonPickerField
          label={VELA_PAIR_SLOT_A_LABEL}
          people={people}
          recentPeople={[]}
          selectedId={subjectId}
          disabledId={pairId}
          onSelect={onSubjectSelect}
          addPersonHref={VELA_ADD_PERSON_HREF}
        />
        <PersonPickerField
          label={VELA_PAIR_SLOT_B_LABEL}
          people={people}
          recentPeople={[]}
          selectedId={pairId}
          disabledId={subjectId}
          onSelect={onPairSelect}
          addPersonHref={VELA_ADD_PERSON_HREF}
        />
      </div>
    );
  }

  return (
    <PersonPickerField
      label={VELA_PERSON_SLOT_LABEL}
      people={people}
      recentPeople={[]}
      selectedId={subjectId}
      disabledId={null}
      onSelect={onSubjectSelect}
      addPersonHref={VELA_ADD_PERSON_HREF}
    />
  );
}
