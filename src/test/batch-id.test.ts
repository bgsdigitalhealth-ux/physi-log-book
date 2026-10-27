import { describe, expect, it } from "vitest";

import { makeBatchId, toNullable } from "@/lib/batch-id";

describe("makeBatchId", () => {
  it("builds a readable code from the batch designation", () => {
    expect(makeBatchId("Batch C1 (AY 2026-27)", [])).toBe("BATCH-C1-AY-2026-27");
  });

  it("never reuses a code that already exists", () => {
    expect(makeBatchId("Batch A1", ["BATCH-A1"])).toBe("BATCH-A1-2");
    expect(makeBatchId("Batch A1", ["BATCH-A1", "BATCH-A1-2"])).toBe("BATCH-A1-3");
  });

  it("keeps a designation that already carries the BATCH prefix", () => {
    expect(makeBatchId("BATCH-D1", [])).toBe("BATCH-D1");
  });

  it("falls back to a placeholder when the designation has no letters or digits", () => {
    expect(makeBatchId("   ", [])).toBe("BATCH-NEW");
  });
});

describe("toNullable", () => {
  it("stores untouched fields as NULL", () => {
    expect(toNullable("   ")).toBeNull();
    expect(toNullable("")).toBeNull();
  });

  it("trims a value that was filled in", () => {
    expect(toNullable("  Hematology Lab 1  ")).toBe("Hematology Lab 1");
  });
});
