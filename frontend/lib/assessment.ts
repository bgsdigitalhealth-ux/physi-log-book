export const DEFAULT_PRACTICAL_MARKS = 5;

export function assessmentMaximum(existing?: number, template?: number) {
  return existing ?? template ?? DEFAULT_PRACTICAL_MARKS;
}

export function validateMarks(marks: number | null, maximum: number) {
  if (marks !== null && (!Number.isInteger(marks) || marks < 0 || marks > maximum)) {
    throw new Error(`Marks must be a whole number between 0 and ${maximum}.`);
  }
}