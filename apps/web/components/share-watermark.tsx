/**
 * Small "galaxiamea.com" mark for exported/shared images (Memorial Timeline,
 * Family Comparison). Rendered inline — always visible on-screen too, not
 * injected only at export time — so the exported PNG is a faithful capture
 * of what the owner actually saw (WYSIWYG). Position the parent
 * `position: relative` for the absolute placement to land correctly.
 */
export function ShareWatermark() {
  return (
    <p
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: 10,
        right: 14,
        margin: 0,
        fontSize: ".62rem",
        letterSpacing: ".08em",
        color: "rgba(230,174,108,.5)",
        fontFamily: "var(--sans)",
        pointerEvents: "none",
      }}
    >
      galaxiamea.com
    </p>
  );
}
