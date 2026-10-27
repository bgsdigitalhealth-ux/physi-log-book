import type { JournalTemplate } from "@/lib/journal-template";

export function JournalPreview({ template: t }: { template: JournalTemplate }) {
  return <article className="space-y-6 bg-card p-5 text-card-foreground sm:p-8">
    <header className="border-b border-border pb-4"><p className="text-xs text-muted-foreground">Department of Physiology · MBBS Phase I</p><h2 className="mt-1 font-display text-2xl font-bold">{t.seq}. {t.title}</h2><p className="mt-2 text-sm text-muted-foreground">{t.category} · {t.code} · {t.version} · {t.status}</p></header>
    {([['Aim',t.aim],['Principle',t.principle],['Apparatus',t.apparatus],['Procedure',t.procedure],['Calculations / Formula',t.formula]]).map(([label,value]) => <section key={label}><h3 className="mb-2 text-sm font-bold text-primary">{label}</h3><p className="whitespace-pre-wrap text-sm leading-6">{value || '—'}</p></section>)}
    {t.reference_image && <figure><img src={t.reference_image} alt={t.reference_caption || `${t.title} reference diagram`} className="mx-auto max-h-80 max-w-full object-contain"/><figcaption className="mt-2 text-center text-xs text-muted-foreground">{t.reference_caption}</figcaption></figure>}
    {t.columns.length > 0 && <section><h3 className="mb-3 text-sm font-bold text-primary">Observations</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{t.columns.map(c => <th key={c.label} className="border border-border bg-secondary p-2 text-left">{c.label}{c.unit && c.unit !== '-' ? ` (${c.unit})` : ''}</th>)}</tr></thead><tbody>{(t.observation_rows.length ? t.observation_rows : [{}]).map((row,i) => <tr key={i}>{t.columns.map(c => <td key={c.label} className="h-10 border border-border p-2">{row[c.label] || '—'}</td>)}</tr>)}</tbody></table></div></section>}
    <section><h3 className="mb-2 text-sm font-bold text-primary">Result / Inference</h3><p className="whitespace-pre-wrap text-sm">{t.inference || '—'}</p></section>
    <section><h3 className="mb-2 text-sm font-bold text-primary">Questions</h3><ol className="list-decimal space-y-2 pl-5 text-sm">{t.viva_questions.map((q,i) => <li key={i}>{q}</li>)}</ol></section>
    <footer className="border-t border-border pt-4 text-xs text-muted-foreground">Maximum marks: {t.max_marks} · Faculty remarks & verification</footer>
  </article>;
}