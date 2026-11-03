const TABS = ["Matrix", "List", "AI priorities"];

interface Props {
  active?: string;
}

export default function SegmentedControl({ active = "Matrix" }: Props) {
  return (
    <div className="segmented" role="tablist" aria-label="View">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === active}
          className={`segment${tab === active ? " active" : ""}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}