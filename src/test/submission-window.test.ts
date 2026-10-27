import { describe, expect, it } from "vitest";
import { windowState } from "@/lib/submission-window";

describe("windowState", () => {
  it("treats an unconfigured window as always open for drafts and submits", () => {
    const s = windowState({ start_date: null, end_date: null });
    expect(s.configured).toBe(false);
    expect(s.isOpen).toBe(false);
    expect(s.closed).toBe(false);
    expect(s.notStarted).toBe(false);
  });

  it("is open between the start and end dates", () => {
    const s = windowState({ start_date: "2020-01-01", end_date: "2099-12-31" });
    expect(s.isOpen).toBe(true);
    expect(s.closed).toBe(false);
  });

  it("is closed after the last submission date", () => {
    const s = windowState({ start_date: "2020-01-01", end_date: "2020-06-01" });
    expect(s.closed).toBe(true);
    expect(s.isOpen).toBe(false);
  });

  it("is not started before the start date", () => {
    const s = windowState({ start_date: "2099-01-01", end_date: "2099-12-31" });
    expect(s.notStarted).toBe(true);
    expect(s.isOpen).toBe(false);
  });
});
