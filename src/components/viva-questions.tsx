import { WebText, useWebText } from "@/components/website-content";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { JOURNAL_CATEGORIES } from "@/lib/journal-template";
import { cn } from "@/lib/utils";

type Q = { id: string; category: string; question: string };

export function VivaQuestions({ editable }: { editable: boolean }) {
  const webText = useWebText();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["viva-questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("viva_questions").select("id,category,question").order("created_at");
      if (error) throw error;
      return data as Q[];
    },
  });
  const [cat, setCat] = useState<string>(JOURNAL_CATEGORIES[0] ?? "");
  const [text, setText] = useState("");
  const list = data.filter((q) => q.category === cat);

  const add = useMutation({
    mutationFn: async () => {
      const question = text.trim();
      if (!question) throw new Error("Type a question first.");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("viva_questions").insert({ category: cat, question, created_by: u.user?.id ?? null }).select("id").single();
      if (error) throw error;
    },
    onSuccess: async () => { setText(""); await qc.invalidateQueries({ queryKey: ["viva-questions"] }); toast.success("Question added"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("viva_questions").delete().eq("id", id).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["viva-questions"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {JOURNAL_CATEGORIES.map((c) => (
          <Button key={c} size="sm" variant={cat === c ? "secondary" : "ghost"} className={cn(cat === c && "text-primary")} onClick={() => setCat(c)}>
            {webText(c)} ({data.filter((q) => q.category === c).length})
          </Button>
        ))}
      </div>
      {editable ? (
        <div className="flex items-start gap-2">
          <Textarea aria-label={webText("New viva question")} rows={2} placeholder={webText("Type a viva question…")} value={text} onChange={(e) => setText(e.target.value)} />
          <Button disabled={add.isPending} onClick={() => add.mutate()}><Plus /><WebText text={"Add"} /></Button>
        </div>
      ) : null}
      {list.length ? (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {list.map((q, i) => (
            <li key={q.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <span className="font-semibold"><WebText text={"Q"} />{i + 1}.</span>
              <span className="flex-1 whitespace-pre-wrap">{q.question}</span>
              {editable ? <Button variant="ghost" size="icon" aria-label={`Delete question ${i + 1}`} onClick={() => remove.mutate(q.id)} className="text-destructive"><Trash2 /></Button> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground"><WebText text={"No viva questions in this category yet."} /></p>
      )}
    </div>
  );
}
