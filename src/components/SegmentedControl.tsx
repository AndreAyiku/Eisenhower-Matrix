interface Props {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export default function SegmentedControl({ tabs, active, onChange }: Props) {
  return (
    <div className="segmented" role="tablist" aria-label="View">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === active}
          className={`segment${tab === active ? " active" : ""}`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}