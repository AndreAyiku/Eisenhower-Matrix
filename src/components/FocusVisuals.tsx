import type { ReactNode } from "react";

interface RingProps {
  progress: number; // 0 to 1
  children: ReactNode;
}

export function FocusRing({ progress, children }: RingProps) {
  const R = 140;
  const C = 2 * Math.PI * R;
  const p = Math.max(0, Math.min(1, progress));

  return (
    <div className="ring">
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <circle className="ring-track" cx="150" cy="150" r={R} />
        {p > 0 && (
          <circle
            className="ring-progress"
            cx="150"
            cy="150"
            r={R}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - p)}
            transform="rotate(-90 150 150)"
          />
        )}
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

interface DotsProps {
  total: number;
  filled: number;
  variant: "bars" | "round";
}

export function SessionDots({ total, filled, variant }: DotsProps) {
  return (
    <div className={`dots ${variant}`} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`dot-s${i < filled ? " on" : ""}`} />
      ))}
    </div>
  );
}