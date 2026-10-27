import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  queryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Check, Lock, Paperclip, Printer, Send, Star, Trash2, Upload } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell, Metric, Section, StatusBadge } from "@/components/app-shell";
import { authContextOptions, authQueryOptions, type Profile } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { JournalTemplate } from "@/lib/journal-template";
import { ProfilePhoto } from "@/components/profile-photo";
import { VivaQuestions } from "@/components/viva-questions";
import { submissionWindowOptions, windowState } from "@/lib/submission-window";
import { internalBlockStats } from "@/lib/internal-blocks";

type Practical = {
  code: string;
  seq: number;
  title: string;
  category: string;
  type: string;
  active: boolean;
};
type Template = JournalTemplate;
type Session = {
  id: string;
  session_date: string;
  topic: string;
  venue: string | null;
  faculty_name: string | null;
  status: string;
  batch_id: string | null;
};
type Submission = {
  id: string;
  practical_code: string;
  status: string;
  marks: number | null;
  max_marks: number;
  remarks: string | null;
  page_no: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  entry: Record<string, unknown>;
};
type Attendance = { session_id: string; status: string };
type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_view: string | null;
  created_at: string;
};

export const studentQueryOptions = {
  practicals: () =>
    queryOptions({
      queryKey: ["practicals"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("practicals")
          .select("*")
          .order("seq");
        if (error) throw error;
        return data as Practical[];
      },
    }),
  templates: () =>
    queryOptions({
      queryKey: ["practical-templates"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("practical_templates")
          .select("*")
          .order("seq");
        if (error) throw error;
        return data as unknown as Template[];
      },
    }),
  sessions: () =>
    queryOptions({
      queryKey: ["sessions"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .order("session_date");
        if (error) throw error;
        return data as Session[];
      },
    }),
};

export const Route = createFileRoute("/_authenticated/student")({
  head: () => ({
    meta: [
      { title: "Student Dashboard | Physiology Practical Record" },
      {
        name: "description",
        content:
          "Student console for the MBBS Phase I digital physiology practical record.",
      },
      {
        property: "og:title",
        content: "Student Dashboard | Physiology Practical Record",
      },
      {
        property: "og:description",
        content:
          "Record, submit and track MBBS Phase I physiology practicals with faculty review.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(authQueryOptions);
    await Promise.all([
      context.queryClient.ensureQueryData(studentQueryOptions.practicals()),
      context.queryClient.ensureQueryData(studentQueryOptions.templates()),
      context.queryClient.ensureQueryData(studentQueryOptions.sessions()),
      context.queryClient.ensureQueryData(submissionWindowOptions),
    ]);
  },
  component: StudentPage,
});


function StudentPage() {
  const [view, setView] = useState("dashboard-overview");
  const auth = useSuspenseQuery(authContextOptions);
  const practicals = useSuspenseQuery(studentQueryOptions.practicals());
  const templates = useSuspenseQuery(studentQueryOptions.templates());
  const sessions = useSuspenseQuery(studentQueryOptions.sessions());
  const profile = auth.data.profile;
  const userId = auth.data.userId;

  const submissions = useSuspenseQuery(
    queryOptions({
      queryKey: ["submissions", userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("submissions")
          .select("*")
          .eq("student_id", userId)
          .order("created_at");
        if (error) throw error;
        return data as Submission[];
      },
    }),
  );
  const attendance = useSuspenseQuery(
    queryOptions({
      queryKey: ["attendance", userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("attendance")
          .select("*")
          .eq("student_id", userId);
        if (error) throw error;
        return data as Attendance[];
      },
    }),
  );
  const notifications = useSuspenseQuery(
    queryOptions({
      queryKey: ["notifications", userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as Notification[];
      },
    }),
  );

  const submissionWindow = useSuspenseQuery(submissionWindowOptions);
  const win = windowState(submissionWindow.data);
  const held = profile?.is_held ?? false;

  const queryClient = useQueryClient();
  const reload = () =>
    queryClient.invalidateQueries({ queryKey: ["submissions"] });

  const byCode = new Map(practicals.data.map((p) => [p.code, p]));
  const subByCode = new Map(submissions.data.map((s) => [s.practical_code, s]));
  const statusOf = (code: string) => subByCode.get(code)?.status ?? "pending";
  const approved = submissions.data.filter((s) => s.status === "approved");
  const corrections = submissions.data.filter(
    (s) => s.status === "correction",
  );
  const pending = practicals.data.filter((p) => statusOf(p.code) === "pending");
  const present = attendance.data.filter((a) => a.status === "Present").length;
  const marked = attendance.data.filter((a) => a.status !== "Scheduled").length;
  const attendancePct = marked ? Math.round((present / marked) * 1000) / 10 : 0;
  const completionPct = practicals.data.length
    ? Math.round((approved.length / practicals.data.length) * 100)
    : 0;
  const scored = approved.filter((s) => s.marks != null);
  const avgScore = scored.length
    ? Math.round(
        (scored.reduce((t, s) => t + (s.marks ?? 0), 0) / scored.length) * 10,
      ) / 10
    : 0;
  const avgMax = scored.length
    ? Math.round(
        (scored.reduce((t, s) => t + (s.max_marks ?? 20), 0) / scored.length) *
          10,
      ) / 10
    : 20;

  const blockStats = internalBlockStats(practicals.data, submissions.data);

  // Sequential unlocking per category: within each category, a practical opens
  // only once every earlier practical in that category has an approved record.
  const approvedCodes = new Set(approved.map((s) => s.practical_code));
  const lockedCodes = new Set<string>();
  const byCategory = new Map<string, typeof practicals.data>();
  for (const p of practicals.data) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }
  for (const list of byCategory.values()) {
    let blocked = false;
    for (const p of [...list].sort((a, b) => a.seq - b.seq)) {
      if (blocked) lockedCodes.add(p.code);
      if (!approvedCodes.has(p.code)) blocked = true;
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingSessions = sessions.data.filter(
    (s) => s.session_date >= todayStr && s.status === "Scheduled",
  );

  return (
    <AppShell
      role="student"
      activeView={view}
      onSelectView={setView}
      user={{
        name: profile?.full_name || "Student",
        email: profile?.email ?? auth.data.email,
        meta: `Roll: ${profile?.roll_number ?? "—"} • Reg: ${profile?.register_number ?? "—"}`,
      }}
      counts={{
        "assigned-practicals": pending.length,
        "submission-status": corrections.length,
        notifications: notifications.data.filter((n) => !n.is_read).length,
      }}
      search={{
        value: "",
        onChange: () => undefined,
        placeholder: "Search practicals, observations, viva...",
      }}
    >
      {view === "dashboard-overview" ? (
        <div className="space-y-6">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              MBBS Phase I • Department of Physiology • AY 2026-27
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">
              Welcome back, {profile?.full_name || "Student"}
            </h1>
          </div>

          {held ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <Lock className="size-4" /> Your record access is on hold
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile?.hold_reason ??
                  "Your faculty has placed your practical record access on hold (for example due to absence). Please contact your faculty mentor to resume."}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Assigned Practicals"
              value={`${practicals.data.length} Total`}
              note="Hematology, Clinical, Human Exp, Amphibian, Demo"
              onClick={() => setView("assigned-practicals")}
            />
            <Metric
              label="Pending Entries"
              value={`${pending.length} Due`}
              note="Submit on the day of your session"
              tone="warning"
              onClick={() => setView("assigned-practicals")}
            />
            <Metric
              label="Corrections Required"
              value={`${corrections.length} Records`}
              note="Faculty returned with feedback"
              tone="danger"
              onClick={() => setView("submission-status")}
            />
            <Metric
              label="Approved & Certified"
              value={`${approved.length} Certified`}
              note="Signed by faculty evaluator"
              tone="success"
              onClick={() => setView("download-print")}
            />
          </div>

          <Section
            title="Internal-wise Record Completion & Eligibility"
          >
            <div className="space-y-3">
              {blockStats.map((b) => (
                <div key={b.category}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-semibold">{b.label}</p>
                      <p className="mt-1 text-muted-foreground">{b.category}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-muted-foreground">
                        {b.approved}/{b.total} certified
                      </span>
                      <span className={cn("inline-flex items-center gap-1 font-semibold", b.eligible && !held ? "text-success" : "text-muted-foreground")}>
                        {b.eligible && !held ? <Check className="size-3.5" /> : <Lock className="size-3.5" />}
                        {held ? "On hold" : b.eligible ? "Eligible" : "Not eligible"}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${b.total ? Math.round((b.approved / b.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Record Submission Window"
            description="Faculty-set dates for accepting practical records."
          >
            {!win.configured ? (
              <p className="text-sm text-muted-foreground">
                Your faculty has not announced the record submission dates yet.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Submission Starts
                  </p>
                  <p className="font-display text-lg font-bold">
                    {submissionWindow.data.start_date ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Last Date of Submission
                  </p>
                  <p className="font-display text-lg font-bold">
                    {submissionWindow.data.end_date ?? "—"}
                  </p>
                </div>
                <span
                  className={cn(
                    "ml-auto rounded-full px-3 py-1 text-xs font-semibold",
                    win.closed
                      ? "bg-destructive/10 text-destructive"
                      : win.notStarted
                        ? "bg-warning-soft text-warning"
                        : "bg-success-soft text-success",
                  )}
                >
                  {win.closed
                    ? "Submissions closed"
                    : win.notStarted
                      ? "Opens soon"
                      : win.daysLeft != null
                        ? `Open — ${win.daysLeft} day${win.daysLeft === 1 ? "" : "s"} left`
                        : "Open"}
                </span>
              </div>
            )}
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Action Items (Corrections & Deadlines)">
              {corrections.length === 0 && pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing outstanding. All submitted records are with your
                  faculty.
                </p>
              ) : (
                <ul className="space-y-3">
                  {[
                    ...corrections.map((s) => ({
                      code: s.practical_code,
                      title: byCode.get(s.practical_code)?.title ?? s.practical_code,
                      remarks: s.remarks,
                    })),
                    ...pending.slice(0, 2).map((p) => ({
                      code: p.code,
                      title: p.title,
                      remarks: null as string | null,
                    })),
                  ].map((row) => {
                    const { code, title } = row;
                    return (
                      <li
                        key={code}
                        className="flex items-start gap-3 rounded-lg border border-border p-3"
                      >
                        <span className="mt-0.5 text-warning">⚠️</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {title}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {row.remarks ?? "Awaiting your entry"}
                          </span>
                        </span>
                        <button
                          onClick={() => {
                            setView("practical-entry");
                          }}
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                        >
                          Fix Now
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section
              title="Upcoming Sessions"
              actions={
                <button
                  onClick={() => setView("attendance")}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                >
                  View All ({sessions.data.length})
                </button>
              }
            >
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming sessions scheduled right now.
                </p>
              ) : (
                <ul className="space-y-3">
                  {upcomingSessions.slice(0, 4).map((s) => (
                    <li key={s.id} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {s.session_date}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{s.topic}</span>
                      <StatusBadge status={s.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      ) : null}

      {view === "my-profile" ? (
        <ProfileView profile={profile} userId={userId} />
      ) : null}

      {view === "assigned-practicals" ? (
        <AssignedPracticals
          practicals={practicals.data}
          submissions={submissions.data}
          lockedCodes={lockedCodes}
          held={held}
          onEnter={() => setView("practical-entry")}
          onView={() => setView("download-print")}
        />
      ) : null}

      {view === "practical-entry" ? (
        held ? (
          <Section title="Digital Practical Entry & Recording Lab">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <Lock className="size-4" /> Record entry is on hold
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile?.hold_reason ??
                  "Your faculty has placed your practical record access on hold. Please contact your faculty mentor to resume."}
              </p>
            </div>
          </Section>
        ) : (
          <PracticalEntry
            practicals={practicals.data}
            templates={templates.data}
            submissions={submissions.data}
            lockedCodes={lockedCodes}
            submissionOpen={!win.configured || win.isOpen}
            windowNote={
              win.closed
                ? `The submission window closed on ${submissionWindow.data.end_date}. You can save a draft, but cannot submit for review.`
                : win.notStarted
                  ? `Submissions open on ${submissionWindow.data.start_date}. You can save a draft, but cannot submit for review yet.`
                  : null
            }
            userId={userId}
            profile={profile}
            onDone={reload}
          />
        )
      ) : null}

      {view === "submission-status" ? (
        <SubmissionStatus
          submissions={submissions.data}
          byCode={byCode}
          onResubmit={() => setView("practical-entry")}
        />
      ) : null}

      {view === "attendance" ? (
        <AttendanceView
          sessions={sessions.data}
          attendance={attendance.data}
          pct={attendancePct}
          present={present}
          marked={marked}
        />
      ) : null}

      {view === "progress-analytics" ? (
        <AnalyticsView
          practicals={practicals.data}
          submissions={submissions.data}
          avgScore={avgScore}
          avgMax={avgMax}
          completionPct={completionPct}
          attendancePct={attendancePct}
        />
      ) : null}

      {view === "feedback-viva" ? (
        <FeedbackView
          submissions={submissions.data}
          byCode={byCode}
        />
      ) : null}

      {view === "viva-questions" ? (
        <Section title="Viva Questions">
          <VivaQuestions editable={false} />
        </Section>
      ) : null}

      {view === "notifications" ? (
        <NotificationsView
          items={notifications.data}
          onOpen={setView}
          onReload={() =>
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
          }
        />
      ) : null}

      {view === "download-print" ? (
        <JournalView
          profile={profile}
          submissions={submissions.data}
          byCode={byCode}
        />
      ) : null}

      {view === "learning-resources" ? <ResourcesView /> : null}
    </AppShell>
  );
}

function ProfileView({
  profile,
  userId,
}: {
  profile: Profile | null;
  userId: string;
}) {
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    roll_number: profile?.roll_number ?? "",
    register_number: profile?.register_number ?? "",
    phone: profile?.phone ?? "",
    gender: profile?.gender ?? "",
    academic_phase: profile?.academic_phase ?? "MBBS Phase I (Term 1)",
  });
  const [photoPath, setPhotoPath] = useState(profile?.photo_path ?? null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file (PNG, JPG or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Choose a photo smaller than 5 MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/photo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(path, file);
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ photo_path: path })
      .eq("user_id", userId);
    setUploading(false);
    if (pErr) {
      toast.error(pErr.message);
      return;
    }
    setPhotoPath(path);
    queryClient.invalidateQueries({ queryKey: ["auth-context"] });
    toast.success("Profile photo uploaded");
  };
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update(form)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["auth-context"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Section
      title="Student Academic Profile"
      description="Details are matched to your batch roster and practical journal."
      actions={
        <button
          onClick={() => save.mutate()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Save Changes
        </button>
      }
    >
      <div className="mb-5 flex items-center gap-4 rounded-lg border border-border p-4">
        <ProfilePhoto
          path={photoPath}
          name={profile?.full_name || "Student"}
          className="size-16"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Profile Photo</p>
        </div>
        <label className="cursor-pointer">
          <span className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
            <Camera className="size-3.5" />
            {uploading ? "Uploading…" : photoPath ? "Change Photo" : "Upload Photo"}
          </span>
          <input
            aria-label="Upload profile photo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPhoto(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {([
          ["Full Name (As per University Records)", "full_name"],
          ["Roll No.", "roll_number"],
          ["University Register Number", "register_number"],
          ["Contact Mobile", "phone"],
          ["Academic Program", "academic_phase"],
        ] as [string, string][]).map(([label, key]) => (
          <label key={key} className="block sm:col-span-1">
            <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {label}
            </span>
            <input
              value={(form as Record<string, string>)[key] ?? ""}
              onChange={(e) =>
                setForm({ ...form, [key]: e.target.value })
              }
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        ))}
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Gender
          </span>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Official Student Email
          </span>
          <input
            value={profile?.email ?? ""}
            readOnly
            className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
          />
        </label>
      </div>
    </Section>
  );
}

function AssignedPracticals({
  practicals,
  submissions,
  lockedCodes,
  held,
  onEnter,
  onView,
}: {
  practicals: Practical[];
  submissions: Submission[];
  lockedCodes: Set<string>;
  held: boolean;
  onEnter: () => void;
  onView: () => void;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const subByCode = new Map(submissions.map((s) => [s.practical_code, s]));
  const CAT_ORDER = [
    "Hematology",
    "Clinical Examination",
    "Human Experiments",
    "Amphibian Graphs",
    "Demonstrations",
  ];
  const cats = [...new Set(practicals.map((p) => p.category))].sort(
    (a, b) =>
      (CAT_ORDER.indexOf(a) === -1 ? 99 : CAT_ORDER.indexOf(a)) -
      (CAT_ORDER.indexOf(b) === -1 ? 99 : CAT_ORDER.indexOf(b)),
  );
  const activeCategory = category ?? cats[0];
  const countByCat = new Map<string, number>();
  for (const p of practicals)
    countByCat.set(p.category, (countByCat.get(p.category) ?? 0) + 1);
  const rows = practicals.filter((p) => {
    const st = subByCode.get(p.code)?.status ?? "pending";
    return (
      p.category === activeCategory &&
      (status === "all" || st === status)
    );
  });

  return (
    <Section title="Assigned Physiology Practicals">
      <div className="mb-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              activeCategory === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-secondary",
            )}
          >
            {c} ({countByCat.get(c) ?? 0})
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono tracking-widest text-muted-foreground uppercase">
          Status:
        </span>
        {([
          ["all", "All"],
          ["pending", "Pending"],
          ["review", "Under Review"],
          ["correction", "Needs Correction"],
          ["approved", "Approved"],
        ] as [string, string][]).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setStatus(v)}
            className={cn(
              "rounded-md border px-2.5 py-1 font-semibold",
              status === v
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:bg-secondary",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Practical Experiment Title</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Marks</th>
              <th className="py-2 pr-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const sub = subByCode.get(p.code);
              const st = sub?.status ?? "pending";
              const locked = lockedCodes.has(p.code);
              return (
                <tr key={p.code} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-mono text-xs">{p.code}</td>
                  <td className="py-2.5 pr-3">
                    <span className="block font-medium">{p.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.type}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs">{p.category}</td>
                  <td className="py-2.5 pr-3">
                    {locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                        <Lock className="size-3" /> Locked
                      </span>
                    ) : (
                      <StatusBadge status={st} />
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    {sub?.marks != null ? `${sub.marks}/${sub.max_marks}` : "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    {locked ? (
                      <span
                        className="text-xs text-muted-foreground"
                        title="Complete the previous practical and get it approved by faculty to unlock this one."
                      >
                        Unlock after previous approval
                      </span>
                    ) : (
                      <button
                        onClick={st === "approved" ? onView : onEnter}
                        disabled={held && st !== "approved"}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {st === "approved" ? "View" : "Enter"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

type ObservationRow = Record<string, string | number>;
type Attachment = { name: string; path: string; type: string; size: number; section?: "observations" | "calculations" };

function PracticalEntry({
  practicals,
  templates,
  submissions,
  lockedCodes,
  submissionOpen,
  windowNote,
  userId,
  profile,
  onDone,
}: {
  practicals: Practical[];
  templates: Template[];
  submissions: Submission[];
  lockedCodes: Set<string>;
  submissionOpen: boolean;
  windowNote: string | null;
  userId: string;
  profile: Profile | null;
  onDone: () => void;
}) {
  const existing = submissions[0];
  const [code, setCode] = useState(existing?.practical_code ?? practicals[0]?.code ?? "");
  const codeLocked = lockedCodes.has(code);
  const template = templates.find((t) => t.code === code);
  const current = submissions.find((s) => s.practical_code === code);
  const saved = (current?.entry ?? {}) as Record<string, unknown>;

  const [tab, setTab] = useState("theory");
  const [aim, setAim] = useState(
    (saved["aim"] as string) ?? template?.aim ?? "To record the practical observations.",
  );
  const [apparatus, setApparatus] = useState(
    (saved["apparatus"] as string) ?? template?.apparatus ?? "",
  );
  const [theory, setTheory] = useState(
    (saved["principle"] as string) ?? template?.principle ?? "",
  );
  const [inference, setInference] = useState(
    (saved["inference"] as string) ?? "",
  );
  const [calcNotes, setCalcNotes] = useState((saved["calc_notes"] as string) ?? "");
  const [viva, setViva] = useState<Record<string, string>>(
    (saved["viva"] as Record<string, string>) ?? {},
  );
  const [rows, setRows] = useState<ObservationRow[]>(
    (saved["observations"] as ObservationRow[]) ??
      (template?.observation_rows?.length ? template.observation_rows : template?.columns?.length
        ? [{ ...Object.fromEntries(template.columns.map((c) => [c.label, ""])) }]
        : []),
  );
  const [attachments, setAttachments] = useState<Attachment[]>(
    (saved["attachments"] as Attachment[]) ?? [],
  );

  const uploadFile = async (file: File, section: "observations" | "calculations") => {
    if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type)) {
      toast.error("Choose a PNG, JPG, WebP image or a PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose a file smaller than 10 MB.");
      return;
    }
    const path = `${userId}/${code}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("submission-attachments").upload(path, file);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAttachments((a) => [...a, { name: file.name, path, type: file.type, size: file.size, section }]);
    toast.success("File attached — save the entry to keep it.");
  };

  const viewFile = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("submission-attachments")
      .createSignedUrl(path, 60);
    if (error || !data) {
      toast.error(error?.message ?? "Could not open the file.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const removeFile = async (a: Attachment) => {
    const { error } = await supabase.storage.from("submission-attachments").remove([a.path]);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAttachments((list) => list.filter((x) => x.path !== a.path));
  };

  const save = useMutation({
    mutationFn: async (status: string) => {
      const entry = {
        aim: template?.aim ?? "",
        apparatus: template?.apparatus ?? "",
        principle: template?.principle ?? "",
        inference,
        calc_notes: calcNotes,
        viva,
        observations: rows,
        attachments,
      };
      const payload = {
        student_id: userId,
        practical_code: code,
        status,
        entry,
        max_marks: template?.max_marks ?? 20,
        submitted_at: status === "review" ? new Date().toISOString() : null,
      };
      const { error } = current
        ? await supabase
            .from("submissions")
            .update(payload)
            .eq("id", current.id)
        : await supabase.from("submissions").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_d, status) => {
      toast.success(
        status === "review"
          ? "Submitted for faculty review"
          : "Draft saved",
      );
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setCell = (i: number, key: string, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const renderUploads = (section: "observations" | "calculations") => {
    const list = attachments.filter((a) => (a.section ?? "observations") === section);
    return (
        <div className="mt-6 space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-sm font-bold">Attached Images & PDFs</p>
            <label className="ml-auto cursor-pointer">
              <span className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
                <Upload className="size-3.5" /> Upload Image or PDF
              </span>
              <input
                aria-label={`Upload ${section} file`}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f, section);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP or PDF, up to 10 MB each. Save the entry to keep files.
          </p>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files attached to this entry yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {list.map((a) => (
                <li key={a.path} className="flex items-center gap-3 px-3 py-2.5">
                  <Paperclip className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(a.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    onClick={() => void viewFile(a.path)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View
                  </button>
                  <button
                    onClick={() => void removeFile(a)}
                    aria-label={`Remove ${a.name}`}
                    title="Remove attachment"
                    className="text-destructive hover:opacity-80"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
    );
  };

  return (
    <Section
      title="Digital Practical Entry & Recording Lab"
      description="Enter clinical background, observation tables, formulas and viva responses."
      actions={
        <>
          <button
            onClick={() => save.mutate("pending")}
            disabled={codeLocked}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => save.mutate("review")}
            disabled={codeLocked || !submissionOpen}
            title={windowNote ?? undefined}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-3.5" /> Submit for Review
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Choose Practical Experiment
          </span>
          <select
            value={code}
            onChange={(e) => {
              const nextCode = e.target.value;
              const nextTemplate = templates.find(t => t.code === nextCode);
              const nextSaved = submissions.find(s => s.practical_code === nextCode)?.entry ?? {};
              setCode(nextCode);
              setAim(nextTemplate?.aim ?? "");
              setApparatus(nextTemplate?.apparatus ?? "");
              setTheory(nextTemplate?.principle ?? "");
              setInference((nextSaved['inference'] as string) ?? "");
              setCalcNotes((nextSaved['calc_notes'] as string) ?? "");
              setViva((nextSaved['viva'] as Record<string,string>) ?? {});
              setRows((nextSaved['observations'] as ObservationRow[]) ?? (nextTemplate?.observation_rows?.length ? nextTemplate.observation_rows : nextTemplate?.columns?.length ? [Object.fromEntries(nextTemplate.columns.map(c => [c.label,'']))] : []));
              setAttachments((nextSaved['attachments'] as Attachment[]) ?? []);
            }}
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {practicals.map((p) => (
              <option key={p.code} value={p.code} disabled={lockedCodes.has(p.code)}>
                {p.code}: {p.title}
                {lockedCodes.has(p.code) ? " (Locked)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Subject Details
          </span>
          <input
            readOnly
            value={`${profile?.full_name ?? "Student"} • Roll ${profile?.roll_number ?? "—"}`}
            className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
          />
        </label>
      </div>

      {codeLocked ? (
        <div className="mt-4 rounded-lg border border-border bg-secondary/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="size-4" /> This experiment is locked
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete the previous practical and get it approved by your faculty
            to unlock this experiment.
          </p>
        </div>
      ) : null}

      {windowNote && !codeLocked ? (
        <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">
          {windowNote}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          ["theory", "1. Aim & Theory"],
          ["observations", "2. Structured Observations"],
          ["calculations", "3. Calculations"],
          ["inference", "4. Inference & Answers"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id ?? "theory")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold",
              tab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "theory" ? (
        <div className="mt-5 space-y-4">
          {[["Aim",template?.aim], ["Principle",template?.principle], ["Apparatus",template?.apparatus], ["Procedure",template?.procedure]].map(([label,value]) => <section key={label}><h3 className="text-sm font-semibold text-primary">{label}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{value || "No published content yet."}</p></section>)}
          {template?.reference_image && <figure><img src={template.reference_image} alt={template.reference_caption || 'Practical reference diagram'} className="mx-auto max-h-80 max-w-full object-contain"/><figcaption className="mt-2 text-center text-xs text-muted-foreground">{template.reference_caption}</figcaption></figure>}
        </div>
      ) : null}

      {tab === "observations" ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-3">
            <p className="font-display text-sm font-bold">
              Table: Structured Observations
            </p>
            <button
              onClick={() =>
                setRows((r) => [
                  ...r,
                  {
                    ...(template?.columns
                      ? Object.fromEntries(template.columns.map((c) => [c.label, ""]))
                      : {}),
                  },
                ])
              }
              className="ml-auto rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
            >
              Add Row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                  {(template?.columns ?? []).map((c) => (
                    <th key={c.label} className="py-2 pr-3">
                      {c.label}
                      {c.unit && c.unit !== "-" ? ` (${c.unit})` : ""}
                    </th>
                  ))}
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {(template?.columns ?? []).map((c) => (
                      <td key={c.label} className="py-1.5 pr-3">
                        <input
                          value={String(r[c.label] ?? "")}
                          onChange={(e) => setCell(i, c.label, e.target.value)}
                          className="w-full min-w-24 rounded-md border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </td>
                    ))}
                    <td className="py-1.5">
                      <button
                        onClick={() => setRows((prev) => prev.filter((_, k) => k !== i))}
                        className="text-xs font-semibold text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!template ? (
              <p className="text-sm text-muted-foreground">
                No observation schema is published for this practical yet.
              </p>
            ) : null}
          </div>
          {renderUploads("observations")}
        </div>
      ) : null}

      {tab === "calculations" ? (
        <div className="mt-5 space-y-4">
          <section><h3 className="text-sm font-semibold text-primary">Calculations / Formula</h3><p className="mt-2 whitespace-pre-wrap text-sm">{template?.formula || "No calculation formula published for this practical."}</p></section>
          <Area
            label="Calculation Steps & Observations"
            value={calcNotes}
            onChange={setCalcNotes}
            rows={5}
          />
          {renderUploads("calculations")}
        </div>
      ) : null}

      {tab === "inference" ? (
        <div className="mt-5 space-y-4">
          <Area
            label="Physiological Inference & Clinical Significance"
            value={inference}
            onChange={setInference}
            rows={4}
          />
          <div>
            <p className="mb-3 font-display text-sm font-bold">
              Self-Assessment Questions
            </p>
            <div className="space-y-3">
              {(template?.viva_questions ?? []).map((q, i) => (
                <label key={i} className="block">
                  <span className="mb-1.5 block text-xs font-semibold">
                    Q{i + 1}. {q}
                  </span>
                  <textarea
                    rows={2}
                    value={viva[String(i)] ?? ""}
                    onChange={(e) =>
                      setViva({ ...viva, [String(i)]: e.target.value })
                    }
                    className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              ))}
              {!template?.viva_questions?.length ? (
                <p className="text-sm text-muted-foreground">
                  No viva prompts are published for this practical yet.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

    </Section>
  );
}

function Area({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function SubmissionStatus({
  submissions,
  byCode,
  onResubmit,
}: {
  submissions: Submission[];
  byCode: Map<string, Practical>;
  onResubmit: () => void;
}) {
  return (
    <Section
      title="Submission Status & Faculty Reviews"
      description="Submissions audit trail with faculty remarks and marks."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="py-2 pr-3">Practical Experiment</th>
              <th className="py-2 pr-3">Submitted</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Marks</th>
              <th className="py-2 pr-3">Faculty Remarks</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  No practical submissions logged yet. Submit a record to see it here.
                </td>
              </tr>
            ) : (
              submissions.map((s, i) => (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3">
                    <span className="block font-medium">
                      {byCode.get(s.practical_code)?.title ?? s.practical_code}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      SUB-2026-{4800 + i}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    {s.submitted_at ? s.submitted_at.slice(0, 10) : "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    {s.marks != null ? `${s.marks}/${s.max_marks}` : "—"}
                  </td>
                  <td className="max-w-xs py-2.5 pr-3 text-xs text-muted-foreground">
                    {s.remarks ?? "—"}
                  </td>
                  <td className="py-2.5">
                    <button
                      onClick={onResubmit}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                    >
                      {s.status === "correction" ? "Re-Submit" : "Inspect"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function AttendanceView({
  sessions,
  attendance,
  pct,
  present,
  marked,
}: {
  sessions: Session[];
  attendance: Attendance[];
  pct: number;
  present: number;
  marked: number;
}) {
  const byId = new Map(attendance.map((a) => [a.session_id, a.status]));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Attendance" value={`${pct}%`} note="Minimum 80% required" tone={pct >= 80 ? "success" : "danger"} />
        <Metric label="Sessions Present" value={`${present} / ${marked || sessions.length}`} />
        <Metric label="Scheduled Ahead" value={`${sessions.filter((s) => s.status === "Scheduled").length}`} note="Upcoming lab sessions" tone="warning" />
      </div>

      <Section title="Attendance Criteria Checklist">
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Check className={cn("size-4", pct >= 80 ? "text-success" : "text-destructive")} />
            University Minimum Eligibility: 80% — current {pct}%
          </li>
          <li className="flex items-center gap-2">
            <Check className="size-4 text-success" />
            Hematology Lab Sessions: {sessions.filter((s) => s.venue?.includes("Hematology")).length} sessions listed
          </li>
          <li className="flex items-center gap-2">
            <Check className="size-4 text-success" />
            Clinical Physiology: {sessions.filter((s) => !s.venue?.includes("Hematology")).length} sessions listed
          </li>
        </ul>
      </Section>

      <Section title="Session-wise Attendance Log">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                <th className="py-2 pr-3">Session #</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Practical Topic</th>
                <th className="py-2 pr-3">Venue</th>
                <th className="py-2 pr-3">Faculty In-Charge</th>
                <th className="py-2">Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-mono text-xs">{s.id}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{s.session_date}</td>
                  <td className="py-2.5 pr-3">{s.topic}</td>
                  <td className="py-2.5 pr-3 text-xs">{s.venue}</td>
                  <td className="py-2.5 pr-3 text-xs">{s.faculty_name}</td>
                  <td className="py-2.5">
                    <StatusBadge status={byId.get(s.id) ?? "Scheduled"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function AnalyticsView({
  practicals,
  submissions,
  avgScore,
  avgMax,

  completionPct,
  attendancePct,
}: {
  practicals: Practical[];
  submissions: Submission[];
  avgScore: number;
  avgMax: number;
  completionPct: number;
  attendancePct: number;
}) {
  const cats = [...new Set(practicals.map((p) => p.category))];
  const data = cats.map((c) => {
    const list = practicals.filter((p) => p.category === c);
    const done = list.filter((p) =>
      submissions.some((s) => s.practical_code === p.code && s.status === "approved"),
    );
    return { category: c, approved: done.length, assigned: list.length };
  });
  const decisions = [
    { name: "Approved", value: submissions.filter((s) => s.status === "approved").length },
    { name: "Under Review", value: submissions.filter((s) => s.status === "review").length },
    { name: "Corrections", value: submissions.filter((s) => s.status === "correction").length },
  ].filter((d) => d.value > 0);
  const colors = ["#059669", "#d97706", "#e11d48"];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Average Lab Score" value={`${avgScore} / ${avgMax}`} />
        <Metric label="Certified Experiments" value={`${submissions.filter((s) => s.status === "approved").length} of ${practicals.length}`} note={`${completionPct}% certified`} />
        <Metric label="Work in Progress" value={`${submissions.filter((s) => s.status === "review" || s.status === "correction").length} Records`} tone="warning" />
        <Metric label="Lab Attendance" value={`${attendancePct}%`} tone={attendancePct >= 80 ? "success" : "danger"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Category-wise Completion & Marks">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="assigned" fill="#c7d2fe" name="Assigned" />
                <Bar dataKey="approved" fill="#4f46e5" name="Approved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Submission Decisions">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={decisions} dataKey="value" nameKey="name" outerRadius={90} label>
                  {decisions.map((d, i) => (
                    <Cell key={d.name} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>
    </div>
  );
}

type GrowthStats = {
  avg_pct: number;
  certified: number;
  rank: number;
  total_students: number;
};

const growthStatsOptions = queryOptions({
  queryKey: ["student-growth-stats"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("student_growth_stats");
    if (error) throw error;
    const row = (data as GrowthStats[] | null)?.[0];
    return (
      row ?? { avg_pct: 0, certified: 0, rank: 1, total_students: 1 }
    );
  },
});

function FeedbackView({
  submissions,
  byCode,
}: {
  submissions: Submission[];
  byCode: Map<string, Practical>;
}) {
  const growth = useSuspenseQuery(growthStatsOptions);
  const { avg_pct, certified, rank, total_students } = growth.data;
  const stars = Math.max(0, Math.min(5, Math.round(avg_pct / 20)));
  const remarks = submissions.filter((s) => (s.remarks ?? "").length > 5);
  return (
    <div className="space-y-6">
      <Section
        title="Your Growth"
        description="Your standing among classmates, based on certified records and marks."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4 text-center">
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Your Rank
            </p>
            <p className="font-display mt-2 text-3xl font-bold">
              #{rank}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                of {total_students}
              </span>
            </p>
          </div>
          <div className="rounded-lg border border-border p-4 text-center">
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Star Rating
            </p>
            <div className="mt-2 flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-6",
                    i <= stars
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30",
                  )}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {Math.round(avg_pct)}% average score
            </p>
          </div>
          <div className="rounded-lg border border-border p-4 text-center">
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Certified Records
            </p>
            <p className="font-display mt-2 text-3xl font-bold">{certified}</p>
          </div>
        </div>
      </Section>
      <Section title="Faculty Remarks">
        {remarks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No faculty feedback yet. Remarks appear once your records are reviewed.
          </p>
        ) : (
          <ul className="space-y-3">
            {remarks.map((s) => (
              <li key={s.id} className="rounded-lg border border-border p-4">
                <p className="font-display text-sm font-bold">
                  {byCode.get(s.practical_code)?.title ?? s.practical_code}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">“{s.remarks}”</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function NotificationsView({
  items,
  onOpen,
  onReload,
}: {
  items: Notification[];
  onOpen: (v: string) => void;
  onReload: () => void;
}) {
  const markAll = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    if (error) toast.error(error.message);
    else toast.success("All notifications marked as read");
    onReload();
  };
  return (
    <Section
      title="Academic & Lab Notifications"
      actions={
        <button
          onClick={markAll}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
        >
          Mark All as Read
        </button>
      }
    >
      <ul className="space-y-3">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">No notifications yet.</li>
        ) : (
          items.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4",
                n.is_read ? "border-border" : "border-primary/30 bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.type === "warning"
                    ? "bg-warning"
                    : n.type === "success"
                      ? "bg-success"
                      : "bg-cyan",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{n.title}</span>
                <span className="block text-sm text-muted-foreground">{n.message}</span>
                <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </span>
              <button
                onClick={() => onOpen(n.action_view ?? "notifications")}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
              >
                Open
              </button>
            </li>
          ))
        )}
      </ul>
    </Section>
  );
}

function JournalView({
  profile,
  submissions,
  byCode,
}: {
  profile: Profile | null;
  submissions: Submission[];
  byCode: Map<string, Practical>;
}) {
  const rows = submissions.filter((s) => s.status === "approved" || s.status === "review");
  return (
    <Section
      title="Accredited Digital Practical Journal"
      actions={
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Printer className="size-3.5" /> Print / Save PDF
        </button>
      }
    >
      <div className="rounded-lg border border-border p-6">
        <div className="text-center">
          <p className="font-display text-lg font-extrabold">
            BGS MEDICAL COLLEGE HOSPITAL
          </p>
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Department of Physiology • MBBS Phase I
          </p>
          <p className="mt-3 font-display text-base font-bold">
            CERTIFIED DIGITAL PRACTICAL JOURNAL
          </p>
        </div>
        <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["Student Name:", profile?.full_name ?? "—"],
            ["Roll Number:", profile?.roll_number ?? "—"],
            ["Register Number:", profile?.register_number ?? "—"],
            ["Batch:", profile?.batch_id ?? "—"],
            ["Academic Phase:", profile?.academic_phase ?? "—"],
            ["Head of Dept:", "Prof. (Dr.) R. Sengupta, MD"],
          ].map(([l, v]) => (
            <p key={l}>
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {l}
              </span>{" "}
              <span className="font-semibold">{v}</span>
            </p>
          ))}
        </div>
        <p className="mt-5 text-sm italic">
          This is to certify that {profile?.full_name || "the student"}, Roll No.{" "}
          {profile?.roll_number || "—"}, has satisfactorily performed and digitally
          recorded the prescribed curriculum of practical physiology experiments in
          the laboratories of BGS Medical College Hospital as mandated by the National
          Medical Commission (NMC) regulations during the academic year 2026-2027.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Practical Experiment Title</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Marks</th>
                <th className="py-2">Certification</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No certified records yet.
                  </td>
                </tr>
              ) : (
                rows.map((s, i) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs">{i + 1}</td>
                    <td className="py-2 pr-3">
                      {byCode.get(s.practical_code)?.title ?? s.practical_code}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {byCode.get(s.practical_code)?.category}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {s.marks ?? "—"} / {s.max_marks}
                    </td>
                    <td className="py-2 text-xs">
                      {s.status === "approved" ? "✓ Certified" : "⏳ Submitted for Review"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-4 text-xs sm:grid-cols-3">
          {[
            ["CANDIDATE", "Candidate Signature"],
            ["SIGNED", "Faculty Evaluator"],
            ["ACCREDITED", "Head, Department of Physiology"],
          ].map(([t, s]) => (
            <div key={t} className="rounded-md border border-border p-3">
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {t}
              </p>
              <p className="mt-4 border-t border-border pt-1 font-semibold">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function ResourcesView() {
  const cards = [
    {
      title: "NMC Competency-Based Practical Manual",
      copy: "Full official curriculum guide for hematology, cardiovascular, and respiratory physiology.",
      meta: "PDF • 4.8 MB • Updated Aug 2026",
      action: "Download Manual",
      warn: "NMC Practical Manual is not uploaded yet. Please ask the Department Admin.",
    },
    {
      title: "Normal Clinical Physiological Reference Values",
      copy: "Standard parameters for blood pressure, ECG intervals, lung volumes, and ESR.",
      meta: "Quick Reference Guide • PDF",
      action: "Download Reference",
      warn: "Clinical Reference Values sheet is not uploaded yet. Please ask the Department Admin.",
    },
    {
      title: "Spirometry & Blood Pressure Demonstration Videos",
      copy: "Demonstration of auscultatory gap detection, posture changes, and spirometer calibration.",
      meta: "BGS Medical College Hospital Media Portal",
      action: "Watch Demos",
      warn: "Video Library is not configured yet. Please ask the Department Admin.",
    },
  ];
  return (
    <div className="space-y-6">
      <Section title="Physiology Learning Resources & Guidelines">
        <div className="grid gap-4 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.title} className="rounded-lg border border-border p-5">
              <p className="font-display text-sm font-bold">{c.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.copy}</p>
              <p className="mt-3 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                {c.meta}
              </p>
              <button
                onClick={() => toast.warning(c.warn)}
                className="mt-4 w-full rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                {c.action}
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
