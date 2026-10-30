/**
 * Batch codes are user-visible and referenced by students, sessions and reports,
 * so they must stay unique and readable. Derived from the batch designation.
 */
export function makeBatchId(name: string, existing: string[]): string {
  const slug = name
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  const base = slug.startsWith("BATCH") ? slug : `BATCH-${slug || "NEW"}`;
  let id = base;
  let n = 2;
  while (existing.includes(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

/** Blank form fields must be stored as NULL, not as empty strings. */
export function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
