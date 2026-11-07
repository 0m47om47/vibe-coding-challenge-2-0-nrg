import { Check } from "@phosphor-icons/react";
import { cx } from "@/components/ui";
import { SPORTS, type Sport } from "@/types";

/** Choose the sports an academy runs. A row of toggles, each a real checkbox, so keyboards and screen readers work. */
export function SportPicker({
  value,
  onChange,
  legend = "Sports",
  hint,
}: {
  value: Sport[];
  onChange: (v: Sport[]) => void;
  legend?: string;
  hint?: string;
}) {
  const toggle = (s: Sport) => onChange(SPORTS.filter((x) => (x === s ? !value.includes(s) : value.includes(x))));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="caption-1 mb-1 text-ink-2">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {SPORTS.map((s) => {
          const on = value.includes(s);
          return (
            <label
              key={s}
              className={cx(
                "motion-base flex cursor-pointer select-none items-center gap-2 rounded-xl border px-3 py-2 button-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
                on ? "border-primary bg-hover text-ink" : "border-line bg-surface text-ink-2 hover:bg-raised"
              )}
            >
              <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(s)} />
              <span aria-hidden className={cx("flex size-4 items-center justify-center rounded-sm border", on ? "border-primary bg-primary text-on-primary" : "border-line bg-surface")}>
                {on && <Check size={12} weight="bold" />}
              </span>
              {s}
            </label>
          );
        })}
      </div>
      {hint && <p className="caption-5 text-muted">{hint}</p>}
    </fieldset>
  );
}
