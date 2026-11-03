import { inputClass } from "@/components/ui";
import { SPORTS, type Sport } from "@/types";

export function SportSelect<T extends Sport | "">({
  value,
  onChange,
  allLabel,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  /** When set, adds an option with this label whose value is "" (for filters). */
  allLabel?: string;
  disabled?: boolean;
}) {
  return (
    <select
      className={inputClass}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {allLabel && <option value="">{allLabel}</option>}
      {SPORTS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
