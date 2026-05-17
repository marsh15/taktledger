import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, action }: { icon: LucideIcon; title: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-md border border-dashed border-line bg-[#FAFBF7] p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-md bg-[#E7EBE2] text-steel">
          <Icon size={23} />
        </div>
        <div className="mb-4 text-base font-semibold">{title}</div>
        {action}
      </div>
    </div>
  );
}
