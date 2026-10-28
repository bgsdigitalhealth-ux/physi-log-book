import { describe, expect, it } from "vitest";
import { assessmentMaximum, DEFAULT_PRACTICAL_MARKS, validateMarks } from "@/lib/assessment";

describe("Faculty marks", () => {
  it("defaults to the PDF's total of 5", () => expect(DEFAULT_PRACTICAL_MARKS).toBe(5));
  it("uses 5 for a record without a template", () => expect(assessmentMaximum()).toBe(5));
  it("respects a staff-configured template maximum", () => expect(assessmentMaximum(undefined, 10)).toBe(10));
  it("preserves an existing record's maximum on resubmission", () => expect(assessmentMaximum(20, 5)).toBe(20));
  it("accepts 3 out of 5 from the journal example", () => expect(() => validateMarks(3, 5)).not.toThrow());
  it("rejects a score above the practical maximum", () => expect(() => validateMarks(6, 5)).toThrow());
  it("accepts zero marks", () => expect(() => validateMarks(0, 5)).not.toThrow());
  it("rejects negative marks", () => expect(() => validateMarks(-1, 5)).toThrow());
  it("rejects fractions for integer marks storage", () => expect(() => validateMarks(3.5, 5)).toThrow());
  it("rejects non-finite marks", () => expect(() => validateMarks(NaN, 5)).toThrow());
});