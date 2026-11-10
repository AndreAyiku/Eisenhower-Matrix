import { Bell, CalendarDays } from "lucide-react";
import PropertyRow from "./PropertyRow";
import { formatLocalDateTime } from "../lib/dates";
import { openPicker } from "../lib/picker";
import {
  describeRule,
  reminderHint,
  reminderOptions,
  ruleFromValue,
  ruleValue,
} from "../lib/reminder";
import type { ReminderRule } from "../types/task";

interface Props {
  variant: "row" | "field";
  dueDate?: string;
  dueTime?: string;
  value?: ReminderRule;
  onChange: (rule: ReminderRule | undefined) => void;
}

export default function ReminderField({ variant, dueDate, dueTime, value, onChange }: Props) {
  const disabled = !dueDate;
  const options = reminderOptions(Boolean(dueTime), value);
  const label = disabled
    ? "Set a due date first"
    : value?.type === "custom"
      ? "Custom date & time"
      : describeRule(value);
  const hint = reminderHint({ dueDate, dueTime, reminder: value });

  const select = (
    <select
      className="prop-native"
      aria-label="Reminder"
      disabled={disabled}
      value={ruleValue(value)}
      onChange={(e) => onChange(ruleFromValue(e.target.value, dueDate, dueTime))}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const customInput =
    value?.type === "custom" ? (
      <input
        className="prop-native"
        type="datetime-local"
        aria-label="Reminder time"
        value={value.at}
        onClick={openPicker}
        onChange={(e) => e.target.value && onChange({ type: "custom", at: e.target.value })}
      />
    ) : null;

  if (variant === "row") {
    return (
      <>
        <PropertyRow icon={Bell} label="Reminder" value={label}>
          {select}
        </PropertyRow>
        {value?.type === "custom" && (
          <PropertyRow icon={CalendarDays} label="Remind me at" value={formatLocalDateTime(value.at)}>
            {customInput}
          </PropertyRow>
        )}
        <p className="row-hint">{hint}</p>
      </>
    );
  }

  return (
    <div className="field">
      <span className="field-label">Reminder</span>
      <div className={`field-box${disabled ? " disabled" : ""}`}>
        <span className={value && !disabled ? "" : "placeholder"}>{label}</span>
        <Bell className="field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
        {select}
      </div>
      {value?.type === "custom" && (
        <div className="field-box">
          <span>{formatLocalDateTime(value.at)}</span>
          <CalendarDays className="field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
          {customInput}
        </div>
      )}
      <span className="field-hint">{hint}</span>
    </div>
  );
}