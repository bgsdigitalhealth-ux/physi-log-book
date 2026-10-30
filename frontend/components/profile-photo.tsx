import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Renders a student's profile photo from the private `profile-photos` bucket
// via a short-lived signed URL. Falls back to initials when no photo exists.
export function ProfilePhoto({
  path,
  name,
  className,
}: {
  path: string | null | undefined;
  name: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage
      .from("profile-photos")
      .createSignedUrl(path, 300)
      .then(({ data }) => {
        if (alive) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [path]);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  if (url) {
    return (
      <img
        src={url}
        alt={`${name} photo`}
        className={cn(
          "size-10 shrink-0 rounded-full border border-border object-cover",
          className,
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-display text-xs font-bold text-muted-foreground",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}
