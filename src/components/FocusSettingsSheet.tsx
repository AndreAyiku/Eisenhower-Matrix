import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import NumberStepper from "./NumberStepper";
import SelectField from "./SelectField";
import { useSheet } from "../hooks/useSheet";
import { LIMITS, clampSettings, type FocusSettings } from "../lib/focus";

interface Props {
  settings: FocusSettings;
  onSave: (settings: FocusSettings) => void;
  onClose: () => void;
}

const CYCLE = [2, 3, 4, 5, 6];

const range = (r: { min: number; max: number }) => `Choose ${r.min} to ${r.max} minutes`;

export default function FocusSettingsSheet({ settings, onSave, onClose }: Props) {
  useSheet(onClose);
  const [draft, setDraft] = useState<FocusSettings>(settings);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(clampSettings(draft));
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

        <NumberStepper
          label="Focus length"
          hint={`${range(LIMITS.focus)}. Used when a task has no estimated time.`}
          value={draft.focusMin}
          min={LIMITS.focus.min}
          max={LIMITS.focus.max}
          unit="min"
          onChange={(n) => setDraft({ ...draft, focusMin: n })}
        />
        <NumberStepper
          label="Short break"
          hint={range(LIMITS.short)}
          value={draft.shortMin}
          min={LIMITS.short.min}
          max={LIMITS.short.max}
          unit="min"
          onChange={(n) => setDraft({ ...draft, shortMin: n })}
        />
        <NumberStepper
          label="Long break"
          hint={range(LIMITS.long)}
          value={draft.longMin}
          min={LIMITS.long.min}
          max={LIMITS.long.max}
          unit="min"
          onChange={(n) => setDraft({ ...draft, longMin: n })}
        />
        <SelectField
          label="Suggest a long break after every"
          value={draft.cycle}
          options={CYCLE}
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