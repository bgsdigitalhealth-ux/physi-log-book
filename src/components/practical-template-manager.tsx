import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, Copy, Eye, Plus, Save, Search, Send, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { authContextOptions } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { canEditJournal, emptyTemplate, JOURNAL_CATEGORIES, validateTemplate, type JournalTemplate } from "@/lib/journal-template";
import { JournalPreview } from "./journal-preview";
import { cn } from "@/lib/utils";

type Practical = { code: string; seq: number; title: string; category: string; type: string };
const tabs = ['Basic details', 'Content sections', 'Observations & tables', 'Questions', 'Settings'];

export function PracticalTemplateManager({ practicals, templates }: { practicals: Practical[]; templates: JournalTemplate[] }) {
  const { data: auth } = useSuspenseQuery(authContextOptions);
  const qc = useQueryClient();
  const [selected, setSelected] = useState(practicals[0]?.code ?? '');
  const [form, setForm] = useState<JournalTemplate>(() => templates.find(t => t.code === selected) ?? emptyTemplate(practicals[0]));
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState(0);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const allowed = canEditJournal(auth.roles);
  const update = <K extends keyof JournalTemplate>(key: K, value: JournalTemplate[K]) => { setForm(f => ({ ...f, [key]: value })); setDirty(true); };
  const choose = (p?: Practical) => {
    if (dirty && !window.confirm('Discard unsaved template changes?')) return;
    setSelected(p?.code ?? ''); setForm(templates.find(t => t.code === p?.code) ?? emptyTemplate(p)); setDirty(false); setTab(0);
  };
  const save = useMutation({
    mutationFn: async (status: 'Draft' | 'Published') => {
      if (!allowed) throw new Error('Only faculty and administrators can edit shared templates.');
      const payload = validateTemplate({ ...form, status, author: auth.profile?.full_name ?? 'Faculty' });
      const { error } = await supabase.rpc('save_journal_template', { payload });
      if (error) throw error;
      return payload;
    },
    onSuccess: async payload => { setSelected(payload.code); setForm(payload); setDirty(false); await Promise.all([qc.invalidateQueries({ queryKey: ['practical-templates'] }), qc.invalidateQueries({ queryKey: ['practicals'] })]); toast.success(payload.status === 'Published' ? 'Template published' : 'Template draft saved'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (!allowed) throw new Error('Only faculty and administrators can delete shared templates.');
      const { error } = await supabase.from('practical_templates').delete().eq('code', selected).select('code');
      if (error) throw error;
    },
    onSuccess: async () => { setForm(emptyTemplate(practicals.find(p => p.code === selected))); setDirty(false); setDeleteOpen(false); await qc.invalidateQueries({ queryKey: ['practical-templates'] }); toast.success('Template deleted; practical and student records retained'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const filtered = practicals.filter(p => (category === 'All' || p.category === category) && `${p.code} ${p.title} ${p.type}`.toLowerCase().includes(search.toLowerCase()));
  const field = (label: string, key: 'code' | 'title' | 'version' | 'reference_caption', disabled = false) => <label className="block space-y-1.5 text-xs font-semibold">{label}<Input aria-label={label} value={form[key]} disabled={disabled} onChange={e => update(key, e.target.value)} /></label>;
  const area = (label: string, key: 'aim' | 'principle' | 'apparatus' | 'procedure' | 'formula' | 'inference', rows = 4) => <label className="block space-y-2 text-sm font-semibold">{label}<Textarea aria-label={label} rows={rows} value={form[key]} onChange={e => update(key, e.target.value)} className="font-normal leading-6" /></label>;

  if (!allowed) return <div className="py-12 text-center text-muted-foreground">Shared journal editing is restricted to faculty and administrators.</div>;

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-teal">MBBS Phase I · Digital Journal of Practical Physiology</p><h1 className="mt-1 font-display text-2xl font-bold">Practical Template Manager</h1></div><Button onClick={() => choose()}><Plus />Create New Template</Button></header>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]">
      <aside className="min-w-0 border-r border-border pr-0 xl:pr-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><BookOpen className="size-4 text-teal"/>Experiments & Practical List</h2>
        <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input aria-label="Search practical templates" placeholder="Search practicals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9"/></div>
        <div className="my-3 flex flex-wrap gap-1">{['All', ...JOURNAL_CATEGORIES].map(c => <Button key={c} variant={category === c ? 'secondary' : 'ghost'} size="sm" onClick={() => setCategory(c)} className={cn('h-auto whitespace-normal text-left',category === c && 'text-primary')}>{c} ({c === 'All' ? practicals.length : practicals.filter(p => p.category === c).length})</Button>)}</div>
        <div className="max-h-[690px] overflow-y-auto"><div className="grid grid-cols-[1fr_72px] border-b border-border py-2 text-[10px] font-semibold uppercase text-muted-foreground"><span>Practical / Experiment</span><span>Status</span></div>
          {filtered.map(p => { const t = templates.find(t => t.code === p.code); return <Button key={p.code} variant="ghost" onClick={() => choose(p)} className={cn('grid h-auto w-full grid-cols-[1fr_72px] gap-2 rounded-none border-b border-border py-3 text-left', selected === p.code && 'bg-secondary text-primary')}><span className="min-w-0 whitespace-normal text-xs"><span className="mr-2 font-mono text-muted-foreground">{p.seq}.</span>{p.title}<span className="mt-1 block text-[10px] font-normal text-muted-foreground">{p.code} · {p.category}</span></span><span className={cn('text-[10px]',t?.status === 'Published' ? 'text-success' : 'text-warning')}>{t?.status ?? 'No template'}</span></Button>; })}
          {!filtered.length && <p className="py-8 text-sm text-muted-foreground">No matching practicals.</p>}
        </div><p className="mt-3 text-xs text-muted-foreground">{filtered.length} of {practicals.length} practicals</p>
      </aside>
      <section className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-2"><h2 className="mr-auto font-semibold">{selected ? 'Edit Practical Template' : 'New Practical Template'}</h2><span className={cn('text-xs font-semibold', form.status === 'Published' ? 'text-success' : 'text-warning')}>{form.status}{dirty ? ' · Unsaved' : ''}</span><Button variant="ghost" size="icon" title="Duplicate template" aria-label="Duplicate template" onClick={() => { setSelected(''); setForm(f => ({...f, code: '', title: `${f.title} (copy)`, status: 'Draft'})); setDirty(true); }}><Copy/></Button><Button variant="ghost" size="icon" title="Delete template" aria-label="Delete template" disabled={!templates.some(t => t.code === selected)} onClick={() => setDeleteOpen(true)} className="text-destructive"><Trash2/></Button></div>
        {form.updated_at && <p className="text-xs text-muted-foreground">Last updated: {new Date(form.updated_at).toLocaleDateString()} · {form.author}</p>}
        <div className="flex flex-wrap gap-1 border-b border-border pb-2">{tabs.map((label,i) => <Button key={label} size="sm" variant={tab === i ? 'secondary' : 'ghost'} onClick={() => setTab(i)} className={cn('h-auto whitespace-normal', tab === i && 'text-primary')}>{i+1}. {label}</Button>)}</div>
        {tab === 0 && <div className="grid gap-4 sm:grid-cols-2">{field('Practical code', 'code', Boolean(selected))}{field('Title', 'title')}<label className="space-y-1.5 text-xs font-semibold">Practical No.<Input aria-label="Practical No." type="number" min={1} value={form.seq} onChange={e => update('seq', Number(e.target.value))}/></label><label className="space-y-1.5 text-xs font-semibold">Category<select aria-label="Category" value={form.category} onChange={e => update('category',e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{Array.from(new Set([...JOURNAL_CATEGORIES,form.category])).map(c => <option key={c}>{c}</option>)}</select></label><label className="space-y-1.5 text-xs font-semibold">Type<select aria-label="Type" value={form.type} onChange={e => update('type',e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{Array.from(new Set(['Experiment','Demonstration',form.type])).map(t => <option key={t}>{t}</option>)}</select></label>{field('Version','version')}</div>}
        {tab === 1 && <div className="space-y-5">{area('Aim','aim',3)}{area('Principle','principle')}{area('Apparatus','apparatus',3)}{area('Procedure','procedure',6)}{area('Calculations / Formula','formula',3)}{area('Result / Inference','inference',3)}<div className="border-t border-border pt-4"><div className="mb-3 flex flex-wrap items-center gap-3"><h3 className="mr-auto text-sm font-semibold">Reference Image / Diagram</h3><label className="cursor-pointer"><span className="inline-flex items-center gap-2 text-xs font-semibold text-primary"><Upload className="size-4"/>Upload Image</span><input aria-label="Upload reference image" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async e => { const file=e.target.files?.[0]; if(!file) return; if(file.size > 2*1024*1024) {toast.error('Choose an image smaller than 2 MB.'); return;} if(!['image/png','image/jpeg','image/webp'].includes(file.type)) {toast.error('Choose PNG, JPG or WebP.'); return;} const reader=new FileReader(); reader.onload=() => {if(typeof reader.result === 'string') update('reference_image',reader.result);}; reader.readAsDataURL(file); }}/></label>{form.reference_image && <Button size="icon" variant="ghost" aria-label="Remove reference image" title="Remove reference image" onClick={() => update('reference_image','')}><X/></Button>}</div>{form.reference_image && <img src={form.reference_image} alt={form.reference_caption || 'Reference diagram'} className="mx-auto mb-3 max-h-72 max-w-full object-contain"/>}{field('Diagram caption','reference_caption')}</div></div>}
        {tab === 2 && <div className="space-y-5"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Observation Table (Template)</h3><Button size="sm" variant="outline" onClick={() => update('columns',[...form.columns,{label:`Column ${form.columns.length+1}`,type:'text',unit:'',validation:''}])}><Plus/>Add Column</Button></div>{form.columns.map((c,i) => <div key={i} className="grid grid-cols-[1fr_70px_80px_36px] items-end gap-2"><label className="text-xs">Column name<Input aria-label={`Column ${i+1} name`} value={c.label} onChange={e => {const name=e.target.value; setForm(f => ({...f,columns:f.columns.map((x,k) => k === i ? {...x,label:name} : x),observation_rows:f.observation_rows.map(r => {const next={...r,[name]:r[c.label] ?? ''}; if(name!==c.label) delete next[c.label]; return next;})})); setDirty(true);}}/></label><label className="text-xs">Unit<Input aria-label={`Column ${i+1} unit`} value={c.unit} onChange={e => update('columns',form.columns.map((x,k) => k===i ? {...x,unit:e.target.value} : x))}/></label><label className="text-xs">Type<select aria-label={`Column ${i+1} type`} value={c.type} onChange={e => update('columns',form.columns.map((x,k) => k===i ? {...x,type:e.target.value} : x))} className="h-9 w-full rounded-md border border-input bg-background text-xs"><option value="text">Text</option><option value="number">Number</option></select></label><Button variant="ghost" size="icon" aria-label={`Delete column ${i+1}`} title="Delete column" onClick={() => update('columns',form.columns.filter((_,k) => k!==i))}><Trash2/></Button></div>)}<div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr>{form.columns.map((c,i) => <th className="min-w-28 p-2 text-left" key={i}>{c.label}</th>)}<th/></tr></thead><tbody>{form.observation_rows.map((r,i) => <tr key={i}>{form.columns.map((c,j) => <td key={j} className="p-1"><Input aria-label={`Row ${i+1} ${c.label}`} value={r[c.label] ?? ''} onChange={e => update('observation_rows',form.observation_rows.map((row,k) => k===i ? {...row,[c.label]:e.target.value} : row))}/></td>)}<td><Button variant="ghost" size="icon" title="Delete row" aria-label={`Delete row ${i+1}`} onClick={() => update('observation_rows',form.observation_rows.filter((_,k) => k!==i))}><Trash2/></Button></td></tr>)}</tbody></table></div><Button disabled={!form.columns.length} variant="outline" size="sm" onClick={() => update('observation_rows',[...form.observation_rows,{}])}><Plus/>Add Row</Button></div>}
        {tab === 3 && <div className="space-y-3"><h3 className="text-sm font-semibold">Viva & Self-assessment Questions</h3>{form.viva_questions.map((q,i) => <div key={i} className="flex items-start gap-2"><Textarea aria-label={`Question ${i+1}`} rows={2} value={q} onChange={e => update('viva_questions',form.viva_questions.map((x,k) => k===i ? e.target.value : x))}/><Button variant="ghost" size="icon" aria-label={`Delete question ${i+1}`} title="Delete question" onClick={() => update('viva_questions',form.viva_questions.filter((_,k) => k!==i))}><Trash2/></Button></div>)}<Button variant="outline" size="sm" onClick={() => update('viva_questions',[...form.viva_questions,''])}><Plus/>Add Question</Button></div>}
        {tab === 4 && <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2">{(['max_marks','penalty'] as const).map(key => <label key={key} className="space-y-1.5 text-xs font-semibold">{key === 'max_marks' ? 'Maximum marks' : 'Late penalty'}<Input aria-label={key === 'max_marks' ? 'Maximum marks' : 'Late penalty'} type="number" min={0} value={form[key]} onChange={e => update(key, Number(e.target.value))}/></label>)}</div>{([['req_diagram','Require diagram'],['req_calculations','Require calculations'],['req_viva','Require viva answers']] as const).map(([key,label]) => <label key={key} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form[key]} onChange={e => update(key,e.target.checked)}/>{label}</label>)}</div>}
        <footer className="flex flex-wrap gap-2 border-t border-border pt-4"><Button variant="outline" size="sm" onClick={() => setPreview(true)}><Eye/>Preview Template</Button><Button variant="outline" size="sm" disabled={save.isPending} onClick={() => save.mutate('Draft')}><Save/>Save as Draft</Button><Button size="sm" disabled={save.isPending} onClick={() => save.mutate('Published')}><Send/>{save.isPending ? 'Saving…' : 'Publish Template'}</Button></footer>
      </section>
    </div>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto"><DialogTitle>Journal Preview</DialogTitle><DialogDescription>{form.title}</DialogDescription><JournalPreview template={form}/></DialogContent></Dialog>
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent><DialogTitle>Delete this template?</DialogTitle><DialogDescription>Delete the shared content for {form.title}? The practical and existing student records will remain.</DialogDescription><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>Delete Template</Button></div></DialogContent></Dialog>
  </div>;
}