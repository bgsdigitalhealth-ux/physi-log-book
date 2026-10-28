import { WebText, useWebText } from "@/components/website-content";
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Microscope,
  LockKeyhole,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { authQueryOptions, claimRole, useAuth, type AppRole } from "@/lib/auth";
import { homeFor } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import laboratoryImage from "@/assets/signin-laboratory.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In | Physiology Practical Record — BGS Medical College Hospital" },
      {
        name: "description",
        content:
          "Sign in to the Digital Physiology Practical Record for MBBS Phase I students, faculty and department administrators.",
      },
      {
        property: "og:title",
        content: "Digital Physiology Practical Record — BGS Medical College Hospital",
      },
      {
        property: "og:description",
        content:
          "Record, submit and certify MBBS Phase I physiology practicals across student, faculty and department consoles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

type Stage = "signin" | "register" | "role";

const RULES = [
  { key: "len", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { key: "digit", label: "One number", test: (p: string) => /\d/.test(p) },
  { key: "special", label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

function LoginPage() {
  const webText = useWebText();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAuth();

  const [stage, setStage] = useState<Stage>("signin");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleChoice, setRoleChoice] = useState<AppRole>("student");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    roll_number: "",
    register_number: "",
    admission_year: "2026",
    batch_id: "BATCH-B2",
    designation: "",
    department: "Department of Physiology",
    password: "",
    confirmPassword: "",
  });

  // A visitor who is already signed in must not stay on this screen: send them
  // to their console, or to the role step when no role has been chosen yet.
  useEffect(() => {
    if (!auth.data) return;
    if (auth.data.role) navigate({ to: homeFor(auth.data.role) });
    else setStage("role");
  }, [auth.data, navigate]);

  const refreshAuth = async () => {
    await queryClient.invalidateQueries({ queryKey: ["auth-context"] });
    return queryClient.fetchQuery(authQueryOptions);
  };

  const finish = async () => {
    const ctx = await refreshAuth();
    if (!ctx) return;
    if (!ctx.role) {
      setStage("role");
      return;
    }
    navigate({ to: homeFor(ctx.role) });
  };

  // Students and staff usually know their roll or register number rather than
  // their institutional email, so any of the three identifiers can open a console.
  const handleSignIn = async () => {
    setBusy(true);
    let loginEmail = email.trim();
    if (!loginEmail.includes("@")) {
      const { data: found } = await supabase.rpc("find_login_email", {
        _id: loginEmail,
      });
      if (!found) {
        setBusy(false);
        toast.error("No account matches that roll or register number.");
        return;
      }
      loginEmail = found as string;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    setBusy(false);
    if (error) {
      toast.error("Invalid credentials. Check your identifier and password.");
      return;
    }
    await finish();
  };

  const handleRegister = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    if (!form.roll_number.trim() || !form.register_number.trim()) {
      toast.error("Roll number and register number are required.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!RULES.every((r) => r.test(form.password))) {
      toast.error("Password does not meet all requirements.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          roll_number: form.roll_number.trim(),
          register_number: form.register_number.trim(),
          admission_year: form.admission_year.trim(),
          batch_id: form.batch_id,
          designation: form.designation.trim(),
          department: form.department.trim(),
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Account created. Check your email to confirm, then sign in.");
      setStage("signin");
      setEmail(form.email.trim());
      return;
    }
    const err = await claimRole(roleChoice);
    if (err) {
      toast.error(err.message);
      return;
    }
    await finish();
  };

  const handleClaim = async (role: AppRole) => {
    setBusy(true);
    const err = await claimRole(role);
    setBusy(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    await finish();
  };

  return (
    <div className="signin-page min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-5 sm:px-10">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-base font-bold text-primary-foreground"><WebText text={"BG"} /></span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-semibold sm:text-base"><WebText text={"BGS Medical College Hospital"} /></span>
              <span className="block text-xs text-muted-foreground"><WebText text={"Department of Physiology"} /></span>
            </span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/"><ArrowLeft /> <span className="hidden sm:inline"><WebText text={"Back to home"} /></span></Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-10 sm:px-10 sm:py-14 lg:min-h-[calc(100dvh-151px)] lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-2 text-xs font-medium text-primary">
            <Microscope className="size-4" /> <WebText text={"MBBS Phase I · Practical Physiology"} /></div>
          <h1 className="max-w-lg font-display text-3xl leading-tight font-semibold sm:text-4xl lg:text-5xl"><WebText text={"Physiology"} /><br className="hidden sm:block" /> <WebText text={"Practical Record"} /></h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base"><WebText text={"Your practical journal, from the first observation to faculty certification."} /></p>
          <div className="relative mt-8 hidden overflow-hidden rounded-lg sm:block">
            <img src={laboratoryImage} alt={webText("Illustrative physiology teaching laboratory with a binocular microscope")} width={1600} height={1200} className="aspect-[16/9] w-full object-cover" />
            <span className="absolute right-3 bottom-3 rounded bg-card/90 px-2 py-1 text-[10px] text-muted-foreground"><WebText text={"Illustrative laboratory"} /></span>
          </div>
          <div className="mt-5 hidden items-center gap-5 text-xs text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5"><GraduationCap className="size-4 text-primary" /> <WebText text={"Students"} /></span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-primary" /> <WebText text={"Faculty"} /></span>
            <span className="flex items-center gap-1.5"><UserCog className="size-4 text-primary" /> <WebText text={"Administration"} /></span>
          </div>
        </div>
        <div className="w-full min-w-0 lg:py-6">
          <div className="mx-auto w-full max-w-md">
          {stage === "signin" ? (
            <div className="min-w-0">
              <div className="mb-5 flex size-11 items-center justify-center rounded-lg border border-border bg-card text-primary"><LockKeyhole className="size-5" /></div>
              <h2 className="font-display text-3xl font-semibold"><WebText text={"Welcome back"} /></h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <WebText text={"Sign in to your practical record portal."} /></p>

              <form className="mt-8 space-y-5" onSubmit={(event) => { event.preventDefault(); void handleSignIn(); }}>
                <Field label={webText("Email, roll or register number")}>
                  <input
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={webText("Enter email, roll or register number")}
                     required
                     disabled={busy}
                    className={inputClass}
                  />
                </Field>
                <Field label={webText("Password")}>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={webText("Enter your password")}
                       autoComplete="current-password"
                       required
                       disabled={busy}
                      className={cn(inputClass, "pr-10")}
                    />
                    <Button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      variant="ghost"
                       size="icon"
                       className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
                      aria-label={showPassword ? webText("Hide password") : webText("Show password")}
                       title={showPassword ? webText("Hide password") : webText("Show password")}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </Field>

                <Button
                  type="submit"
                  disabled={busy}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  <WebText text={"Sign In"} /><ArrowRight className="size-4" />
                </Button>


                <p className="pt-2 text-center text-sm text-muted-foreground">
                  <WebText text={"New student?"} />{webText(" ")}
                  <Button
                    type="button"
                     variant="link"
                     onClick={() => setStage("register")}
                    className="h-auto px-0 font-semibold text-primary hover:underline"
                  >
                    <WebText text={"Create an account"} /></Button>
                </p>
              </form>
            </div>
          ) : null}

          {stage === "register" ? (
            <div className="min-w-0">
              <Button
                onClick={() => setStage("signin")}
                className="mb-3 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> <WebText text={"Back to sign in"} /></Button>
              <h2 className="font-display text-2xl font-bold"><WebText text={"Student Registration"} /></h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <WebText text={"Your details are matched to your batch and practical roster."} /></p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label={webText("Full name")} className="sm:col-span-2">
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className={inputClass}
                    placeholder={webText("Ananya Sharma")}
                  />
                </Field>
                <Field label={webText("Email")} className="sm:col-span-2">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                    placeholder={webText("you@bgsmch.edu.in")}
                  />
                </Field>
                <Field label={webText("Roll number")}>
                  <input
                    value={form.roll_number}
                    onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                    className={inputClass}
                    placeholder={webText("118")}
                  />
                </Field>
                <Field label={webText("Register number")}>
                  <input
                    value={form.register_number}
                    onChange={(e) => setForm({ ...form, register_number: e.target.value })}
                    className={inputClass}
                    placeholder={webText("BGSMCH-2026-MED-118")}
                  />
                </Field>
                <Field label={webText("Phone")}>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                    placeholder={webText("+91 90000 00000")}
                  />
                </Field>
                <Field label={webText("Admission year")}>
                  <input
                    value={form.admission_year}
                    onChange={(e) => setForm({ ...form, admission_year: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label={webText("Batch")} className="sm:col-span-2">
                  <select
                    value={form.batch_id}
                    onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                    className={inputClass}
                  >
                    <option value="BATCH-A1"><WebText text={"Batch A1 (AY 2026-27)"} /></option>
                    <option value="BATCH-A2"><WebText text={"Batch A2 (AY 2026-27)"} /></option>
                    <option value="BATCH-B1"><WebText text={"Batch B1 (AY 2026-27)"} /></option>
                    <option value="BATCH-B2"><WebText text={"Batch B2 (AY 2026-27)"} /></option>
                  </select>
                </Field>
                <Field label={webText("Password")} className="sm:col-span-2">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label={webText("Confirm password")} className="sm:col-span-2">
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    <WebText text={"Password requirements"} /></p>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {RULES.map((r) => {
                      const ok = r.test(form.password);
                      return (
                        <li
                          key={r.key}
                          className={cn(
                            "flex items-center gap-2 text-xs",
                            ok ? "text-success" : "text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border",
                              ok ? "border-success bg-success-soft" : "border-border",
                            )}
                          >
                            {ok ? <Check className="size-3" /> : null}
                          </span>
                          {webText(r.label)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <Button
                onClick={handleRegister}
                disabled={busy}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                <WebText text={"Create Account"} /></Button>
            </div>
          ) : null}

          {stage === "role" ? (
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold"><WebText text={"Select Your Role"} /></h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <WebText text={"This is set once for the account and decides which console you see."} /></p>
              <div className="mt-5 grid gap-3">
                <RoleCard
                  icon={GraduationCap}
                  title={webText("Student")}
                  copy={webText("Record and submit your physiology practicals.")}
                  active={roleChoice === "student"}
                  onClick={() => setRoleChoice("student")}
                />
                <RoleCard
                  icon={ShieldCheck}
                  title={webText("Faculty")}
                  copy={webText("Faculty access is granted by a department administrator.")}
                  active={false}
                  disabled
                  onClick={() => undefined}
                />
                <RoleCard
                  icon={UserCog}
                  title={webText("Administrator")}
                  copy={webText("Managed by the department — request access from an existing administrator.")}
                  active={false}
                  disabled
                  onClick={() => undefined}
                />
              </div>
              <Button
                onClick={() => handleClaim(roleChoice)}
                disabled={busy || roleChoice === "admin"}
                className="mt-5 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <WebText text={"Continue as"} />{roleChoice === "faculty" ? webText("Faculty") : webText("Student")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      </main>
      <footer className="border-t border-border px-5 py-5 text-center text-xs text-muted-foreground"><WebText text={"BGS Medical College Hospital · Department of Physiology"} /></footer>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const webText = useWebText();
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {webText(label)}
      </span>
      {children}
    </label>
  );
}

function RoleCard({
  icon: Icon,
  title,
  copy,
  active,
  disabled,
  onClick,
}: {
  icon: typeof GraduationCap;
  title: string;
  copy: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const webText = useWebText();
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
      <span>
        <span className="block font-display text-sm font-bold">{webText(title)}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{copy}</span>
      </span>
    </Button>
  );
}
