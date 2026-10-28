import { CircleAlert, CircleCheck, CircleQuestionMark, CircleX } from "lucide-react";

export type DemoStatus = "found" | "partial" | "not_found" | "ambiguous";

const STYLES: Record<DemoStatus, { cls: string; Icon: typeof CircleCheck }> = {
  found: { cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", Icon: CircleCheck },
  partial: { cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", Icon: CircleAlert },
  not_found: { cls: "bg-red-50 text-red-700 ring-1 ring-red-200", Icon: CircleX },
  ambiguous: { cls: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", Icon: CircleQuestionMark },
};

export function StatusBadge({ status, label }: { status: DemoStatus; label: string }) {
  const { cls, Icon } = STYLES[status];
  return (
    <span className={`badge ${cls} whitespace-nowrap`}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
