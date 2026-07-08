import { avatarColorClass, initials } from "../lib/design";

interface Props {
  name: string;
  size?: "sm" | "md" | "lg";
}

export function InitialAvatar({ name, size = "md" }: Props) {
  const cls = avatarColorClass(name);
  const sizeCls = size === "lg" ? "avatar avatar-lg" : size === "sm" ? "avatar avatar-sm" : "avatar";
  return (
    <span className={`${sizeCls} ${cls}`} aria-label={name}>
      {initials(name)}
    </span>
  );
}
