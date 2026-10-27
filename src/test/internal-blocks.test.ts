import { describe, expect, it } from "vitest";
import { internalBlockStats } from "../lib/internal-blocks";

describe("internal block eligibility", () => {
  const practicals = [
    { code: "H1", category: "Hematology", active: true },
    { code: "H2", category: "Hematology", active: true },
    { code: "C1", category: "Clinical Examination", active: true },
  ];
  it("requires every record in a block to be approved", () => {
    const blocks = internalBlockStats(practicals, [
      { practical_code: "H1", status: "approved" },
      { practical_code: "H2", status: "review" },
      { practical_code: "C1", status: "approved" },
    ]);
    expect(blocks[0]).toMatchObject({ label: "Internal 1", approved: 1, total: 2, eligible: false });
    expect(blocks[1]).toMatchObject({ label: "Internal 2", approved: 1, total: 1, eligible: true });
  });
  it("does not count inactive practicals or duplicate approvals", () => {
    const blocks = internalBlockStats([...practicals, { code: "H3", category: "Hematology", active: false }], [
      { practical_code: "H1", status: "approved" },
      { practical_code: "H1", status: "approved" },
      { practical_code: "H2", status: "approved" },
    ]);
    expect(blocks[0]).toMatchObject({ approved: 2, total: 2, eligible: true });
    expect(blocks[1]?.eligible).toBe(false);
  });
});