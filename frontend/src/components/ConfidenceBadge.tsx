export function ConfidenceBadge({ value }: { value?: number }) {
  if (value === undefined) {
    return <span className="rounded-md border border-line px-2 py-1 text-xs text-steel">n/a</span>;
  }
  const label = value >= 0.85 ? "High" : value >= 0.6 ? "Medium" : "Low";
  const tone =
    value >= 0.85
      ? "border-[#A8D9C5] bg-[#E0F1E9] text-signal"
      : value >= 0.6
        ? "border-[#E7C878] bg-[#FFF1CC] text-amber"
        : "border-[#E8A39E] bg-[#FFE1DD] text-danger";
  return <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${tone}`}>{label} {Math.round(value * 100)}%</span>;
}
