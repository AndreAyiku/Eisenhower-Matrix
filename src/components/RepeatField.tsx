import { useState } from "react";
import { Repeat } from "lucide-react";
import NumberStepper from "./NumberStepper";
import PropertyRow from "./PropertyRow";
import SegmentedControl from "./SegmentedControl";
import {
  WEEK_ORDER,
  describeRepeat,
  repeatPreset,
  ruleFromPreset,
  unitWord,
  weekdayShort,
  type RepeatPreset,
} from "../lib/recurrence";
import type { RepeatRule, RepeatUnit } from "../types/task";

const OPTIONS: { value: RepeatPreset; label: string }[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Every weekday" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
  { value: "yearly", label: "Every year" },
  { value: "custom", label: "Custom…" },
];

const UNIT_TABS = ["Days", "Weeks", "Months", "Years"];
const UNIT_OF_TAB: Record<string, RepeatUnit> = {
  Days: "day",
  Weeks: "week",
  Months: "month",
  Years: "year",
};
const TAB_OF_UNIT: Record<RepeatUnit, string> = {
  day: "Days",
  week: "Weeks",
  month: "Months",
  year: "Years",
};

interface Props {
  variant: "row" | "field";
  dueDate?: string;
  value?: RepeatRule;
  onChange: (rule?: RepeatRule) => void;
}

export default function RepeatField({ variant, dueDate, value, onChange }: Props) {
  const [customOpen, setCustomOpen] = useState(false);

  const disabled = !dueDate;
  const preset = repeatPreset(value);
  const showCustom = Boolean(value) && (customOpen || preset === "custom");
  const selectValue = showCustom ? "custom" : preset;
  const label = disabled ? "Set a due date first" : value ? describeRepeat(value) : "Never";
  const hint = value
    ? `${describeRepeat(value)}. Marking it done moves it to the next time.`
    : "";

  const choose = (next: string) => {
    const picked = next as RepeatPreset;
    setCustomOpen(picked === "custom");
    onChange(dueDate ? ruleFromPreset(picked, dueDate) : undefined);
  };

  const edit = (patch: Partial<RepeatRule>) => {
    if (!value) return;
    onChange({ ...value, ...patch });
  };

  const toggleDay = (day: number) => {
    if (!value) return;
    const days = value.weekdays ?? [];
    edit({ weekdays: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] });
  };

  const select = (
    <select
      className="prop-native"
      aria-label="Repeat"
      disabled={disabled}
      value={selectValue}
      onChange={(e) => choose(e.target.value)}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const custom =
    showCustom && value ? (
      <div className="repeat-custom">
        <NumberStepper
          label="Repeat every"
          value={value.interval}
          min={1}
          max={99}
          unit={unitWord(value.unit, value.interval)}
          onChange={(n) => edit({ interval: n })}
        />
        <SegmentedControl
          tabs={UNIT_TABS}
          active={TAB_OF_UNIT[value.unit]}
          onChange={(tab) => {
            const unit = UNIT_OF_TAB[tab];
            edit({ unit, weekdays: unit === "week" ? value.weekdays : undefined });
          }}
        />
        {value.unit === "week" && (
          <div className="weekday-chips" role="group" aria-label="Repeat on">
            {WEEK_ORDER.map((day) => (
              <button
                key={day}
                type="button"
                className="weekday-chip"
                aria-pressed={(value.weekdays ?? []).includes(day)}
                onClick={() => toggleDay(day)}
              >
                {weekdayShort(day)}
              </button>
            ))}
          </div>
        )}
      </div>
    ) : null;

  if (variant === "row") {
    return (
      <>
        <PropertyRow icon={Repeat} label="Repeat" value={label}>
          {select}
        </PropertyRow>
        {custom}
        {value && <p className="row-hint">{hint}</p>}
      </>
    );
  }

  return (
    <div className="field">
      <span className="field-label">Repeat</span>
      <div className={`field-box${disabled ? " disabled" : ""}`}>
        <span className={value && !disabled ? "" : "placeholder"}>{label}</span>
        <Repeat className="field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
        {select}
      </div>
      {custom}
      {value && <span className="field-hint">{hint}</span>}
    </div>
  );
}