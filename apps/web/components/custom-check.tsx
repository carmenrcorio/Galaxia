/**
 * CustomCheck — rounded-square checkbox with gold check and violet fill.
 * Replaces the native browser checkbox everywhere per spec §3.
 * Uses a hidden <input> to drive the CSS sibling selector in globals.css.
 */
interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  id?: string;
}

export function CustomCheck({ checked, onChange, label, id }: Props) {
  const inputId = id ?? `chk-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label className="custom-check" htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="custom-check__box" aria-hidden>
        <svg
          className="custom-check__tick"
          viewBox="0 0 10 8"
        >
          <polyline points="1,4 3.5,7 9,1" />
        </svg>
      </span>
      <span>{label}</span>
    </label>
  );
}
