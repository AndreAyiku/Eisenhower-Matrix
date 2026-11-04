const DEFAULT_TABS = ["Matrix", "List", "AI priorities"];

interface Props {
  tabs?: string[];
  active?: string;
  onChange?: (tab: string) => void;
}

export default function SegmentedControl({
  tabs = DEFAULT_TABS,
  active = "Matrix",
  onChange,
}: Props) {
  return (
    <div className="segmented" role="tablist" aria-label="View">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === active}
          className={`segment${tab === active ? " active" : ""}`}
          onClick={() => onChange?.(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}