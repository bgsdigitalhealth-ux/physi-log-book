export function publishedPracticals<T extends { code: string; active: boolean; seq: number }>(
  practicals: readonly T[],
  templates: readonly { code: string; status: string }[],
) {
  const published = new Set(templates.filter(t => t.status === "Published").map(t => t.code));
  return practicals.filter(p => p.active && published.has(p.code)).sort((a, b) => a.seq - b.seq);
}