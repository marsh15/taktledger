import type { ReviewStatus } from "../types/api";

const classes: Record<ReviewStatus | string, string> = {
  saved: "bg-[#DDF1E7] text-signal border-[#A8D9C5]",
  approved: "bg-[#E7F5EC] text-signal border-[#B7DEC6]",
  needs_review: "bg-[#FFF1CC] text-amber border-[#E7C878]",
  validation_failed: "bg-[#FFE1DD] text-danger border-[#E8A39E]",
  extracted: "bg-[#EAF0F5] text-steel border-[#C7D2DB]",
  reviewed: "bg-[#DDF1E7] text-signal border-[#A8D9C5]",
  processing: "bg-[#FFF1CC] text-amber border-[#E7C878]",
  uploaded: "bg-[#EAF0F5] text-steel border-[#C7D2DB]",
  ready: "bg-[#EAF0F5] text-steel border-[#C7D2DB]",
  failed: "bg-[#FFE1DD] text-danger border-[#E8A39E]"
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold capitalize ${classes[status] ?? classes.extracted}`}>
      {label}
    </span>
  );
}
