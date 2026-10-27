import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Tables whose changes must propagate live across portals: anything faculty or
 * admin edits (templates, sessions, holds, marks, dates) invalidates the React
 * Query caches of every signed-in student/faculty/admin screen.
 */
const SYNCED_TABLES = [
  "practicals",
  "practical_templates",
  "sessions",
  "attendance",
  "submissions",
  "profiles",
  "batches",
  "app_settings",
  "notifications",
  "user_roles",
  "viva_questions",
] as const;

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("portal-sync");
    for (const table of SYNCED_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          // Invalidate broadly: cross-portal queries use many keys, and a
          // missed key reads as a stale screen. Refetch is cheap and active-only.
          queryClient.invalidateQueries();
        },
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
