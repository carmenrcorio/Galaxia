import { personChipColor, personInitials } from "@galaxia/core";

interface Props {
  name: string;
  size?: "sm" | "md" | "lg";
  /** Stable person id. Hashed when `sunSign` is missing. Falls back to `name`. */
  personId?: string;
  /** Confident tropical Sun. Omit when no chart exists yet. */
  sunSign?: string | null;
  /** Memorial star overlay — never replaced by chip color. */
  memorial?: boolean;
}

export function InitialAvatar({ name, size = "md", personId, sunSign, memorial = false }: Props) {
  const color = personChipColor({ id: personId || name, sunSign });
  const sizeCls = size === "lg" ? "avatar avatar-lg" : size === "sm" ? "avatar avatar-sm" : "avatar";
  const label = memorial ? `${name}, remembered` : name;
  return (
    <span
      className={sizeCls}
      style={{ backgroundColor: color.fill, color: color.initial }}
      aria-label={label}
      title={label}
    >
      {personInitials(name)}
      {memorial ? (
        <span className="avatar__star" aria-hidden="true">
          ✦
        </span>
      ) : null}
    </span>
  );
}
