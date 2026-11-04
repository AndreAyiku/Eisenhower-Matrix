import type { ReactNode } from "react";
import { ChevronRight, X, type LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  hasValue?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  children: ReactNode; // invisible native control laid over the row
}

export default function PropertyRow({
  icon: Icon,
  label,
  value,
  hasValue,
  onClear,
  clearLabel,
  children,
}: Props) {
  return (
    <div className="prop-row">
      <Icon className="prop-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
      <span className="prop-label">{label}</span>
      <span className="prop-value">{value}</span>
      {hasValue && onClear ? (
        <button
          type="button"
          className="prop-clear"
          aria-label={clearLabel}
          onClick={onClear}
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      ) : (
        <ChevronRight className="prop-chevron" size={16} strokeWidth={1.75} aria-hidden="true" />
      )}
      {children}
    </div>
  );
}