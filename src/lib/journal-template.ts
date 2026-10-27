import type { Tables } from "@/integrations/supabase/types";

export type JournalTemplate = Omit<Tables<"practical_templates">, "columns" | "viva_questions" | "observation_rows"> & {
  columns: { label: string; type: string; unit: string; validation: string }[];
  viva_questions: string[];
  observation_rows: Record<string, string>[];
};

export const JOURNAL_CATEGORIES = ["Hematology", "Clinical Examination", "Human Experiments", "Amphibian Graphs", "Demonstrations"];
export const canEditJournal = (roles: readonly string[]) => roles.includes("faculty") || roles.includes("admin");

export function emptyTemplate(practical?: { code: string; seq: number; title: string; category: string; type: string }): JournalTemplate {
  return {
    code: practical?.code ?? "", seq: practical?.seq ?? 1, title: practical?.title ?? "", category: practical?.category ?? "Hematology", type: practical?.type ?? "Experiment",
    aim: "", principle: "", apparatus: "", procedure: "", formula: "", inference: "", reference_image: "", reference_caption: "",
    columns: [], observation_rows: [], viva_questions: [], author: "", version: "v1.0", status: "Draft", max_marks: 20, penalty: 5,
    req_diagram: true, req_calculations: true, req_viva: true, updated_at: "",
  };
}

export function validateTemplate(t: JournalTemplate) {
  if (!t.code.trim() || !t.title.trim()) throw new Error("Enter a practical code and title.");
  if (!Number.isInteger(t.seq) || t.seq < 1) throw new Error("Practical number must be a positive whole number.");
  if (!Number.isInteger(t.max_marks) || t.max_marks < 1 || !Number.isInteger(t.penalty) || t.penalty < 0 || t.penalty > t.max_marks) throw new Error("Check maximum marks and penalty.");
  const names = t.columns.map(c => c.label.trim());
  if (names.some(n => !n) || new Set(names).size !== names.length) throw new Error("Observation columns need unique, non-empty names.");
  if (t.status === "Published" && (!t.aim.trim() || !t.principle.trim() || !t.procedure.trim())) throw new Error("Add aim, principle and procedure before publishing.");
  return t;
}