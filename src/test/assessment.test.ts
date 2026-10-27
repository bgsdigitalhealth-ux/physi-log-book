import { describe, expect, it } from "vitest";
import { validateMarks } from "@/lib/assessment";

describe("Faculty marks", () => {
  it("accepts 3 out of 5 from the journal example", () => expect(() => validateMarks(3, 5)).not.toThrow());
  it("rejects a score above the practical maximum", () => expect(() => validateMarks(6, 5)).toThrow());
  it("accepts zero marks", () => expect(() => validateMarks(0, 5)).not.toThrow());
  it("rejects negative marks", () => expect(() => validateMarks(-1, 5)).toThrow());
  it("rejects fractions for integer marks storage", () => expect(() => validateMarks(3.5, 5)).toThrow());
  it("rejects non-finite marks", () => expect(() => validateMarks(NaN, 5)).toThrow());
});