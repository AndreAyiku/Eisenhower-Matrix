import { Bell, CalendarDays, Plus, X } from "lucide-react";
import PropertyRow from "./PropertyRow";
import { formatLocalDateTime } from "../lib/dates";
import { openPicker } from "../lib/picker";
import {
  MAX_REMINDERS,
  defaultRule,
  describeRule,
  reminderOptions,
  remindersHint,
  ruleFromValue,
  ruleValue,
} from "../lib/reminder";
import type { ReminderRule, RepeatRule } from "../types/task";

interface Props {
  variant: "row" | "field";
  dueDate?: string;
  dueTime?: string;
  repeat?: RepeatRule;
  value?: ReminderRule[];
  onChange: (rules: ReminderRule[]) => void;
}

export default function ReminderField({
  variant,
  dueDate,
  dueTime,
  repeat,
  value = [],
  onChange,
}: Props) {
  const disabled = !dueDate;
  const hasTime = Boolean(dueTime);
  const allowCustom = !repeat;
  const hint = remindersHint({ dueDate, dueTime, reminders: value, repeat });

  const choose = (index: number, next: string) => {
    const rule = ruleFromValue(next, dueDate, dueTime);
    onChange(
      rule
        ? value.map((r, i) => (i === index ? rule : r))
        : value.filter((_, i) => i !== index)
    );
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const setCustomTime = (index: number, at: string) =>
    onChange(value.map((r, i) => (i === index ? { type: "custom", at } : r)));

  const items = value.map((rule, index) => {
    const label = value.length > 1 ? `Reminder ${index + 1}` : "Reminder";
    const text = rule.type === "custom" ? "Custom date & time" : describeRule(rule);

    const select = (
      <select
        className="prop-native"
        aria-label={label}
        disabled={disabled}
        value={ruleValue(rule)}
        onChange={(e) => choose(index, e.target.value)}
      >
        {reminderOptions(hasTime, allowCustom, rule).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );

    const customInput =
      rule.type === "custom" ? (
        <input
          className="prop-native"
          type="datetime-local"
          aria-label={`${label} time`}
          value={rule.at}
          onClick={openPicker}
          onChange={(e) => e.target.value && setCustomTime(index, e.target.value)}
        />
      ) : null;

    if (variant === "row") {
      return (
        <div key={index} className="reminder-item">
          <PropertyRow
            icon={Bell}
            label={label}
            value={text}
            hasValue
            onClear={() => remove(index)}
            clearLabel={`Remove ${label.toLowerCase()}`}
          >
            {select}
          </PropertyRow>
          {rule.type === "custom" && (
            <PropertyRow
              icon={CalendarDays}
              label="Remind me at"
              value={formatLocalDateTime(rule.at)}
            >
              {customInput}
            </PropertyRow>
          )}
        </div>
      );
    }

    return (
      <div key={index} className="reminder-item">
        <div className="field-box">
          <span>{text}</span>
          <button
            type="button"
            className="field-clear"
            aria-label={`Remove ${label.toLowerCase()}`}
            onClick={() => remove(index)}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
          {select}
        </div>
        {rule.type === "custom" && (
          <div className="field-box">
            <span>{formatLocalDateTime(rule.at)}</span>
            <CalendarDays className="field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
            {customInput}
          </div>
        )}
      </div>
    );
  });

  const addButton = (
    <button
      type="button"
      className="add-reminder"
      disabled={disabled || value.length >= MAX_REMINDERS}
      onClick={() =>
        onChange([...value, defaultRule(value, hasTime, allowCustom, dueDate, dueTime)])
      }
    >
      <Plus size={16} strokeWidth={2} aria-hidden="true" />
      Add reminder
    </button>
  );

  if (variant === "row") {
    return (
      <div className="reminders">
        {items}
        {addButton}
        <p className="row-hint">{hint}</p>
      </div>
    );
  }

  return (
    <div className="field">
      <span className="field-label">Reminders</span>
      <div className="reminders field-list">{items}</div>
      {addButton}
      <span className="field-hint">{hint}</span>
    </div>
  );
}