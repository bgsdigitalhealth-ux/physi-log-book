import { describe, expect, it } from "vitest";
import { canEditWebsite, resolveWebsiteText, validateWebsiteText } from "@/lib/website-text";

describe("shared website content", () => {
  it("allows only administrators to edit website presentation content", () => {
    expect(canEditWebsite(["admin"])).toBe(true);
    expect(canEditWebsite(["student", "faculty"])).toBe(false);
    expect(canEditWebsite([])).toBe(false);
  });
  it("uses a saved change everywhere while leaving unrelated text unchanged", () => {
    const overrides = { "Practical Record Lab": "My Record Lab" };
    expect(resolveWebsiteText("Practical Record Lab", overrides)).toBe("My Record Lab");
    expect(resolveWebsiteText("Faculty", overrides)).toBe("Faculty");
  });
  it("restores defaults when the override is removed", () => {
    expect(resolveWebsiteText("Practical Record Lab", {})).toBe("Practical Record Lab");
  });
  it("treats markup as plain text rather than executable content", () => {
    expect(validateWebsiteText("Heading", "<script>alert(1)</script>").content).toBe("<script>alert(1)</script>");
  });
});