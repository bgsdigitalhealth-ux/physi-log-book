/** Temporary credentials stay server-side; recipients choose their own via recovery email. */
export function temporaryAccountPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `Aa9!${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function passwordResetRedirect(origin: string) {
  const url = new URL(origin);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("A secure website address is required.");
  }
  return `${url.origin}/reset-password`;
}

export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < 8) throw new Error("New password must be at least 8 characters.");
  if (password !== confirmation) throw new Error("New passwords do not match.");
}