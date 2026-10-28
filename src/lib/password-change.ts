export function validatePasswordChange(current: string, next: string, confirm: string) {
  if (!current) throw new Error("Enter your current password.");
  if (next.length < 8) throw new Error("New password must be at least 8 characters.");
  if (next === current) throw new Error("Choose a different password from your current password.");
  if (next !== confirm) throw new Error("New passwords do not match.");
}