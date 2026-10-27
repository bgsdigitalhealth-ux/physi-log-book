import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SubmissionWindow = {
  start_date: string | null;
  end_date: string | null;
};

export const submissionWindowOptions = queryOptions({
  queryKey: ["submission-window"],
  queryFn: async (): Promise<SubmissionWindow> => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "submission_window")
      .limit(1);
    if (error) throw error;
    const value = data?.[0]?.value as Partial<SubmissionWindow> | undefined;
    return {
      start_date: value?.start_date ?? null,
      end_date: value?.end_date ?? null,
    };
  },
  staleTime: 30_000,
});

const today = () => new Date().toISOString().slice(0, 10);

export function windowState(w: SubmissionWindow): {
  configured: boolean;
  isOpen: boolean;
  notStarted: boolean;
  closed: boolean;
  daysLeft: number | null;
} {
  const configured = Boolean(w.start_date || w.end_date);
  const t = today();
  const notStarted = Boolean(w.start_date && t < w.start_date);
  const closed = Boolean(w.end_date && t > w.end_date);
  const daysLeft = w.end_date
    ? Math.ceil(
        (new Date(w.end_date).getTime() - new Date(t).getTime()) / 86_400_000,
      )
    : null;
  return { configured, isOpen: configured && !notStarted && !closed, notStarted, closed, daysLeft };
}
