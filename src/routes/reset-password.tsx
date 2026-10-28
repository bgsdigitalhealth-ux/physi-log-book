import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WebText } from "@/components/website-content";
import { validateNewPassword } from "@/lib/account-onboarding";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Set Your Password | Physiology Practical — BGS Medical College Hospital" },
    { name: "description", content: "Securely choose a password for your BGS Physiology Practical account." },
    { property: "og:title", content: "Set Your Password | BGS Physiology Practical" },
    { property: "og:description", content: "Set a new password using your secure account email link." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let recoveryEvent = false;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const recoveryLink = hash.get("type") === "recovery";
    const code = new URL(window.location.href).searchParams.get("code");
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryEvent = true;
        if (active) setState("ready");
      }
    });
    async function check() {
      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }
        // Wait for the client to consume implicit recovery tokens before validating.
        await supabase.auth.getSession();
        const { data, error: userError } = await supabase.auth.getUser();
        if (!active) return;
        const valid = !userError && !!data.user && (recoveryLink || recoveryEvent || !!code);
        setState(valid ? "ready" : "invalid");
        // Remove credentials and codes from browser history without persisting them.
        window.history.replaceState({}, "", window.location.pathname);
      } catch {
        if (active) setState("invalid");
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
    void check();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (state !== "ready") return;
    setError("");
    try {
      validateNewPassword(password, confirmation);
      setBusy(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error("Password could not be saved. Request a new link or check the password requirements.");
      setPassword("");
      setConfirmation("");
      await supabase.auth.signOut();
      setState("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password could not be saved.");
    } finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
    <div className="w-full max-w-md space-y-6">
      <KeyRound className="size-10 text-primary" />
      <h1 className="text-3xl font-bold text-foreground"><WebText text="Set Your Password" /></h1>
      {state === "checking" ? <Loader2 className="animate-spin text-primary" aria-label="Checking password link" /> : null}
      {state === "invalid" ? <p role="alert" className="text-sm text-destructive"><WebText text="This password link is invalid or expired. Ask your administrator to send a new password link." /></p> : null}
      {state === "done" ? <p role="status" className="text-sm text-success"><WebText text="Password saved. You can now sign in with your new password." /></p> : null}
      {state === "ready" ? <form onSubmit={save} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="reset-new"><WebText text="New Password" /></Label><Input id="reset-new" type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="reset-confirm"><WebText text="Confirm New Password" /></Label><Input id="reset-confirm" type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={busy} className="w-full">{busy ? <Loader2 className="animate-spin" /> : <KeyRound />}<WebText text="Save Password" /></Button>
      </form> : null}
      {state !== "ready" && state !== "checking" ? <Button variant="outline" asChild><Link to="/login"><WebText text="Sign In" /></Link></Button> : null}
    </div>
  </main>;
}