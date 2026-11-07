import { useAuth } from "@/components/AuthProvider";
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
  // Signed in: only the sports this academy runs. Signed out (public pages): all of them.
  const { user } = useAuth();
  const sports = user?.academy.sports ?? SPORTS;
  return (
    <select
      className={inputClass}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {allLabel && (
        <option value="" className="bg-surface text-ink">
          {allLabel}
        </option>
      )}
      {sports.map((s) => (
        <option key={s} value={s} className="bg-surface text-ink">
          {s}
        </option>
      ))}
    </select>
  );
}
