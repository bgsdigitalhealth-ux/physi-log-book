import { describe, expect, it } from "vitest";
import { passwordResetRedirect, temporaryAccountPassword, validateNewPassword } from "../lib/account-onboarding";

describe("account onboarding", () => {
  it("generates distinct temporary credentials meeting password requirements", () => {
    // Do not include credentials in assertion output.
    const first = temporaryAccountPassword();
    const second = temporaryAccountPassword();
    expect(first !== second && first.length >= 8 && /[A-Z]/.test(first) && /[a-z]/.test(first) && /\d/.test(first) && /[^a-zA-Z0-9]/.test(first)).toBe(true);
  });
  it("links to the public password-setting page on the same website", () => {
    expect(passwordResetRedirect("https://physiology.example/path")).toBe("https://physiology.example/reset-password");
    expect(() => passwordResetRedirect("http://unsafe.example")).toThrow();
  });
  it("requires matching passwords of at least eight characters", () => {
    expect(() => validateNewPassword("short", "short")).toThrow();
    expect(() => validateNewPassword("example-test-password", "different-test-password")).toThrow();
    expect(() => validateNewPassword("example-test-password", "example-test-password")).not.toThrow();
  });
});