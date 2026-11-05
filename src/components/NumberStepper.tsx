import { useState } from "react";
import { Minus, Plus } from "lucide-react";

interface Props {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
}

export default function NumberStepper({ label, hint, value, min, max, unit, onChange }: Props) {
  const [text, setText] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const type = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    setText(digits);
    const n = Number(digits);
    if (digits !== "" && n >= min && n <= max) onChange(n);
  };

  const commit = () => {
    if (text !== null && text !== "") onChange(clamp(Number(text)));
    setText(null);
  };

  const step = (delta: number) => {
    onChange(clamp(value + delta));
    setText(null);
  };

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="stepper">
        <button
          type="button"
          className="stepper-btn"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => step(-1)}
        >
          <Minus size={18} strokeWidth={1.75} />
        </button>
        <label className="stepper-value">
          <input
            className="stepper-input"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={label}
            value={text ?? String(value)}
            onChange={(e) => type(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={commit}
          />
          {unit && <span className="stepper-unit">{unit}</span>}
        </label>
        <button
          type="button"
          className="stepper-btn"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => step(1)}
        >
          <Plus size={18} strokeWidth={1.75} />
        </button>
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}