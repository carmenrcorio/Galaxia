import Link from "next/link";
import { BIRTH_FORM_PRIVACY_REASSURANCE } from "../lib/birth-form-copy";

/** One-line privacy reassurance with link to /security. */
export function FormPrivacyReassurance({ className }: { className?: string }) {
  return (
    <p className={`helper-text helper-text--soft${className ? ` ${className}` : ""}`} style={{ margin: 0 }}>
      {BIRTH_FORM_PRIVACY_REASSURANCE}{" "}
      <Link href="/security" style={{ color: "var(--teal)" }}>
        How we protect your data
      </Link>
    </p>
  );
}
