import type { KeyboardEvent } from "react";

/** The tab a key moves to, following the WAI-ARIA tabs pattern, or null for any other key. */
export function nextTab<T>(tabs: readonly T[], current: T, key: string): T | null {
  const i = tabs.indexOf(current);
  if (key === "ArrowRight") return tabs[(i + 1) % tabs.length];
  if (key === "ArrowLeft") return tabs[(i - 1 + tabs.length) % tabs.length];
  if (key === "Home") return tabs[0];
  if (key === "End") return tabs[tabs.length - 1];
  return null;
}

/** Props for each role="tab" button: roving tabindex and arrow keys. */
export function tabProps<T extends string>(prefix: string, tabs: readonly T[], current: T, value: T, select: (tab: T) => void) {
  const selected = value === current;
  return {
    role: "tab",
    id: `${prefix}-tab-${value}`,
    "aria-selected": selected,
    "aria-controls": selected ? `${prefix}-panel` : undefined,
    tabIndex: selected ? 0 : -1,
    onClick: () => select(value),
    onKeyDown: (e: KeyboardEvent) => {
      const next = nextTab(tabs, current, e.key);
      if (next === null) return;
      e.preventDefault();
      select(next);
      document.getElementById(`${prefix}-tab-${next}`)?.focus();
    },
  } as const;
}

/** Props for the role="tabpanel" that shows the current tab. */
export function tabPanelProps<T extends string>(prefix: string, current: T) {
  return { role: "tabpanel", id: `${prefix}-panel`, "aria-labelledby": `${prefix}-tab-${current}`, tabIndex: 0 } as const;
}
