import { ChevronDown } from "lucide-react";

interface Props {
  label: string;
  value: number;
  options: number[];
  format: (n: number) => string;
  onChange: (n: number) => void;
}

export default function SelectField({ label, value, options, format, onChange }: Props) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="field-box">
        <span>{format(value)}</span>
        <ChevronDown className="field-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
        <select
          className="prop-native"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {format(o)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}