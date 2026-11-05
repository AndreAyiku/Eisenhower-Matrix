import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import SelectField from "./SelectField";
import { useSheet } from "../hooks/useSheet";
import type { FocusSettings } from "../lib/focus";

interface Props {
  settings: FocusSettings;
  onSave: (settings: FocusSettings) => void;
  onClose: () => void;
}

// A 1-minute option shows up only while developing on your computer, for quick tests.
const DEV: number[] = import.meta.env.DEV ? [1] : [];
const FOCUS = [...DEV, 15, 20, 25, 30, 45, 50, 60, 90];
const SHORT = [...DEV, 3, 5, 10, 15];
const LONG = [10, 15, 20, 30, 45];
const CYCLE = [2, 3, 4, 5, 6];

const withCurrent = (options: number[], value: number) =>
  options.includes(value) ? options : [...options, value].sort((a, b) => a - b);

const mins = (n: number) => `${n} min`;

export default function FocusSettingsSheet({ settings, onSave, onClose }: Props) {
  useSheet(onClose);
  const [draft, setDraft] = useState<FocusSettings>(settings);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(draft);
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-header">
          <h2 id="adjust-title">Adjust your rhythm</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>

        <SelectField
          label="Focus length"
          value={draft.focusMin}
          options={withCurrent(FOCUS, draft.focusMin)}
          format={mins}
          onChange={(n) => setDraft({ ...draft, focusMin: n })}
        />
        <SelectField
          label="Short break"
          value={draft.shortMin}
          options={withCurrent(SHORT, draft.shortMin)}
          format={mins}
          onChange={(n) => setDraft({ ...draft, shortMin: n })}
        />
        <SelectField
          label="Long break"
          value={draft.longMin}
          options={withCurrent(LONG, draft.longMin)}
          format={mins}
          onChange={(n) => setDraft({ ...draft, longMin: n })}
        />
        <SelectField
          label="Focus sessions before a long break"
          value={draft.cycle}
          options={withCurrent(CYCLE, draft.cycle)}
          format={(n) => `${n} sessions`}
          onChange={(n) => setDraft({ ...draft, cycle: n })}
        />

        <button type="submit" className="primary-btn">
          Save
        </button>
      </form>
    </div>
  );
}