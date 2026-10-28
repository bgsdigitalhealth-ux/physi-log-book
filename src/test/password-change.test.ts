import { describe, expect, it } from "vitest";
import { validatePasswordChange } from "@/lib/password-change";

describe("Faculty password change", () => {
  it("requires the current temporary password", () => {
    expect(() => validatePasswordChange("", "example-new", "example-new")).toThrow("Enter your current password.");
  });
  it("requires at least eight characters", () => {
    expect(() => validatePasswordChange("example-old", "short", "short")).toThrow("at least 8");
  });
  it("requires confirmation to match", () => {
    expect(() => validatePasswordChange("example-old", "example-new", "different-new")).toThrow("do not match");
  });
  it("rejects reuse of the temporary password", () => {
    expect(() => validatePasswordChange("example-old", "example-old", "example-old")).toThrow("different password");
  });
  it("accepts a matching replacement", () => {
    expect(() => validatePasswordChange("example-old", "example-new", "example-new")).not.toThrow();
  });
});