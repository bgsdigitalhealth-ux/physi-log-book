import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, RotateCcw, Save, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { authQueryOptions } from "@/lib/auth";
import { websiteTextCatalog } from "@/lib/website-text-catalog";
import { canEditWebsite, validateWebsiteText } from "@/lib/website-text";
import { supabase } from "@/integrations/supabase/client";
import { WEBSITE_CONTENT_KEY } from "./website-content";

export function EditWeb({ onManage }: { onManage: (view: string) => void }) {
  const auth = useQuery(authQueryOptions);
  const qc = useQueryClient();
  const content = useQuery({ queryKey: WEBSITE_CONTENT_KEY, queryFn: async () => {
    const { data, error } = await supabase.from("website_content").select("key,content");
    if (error) throw error;
    return data;
  } });
  const [group, setGroup] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const overrides = new Map((content.data ?? []).map(row => [row.key, row.content]));
  const rows = useMemo(() => websiteTextCatalog.filter(row =>
    (group === "All" || row.groups.includes(group)) && row.text.toLowerCase().includes(search.toLowerCase())
  ), [group, search]);
  const allowed = canEditWebsite(auth.data?.roles ?? []);
  const save = useMutation({
    mutationFn: async () => {
      if (!allowed || !selected) throw new Error("Administrator access is required.");
      const payload = validateWebsiteText(selected, draft);
      const { error } = await supabase.from("website_content").upsert({ ...payload, updated_by: auth.data?.userId ?? null, updated_at: new Date().toISOString() }).select("key").single();
      if (error) throw error;
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: WEBSITE_CONTENT_KEY }); toast.success("Website text saved across all portals"); },
    onError: (error: Error) => toast.error(error.message),
  });
  const reset = useMutation({
    mutationFn: async () => {
      if (!allowed || !selected) throw new Error("Administrator access is required.");
      const { error } = await supabase.from("website_content").delete().eq("key", selected);
      if (error) throw error;
    },
    onSuccess: async () => { setDraft(selected ?? ""); await qc.invalidateQueries({ queryKey: WEBSITE_CONTENT_KEY }); toast.success("Original text restored"); },
    onError: (error: Error) => toast.error(error.message),
  });
  if (!allowed) return <p className="text-sm text-muted-foreground">Administrator access is required.</p>;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="flex items-center gap-2 text-xs font-semibold text-primary"><ShieldCheck className="size-4" />Website administration</p><h1 className="mt-2 font-display text-3xl font-bold">Edit web</h1></div>
      <span className="text-xs text-muted-foreground">{overrides.size} customized fields</span>
    </header>
    <div className="flex flex-wrap gap-2 border-b border-border pb-4">
      {[['manage-users', 'People'], ['manage-batches', 'Batches'], ['practical-templates', 'Practical content & images'], ['session-management', 'Sessions'], ['notifications', 'Announcements']].map(([id, label]) => <Button key={id} variant="outline" size="sm" onClick={() => { if (id) onManage(id); }}>{label}</Button>)}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" aria-label="Find website text" placeholder="Find a name, heading or label" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="flex flex-wrap gap-1">{["All", "Navigation", "Home", "Sign in", "Shared", "Student", "Faculty", "Administration"].map(item => <Button key={item} size="sm" variant={group === item ? "secondary" : "ghost"} onClick={() => setGroup(item)}>{item}</Button>)}</div>
    </div>
    {content.error ? <p role="alert" className="text-sm text-destructive">Website text could not be loaded. Please try again.</p> : null}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="max-h-[640px] overflow-y-auto border-y border-border">
        {rows.map(row => <Button key={row.text} variant="ghost" onClick={() => { if (selected && draft !== (overrides.get(selected) ?? selected) && !window.confirm("Discard unsaved text changes?")) return; setSelected(row.text); setDraft(overrides.get(row.text) ?? row.text); }} className={`h-auto w-full flex-col items-start whitespace-normal break-words rounded-none border-b border-border px-3 py-3 text-left ${selected === row.text ? "bg-secondary" : ""}`}>
          <span className="text-xs text-muted-foreground">{row.groups.join(" · ")}{overrides.has(row.text) ? " · Customized" : ""}</span>
          <span className="mt-1 text-sm">{overrides.get(row.text) ?? row.text}</span>
        </Button>)}
        {!rows.length && <p className="py-8 text-sm text-muted-foreground">No matching website text.</p>}
      </div>
      {selected ? <section className="min-w-0 space-y-4 lg:sticky lg:top-24">
        <div><h2 className="font-display text-lg font-semibold">Edit text</h2><p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">Original: {selected}</p></div>
        <label className="block space-y-2 text-sm font-medium">Replacement text<Textarea aria-label="Replacement text" value={draft} onChange={e => setDraft(e.target.value)} rows={6} maxLength={10000} /></label>
        <div className="flex flex-wrap gap-2"><Button disabled={save.isPending || reset.isPending || content.isPending} onClick={() => save.mutate()}><Save />Save changes</Button><Button variant="outline" disabled={!overrides.has(selected) || save.isPending || reset.isPending} onClick={() => reset.mutate()}><RotateCcw />Restore original</Button></div>
        <div className="border-t border-border pt-4"><h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Eye className="size-4" />Preview</h3><p className="mt-3 whitespace-pre-wrap break-words text-base">{draft || "—"}</p></div>
      </section> : <p className="py-8 text-sm text-muted-foreground">Select website text to edit.</p>}
    </div>
  </div>;
}