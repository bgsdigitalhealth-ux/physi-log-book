const CATEGORY_ORDER = [
  "Hematology",
  "Clinical Examination",
  "Human Experiments",
  "Amphibian Graphs",
  "Demonstrations",
];

export function internalBlockStats(
  practicals: readonly { code: string; category: string; active: boolean }[],
  submissions: readonly { practical_code: string; status: string }[],
) {
  const latestStatus = new Map(submissions.map((s) => [s.practical_code, s.status]));
  const categories = [...new Set([...CATEGORY_ORDER, ...practicals.map((p) => p.category)])];
  return categories.map((category, index) => {
    const records = practicals.filter((p) => p.active && p.category === category);
    const approved = records.filter((p) => latestStatus.get(p.code) === "approved").length;
    return {
      label: `Internal ${index + 1}`,
      category,
      total: records.length,
      approved,
      eligible: records.length > 0 && approved === records.length,
    };
  }).filter((block) => block.total > 0);
}