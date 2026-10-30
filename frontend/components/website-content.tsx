import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveWebsiteText, type WebsiteOverrides } from "@/lib/website-text";

export const WEBSITE_CONTENT_KEY = ["website-content"];
const WebsiteContext = createContext<WebsiteOverrides>({});

export function WebsiteContentProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: WEBSITE_CONTENT_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("website_content").select("key,content");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
  const overrides = useMemo(() => Object.fromEntries(data.map(row => [row.key, row.content])), [data]);
  useEffect(() => {
    const channel = supabase.channel(`website-content-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "website_content" }, () => {
        qc.invalidateQueries({ queryKey: WEBSITE_CONTENT_KEY });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);
  return <WebsiteContext.Provider value={overrides}>{children}</WebsiteContext.Provider>;
}

export function useWebText() {
  const overrides = useContext(WebsiteContext);
  return (original: string | undefined) => resolveWebsiteText(original ?? "", overrides);
}

export function WebText({ text }: { text: string }) {
  const webText = useWebText();
  return <>{webText(text)}</>;
}