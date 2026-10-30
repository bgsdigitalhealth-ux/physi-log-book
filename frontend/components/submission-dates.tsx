import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submissionWindowOptions } from "@/lib/submission-window";
import { WebText, useWebText } from "@/components/website-content";

/** Staff-only editor for the record submission dates (app_settings.submission_window). */
export function SubmissionDates() {
  const webText = useWebText();
  const qc = useQueryClient();
  const win = useSuspenseQuery(submissionWindowOptions);
  const [start, setStart] = useState(win.data.start_date ?? "");
  const [end, setEnd] = useState(win.data.end_date ?? "");
  const save = useMutation({
    mutationFn: async () => {
      if (start && end && end < start) throw new Error("The last date cannot be before the start date.");
      const { error } = await supabase
        .from("app_settings")
        .update({ value: { start_date: start || null, end_date: end || null }, updated_at: new Date().toISOString() })
        .eq("key", "submission_window");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission dates saved — students can see them now");
      qc.invalidateQueries({ queryKey: ["submission-window"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h3 className="text-sm font-semibold">{webText("Record Submission Date")}</h3>
          <p className="text-xs text-muted-foreground">{webText("Set the start and last date during which students can submit practical records for review.")}</p>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          <WebText text={"Save Dates"} />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold"><WebText text={"Submission Start Date"} />
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={`mt-1.5 ${input}`} />
        </label>
        <label className="block text-xs font-semibold"><WebText text={"Last Date of Submission"} />
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={`mt-1.5 ${input}`} />
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        <WebText text={"Outside this window students can still save drafts, but the \"Submit for Review\" action stays disabled. Leave both blank to keep submissions always open."} />
      </p>
    </div>
  );
}
