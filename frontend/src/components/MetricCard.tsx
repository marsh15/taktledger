import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "warn" | "danger";
}

const toneClasses = {
  neutral: "bg-[#EDF2F4] text-ink",
  good: "bg-[#E0F1E9] text-signal",
  warn: "bg-[#FFF1CC] text-amber",
  danger: "bg-[#FFE1DD] text-danger"
};

export function MetricCard({ label, value, icon: Icon, tone = "neutral" }: MetricCardProps) {
  return (
    <section className="rounded-md border border-line bg-[#FAFBF7] p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-steel">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-md ${toneClasses[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="text-3xl font-semibold leading-none">{value}</div>
    </section>
  );
}
