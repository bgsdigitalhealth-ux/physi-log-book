import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
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
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-sidebar-primary font-display text-base font-bold">
            BG
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight">
              BGS Medical College Hospital
            </p>
            <p className="text-xs text-sidebar-muted">Department of Physiology</p>
          </div>
        </div>

        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-sidebar-muted uppercase">
            MBBS Phase I • AY 2026-27
          </p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] font-extrabold">
            Digital
            <br />
            Physiology
            <br />
            Practical Record
          </h1>
          <p className="mt-5 max-w-md text-sm text-sidebar-muted">
            Record each experiment on the day of the session, submit it for faculty
            review, and keep a certified digital journal across the term.
          </p>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          {[
            ["12", "Practicals mapped"],
            ["4", "Academic batches"],
            ["20", "Marks per record"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-lg border border-sidebar-border p-3">
              <p className="font-display text-2xl font-bold">{n}</p>
              <p className="text-[11px] text-sidebar-muted">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <p className="font-display text-xl font-bold">BGS Medical College Hospital</p>
            <p className="text-xs text-muted-foreground">
              Digital Physiology Practical Record
            </p>
          </div>

          {stage === "signin" ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">Welcome</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in with your email, roll number or register number.
              </p>

              <div className="mt-6 space-y-4">
                <Field label="Email, roll or register number">
                  <input
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. 118, BGSMCH-2026-MED-118 or you@bgsmch.edu.in"
                    className={inputClass}
                  />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={cn(inputClass, "pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>

                <button
                  onClick={handleSignIn}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Sign In
                </button>


                <p className="pt-2 text-center text-sm text-muted-foreground">
                  New student?{" "}
                  <button
                    onClick={() => setStage("register")}
                    className="font-semibold text-primary hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </div>
          ) : null}

          {stage === "register" ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <button
                onClick={() => setStage("signin")}
                className="mb-3 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back to sign in
              </button>
              <h2 className="font-display text-2xl font-bold">Student Registration</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your details are matched to your batch and practical roster.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Full name" className="sm:col-span-2">
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className={inputClass}
                    placeholder="Ananya Sharma"
                  />
                </Field>
                <Field label="Email" className="sm:col-span-2">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                    placeholder="you@bgsmch.edu.in"
                  />
                </Field>
                <Field label="Roll number">
                  <input
                    value={form.roll_number}
                    onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                    className={inputClass}
                    placeholder="118"
                  />
                </Field>
                <Field label="Register number">
                  <input
                    value={form.register_number}
                    onChange={(e) => setForm({ ...form, register_number: e.target.value })}
                    className={inputClass}
                    placeholder="BGSMCH-2026-MED-118"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                    placeholder="+91 90000 00000"
                  />
                </Field>
                <Field label="Admission year">
                  <input
                    value={form.admission_year}
                    onChange={(e) => setForm({ ...form, admission_year: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Batch" className="sm:col-span-2">
                  <select
                    value={form.batch_id}
                    onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                    className={inputClass}
                  >
                    <option value="BATCH-A1">Batch A1 (AY 2026-27)</option>
                    <option value="BATCH-A2">Batch A2 (AY 2026-27)</option>
                    <option value="BATCH-B1">Batch B1 (AY 2026-27)</option>
                    <option value="BATCH-B2">Batch B2 (AY 2026-27)</option>
                  </select>
                </Field>
                <Field label="Password" className="sm:col-span-2">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Confirm password" className="sm:col-span-2">
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <p className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Password requirements
                  </p>
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
                          {r.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Create Account
              </button>
            </div>
          ) : null}

          {stage === "role" ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">Select Your Role</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This is set once for the account and decides which console you see.
              </p>
              <div className="mt-5 grid gap-3">
                <RoleCard
                  icon={GraduationCap}
                  title="Student"
                  copy="Record and submit your physiology practicals."
                  active={roleChoice === "student"}
                  onClick={() => setRoleChoice("student")}
                />
                <RoleCard
                  icon={ShieldCheck}
                  title="Faculty"
                  copy="Faculty access is granted by a department administrator."
                  active={false}
                  disabled
                  onClick={() => undefined}
                />
                <RoleCard
                  icon={UserCog}
                  title="Administrator"
                  copy="Managed by the department — request access from an existing administrator."
                  active={false}
                  disabled
                  onClick={() => undefined}
                />
              </div>
              <button
                onClick={() => handleClaim(roleChoice)}
                disabled={busy || roleChoice === "admin"}
                className="mt-5 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Continue as {roleChoice === "faculty" ? "Faculty" : "Student"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
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
  return (
    <button
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
        <span className="block font-display text-sm font-bold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{copy}</span>
      </span>
    </button>
  );
}
