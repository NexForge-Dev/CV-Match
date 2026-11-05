import { CheckCircle2, CircleDashed, HelpCircle, MinusCircle } from "lucide-react";
import type { MatchStatus } from "@/lib/analysis/match";

/** One visual language for evidence statuses, shared by the analysis screens and the landing page example. */
export const STATUS_STYLE: Record<MatchStatus, { cls: string; solid: string; text: string; Icon: typeof CheckCircle2 }> = {
  found: { cls: "border-found-line bg-found-soft text-found-ink", solid: "bg-found", text: "text-found", Icon: CheckCircle2 },
  partial: { cls: "border-partial-line bg-partial-soft text-partial-ink", solid: "bg-partial", text: "text-partial", Icon: CircleDashed },
  not_found: { cls: "border-missing-line bg-missing-soft text-missing-ink", solid: "bg-missing", text: "text-missing", Icon: MinusCircle },
  ambiguous: { cls: "border-unclear-line bg-unclear-soft text-unclear-ink", solid: "bg-unclear", text: "text-unclear", Icon: HelpCircle },
};

export function StatusBadge({ status, label }: { status: MatchStatus; label: string }) {
  const { cls, Icon } = STATUS_STYLE[status];
  return (
    <span className={`badge border sm:whitespace-nowrap ${cls}`}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
