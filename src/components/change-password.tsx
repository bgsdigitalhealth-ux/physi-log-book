import { WebText, useWebText } from "@/components/website-content";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/app-shell";
import { validatePasswordChange } from "@/lib/password-change";

export function ChangePassword() {
  const webText = useWebText();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    try {
      validatePasswordChange(current, next, confirm);
      setBusy(true);
      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
        current_password: current,
      });
      if (updateError) {
        setError("Password could not be changed. Check your current password and the new password requirements, then try again.");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password could not be changed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={webText("Change Password")}>
      <form onSubmit={save} className="max-w-xl space-y-4">
        <div className="space-y-2">
          <Label htmlFor="faculty-current-password"><WebText text={"Current / Temporary Password"} /></Label>
          <Input id="faculty-current-password" type="password" autoComplete="current-password" required disabled={busy} value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="faculty-new-password"><WebText text={"New Password"} /></Label>
          <Input id="faculty-new-password" type="password" autoComplete="new-password" minLength={8} required disabled={busy} placeholder={webText("At least 8 characters")} value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="faculty-confirm-password"><WebText text={"Confirm New Password"} /></Label>
          <Input id="faculty-confirm-password" type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {success ? <p role="status" className="text-sm text-success"><WebText text={"Password changed. Use your new password the next time you sign in."} /></p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
          {busy ? webText("Saving…") : webText("Change Password")}
        </Button>
      </form>
    </Section>
  );
}