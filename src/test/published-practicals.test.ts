import { describe, expect, it } from "vitest";
import { publishedPracticals } from "@/lib/published-practicals";
import { internalBlockStats } from "@/lib/internal-blocks";

const practicals = [
  { code: "HAEM-01", category: "Hematology", active: true, seq: 1 },
  { code: "HAEM-02", category: "Hematology", active: true, seq: 2 },
  { code: "HAEM-03", category: "Hematology", active: true, seq: 3 },
  { code: "HAEM-04", category: "Hematology", active: false, seq: 4 },
];
describe("Uploaded published records", () => {
  it("excludes catalog-only records and drafts", () => {
    expect(publishedPracticals(practicals, [{ code: "HAEM-01", status: "Published" }, { code: "HAEM-02", status: "Draft" }]).map(p => p.code)).toEqual(["HAEM-01"]);
  });
  it("excludes inactive records even when published", () => {
    expect(publishedPracticals(practicals, [{ code: "HAEM-04", status: "Published" }])).toEqual([]);
  });
  it("includes newly published records in sequence order", () => {
    expect(publishedPracticals(practicals, [{ code: "HAEM-02", status: "Published" }, { code: "HAEM-01", status: "Published" }]).map(p => p.code)).toEqual(["HAEM-01", "HAEM-02"]);
  });
  it("adjusts eligibility when a new record is published", () => {
    const submissions = [{ practical_code: "HAEM-01", status: "approved" }];
    const before = internalBlockStats(publishedPracticals(practicals, [{ code: "HAEM-01", status: "Published" }]), submissions);
    expect(before[0]).toMatchObject({ total: 1, approved: 1, eligible: true });
    const after = internalBlockStats(publishedPracticals(practicals, [{ code: "HAEM-01", status: "Published" }, { code: "HAEM-02", status: "Published" }]), submissions);
    expect(after[0]).toMatchObject({ total: 2, approved: 1, eligible: false });
  });
});