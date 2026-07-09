/**
 * Inline spinner for button loading states.
 * Uses .spin keyframe from globals.css — reduced-motion aware.
 */
export function Spinner({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      className="spin"
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}
    >
      <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="2" opacity=".25" />
      <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
