export type WebsiteOverrides = Record<string, string>;

export function canEditWebsite(roles: readonly string[]) {
  return roles.includes("admin");
}

export function resolveWebsiteText(original: string, overrides: WebsiteOverrides): string {
  return Object.hasOwn(overrides, original) ? overrides[original] ?? original : original;
}

export function validateWebsiteText(key: string, content: string) {
  if (!key.trim() || key.length > 2000) throw new Error("Select a valid website text field.");
  if (content.length > 10000) throw new Error("Website text must be 10,000 characters or fewer.");
  return { key, content };
}