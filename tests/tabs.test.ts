import { describe, expect, it, vi } from "vitest";
import { nextTab, tabPanelProps, tabProps } from "@/lib/client/tabs";

const TABS = ["a", "b", "c"] as const;

describe("tabs keyboard pattern (CVM-029)", () => {
  it("moves with the arrows, wrapping around, and jumps with Home and End", () => {
    expect(nextTab(TABS, "a", "ArrowRight")).toBe("b");
    expect(nextTab(TABS, "c", "ArrowRight")).toBe("a");
    expect(nextTab(TABS, "a", "ArrowLeft")).toBe("c");
    expect(nextTab(TABS, "b", "Home")).toBe("a");
    expect(nextTab(TABS, "a", "End")).toBe("c");
    expect(nextTab(TABS, "a", "Enter")).toBeNull();
  });

  it("links the selected tab and its panel, with a single tab stop", () => {
    const select = vi.fn();
    const selected = tabProps("x", TABS, "b", "b", select);
    const other = tabProps("x", TABS, "b", "c", select);
    expect(selected).toMatchObject({ role: "tab", id: "x-tab-b", "aria-selected": true, "aria-controls": "x-panel", tabIndex: 0 });
    expect(other).toMatchObject({ "aria-selected": false, "aria-controls": undefined, tabIndex: -1 });
    expect(tabPanelProps("x", "b")).toEqual({ role: "tabpanel", id: "x-panel", "aria-labelledby": "x-tab-b", tabIndex: 0 });
  });
});
