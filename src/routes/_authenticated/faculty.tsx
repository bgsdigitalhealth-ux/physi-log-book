import { WebText, useWebText } from "@/components/website-content";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  queryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ClipboardList, Minus, Paperclip, Plus, Send, ShieldCheck, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell, Metric, Section, StatusBadge } from "@/components/app-shell";
import { authContextOptions, authQueryOptions } from "@/lib/auth";
import { studentQueryOptions } from "./student";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PracticalTemplateManager } from "@/components/practical-template-manager";
import { BatchManager } from "@/components/batch-manager";
import { ProfilePhoto } from "@/components/profile-photo";
import { VivaQuestions } from "@/components/viva-questions";
import { Button } from "@/components/ui/button";
import { ChangePassword } from "@/components/change-password";
import { validateMarks } from "@/lib/assessment";
import { submissionWindowOptions } from "@/lib/submission-window";

type Batch = {
  id: string;
  name: string;
  roll_range: string | null;
  student_count: number;
  mentor: string | null;
  venue: string | null;
};
type StudentRef = {
  full_name: string;
  roll_number: string | null;
  batch_id: string | null;
  photo_path: string | null;
} | null;
type Review = {
  id: string;
  student_id: string;
  practical_code: string;
  status: string;
  marks: number | null;
  max_marks: number;
  remarks: string | null;
  submitted_at: string | null;
  entry: Record<string, unknown>;
  profiles: StudentRef;
};
type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export const facultyQueryOptions = {
  reviews: () =>
    queryOptions({
      queryKey: ["faculty-reviews"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("submissions")
          .select(
            "id, student_id, practical_code, status, marks, max_marks, remarks, submitted_at, entry, profiles!submissions_student_id_fkey(full_name, roll_number, batch_id, photo_path)",
          )
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as unknown as Review[];
      },
    }),
  batches: () =>
    queryOptions({
      queryKey: ["batches"],
      queryFn: async () => {
        const { data, error } = await supabase.from("batches").select("*").order("id");
        if (error) throw error;
        return data as Batch[];
      },
    }),
};

export const Route = createFileRoute("/_authenticated/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty Console | Physiology Practical Record" },
      {
        name: "description",
        content:
          "Faculty console for reviewing, grading and certifying MBBS Phase I physiology practical records.",
      },
      {
        property: "og:title",
        content: "Faculty Console | Physiology Practical Record",
      },
      {
        property: "og:description",
        content:
          "Review student practical submissions, assign marks, return records for correction and certify journals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(authQueryOptions);
    await Promise.all([
      context.queryClient.ensureQueryData(facultyQueryOptions.reviews()),
      context.queryClient.ensureQueryData(facultyQueryOptions.batches()),
      context.queryClient.ensureQueryData(studentQueryOptions.practicals()),
      context.queryClient.ensureQueryData(studentQueryOptions.templates()),
      context.queryClient.ensureQueryData(studentQueryOptions.sessions()),
    ]);
  },
  component: FacultyPage,
});

function FacultyPage() {
  const webText = useWebText();
  const [view, setView] = useState("dashboard");
  const auth = useSuspenseQuery(authContextOptions);
  const reviews = useSuspenseQuery(facultyQueryOptions.reviews());
  const batches = useSuspenseQuery(facultyQueryOptions.batches());
  const practicals = useSuspenseQuery(studentQueryOptions.practicals());
  const templates = useSuspenseQuery(studentQueryOptions.templates());
  const sessions = useSuspenseQuery(studentQueryOptions.sessions());

  const notifications = useSuspenseQuery(
    queryOptions({
      queryKey: ["notifications", auth.data.userId],
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

  const queryClient = useQueryClient();
  const byCode = new Map(practicals.data.map((p) => [p.code, p]));
  const pending = reviews.data.filter((r) => r.status === "review");
  const corrections = reviews.data.filter((r) => r.status === "correction");
  const approved = reviews.data.filter((r) => r.status === "approved");
  const myBatches = batches.data.filter(
    (b) => b.mentor === (auth.data.profile?.full_name || auth.data.profile?.designation),
  );

  const decide = useMutation({
    mutationFn: async (input: {
      id: string;
      studentId: string;
      title: string;
      status: "approved" | "correction";
      marks: number | null;
      remarks: string;
    }) => {
      const record = reviews.data.find((r) => r.id === input.id);
      if (!record) throw new Error("This record is no longer available.");
      validateMarks(input.marks, record.max_marks);
      const { error } = await supabase
        .from("submissions")
        .update({
          status: input.status,
          marks: input.marks,
          remarks: input.remarks,
          reviewed_by: auth.data.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.id).select("id").single();
      if (error) throw error;
      const { error: nErr } = await supabase.from("notifications").insert({
        user_id: input.studentId,
        title:
          input.status === "approved"
            ? `Approved: ${input.title}`
            : `Correction Requested: ${input.title}`,
        message:
          input.remarks ||
          (input.status === "approved"
            ? "Certified by faculty."
            : "Please review faculty comments and resubmit."),
        type: input.status === "approved" ? "success" : "warning",
        action_view: input.status === "approved" ? "download-print" : "practical-entry",
      });
      if (nErr) toast.warning("Record saved, but the student notification could not be delivered.");
    },
    onSuccess: (_d, v) => {
      toast.success(
        v.status === "approved" ? "Record certified" : "Returned for correction",
      );
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      role="faculty"
      activeView={view}
      onSelectView={setView}
      user={{
        name: auth.data.profile?.full_name || "Faculty",
        email: auth.data.profile?.email ?? auth.data.email,
        meta: auth.data.profile?.designation ?? "Faculty Member",
      }}
      counts={{
        "reviews-approvals": pending.length,
        "student-records": reviews.data.length,
        notifications: notifications.data.filter((n) => !n.is_read).length,
      }}
      search={{
        value: "",
        onChange: () => undefined,
        placeholder: "Search students, roll no, practicals...",
      }}
    >
      {view === "dashboard" ? (
        <div className="space-y-6">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              <WebText text={"Department of Physiology • MBBS Phase I"} /></p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">
              <WebText text={"Welcome,"} />{auth.data.profile?.full_name || "Faculty"}
            </h1>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label={webText("Assigned Batches")}
              value={`${myBatches.length || batches.data.length}`}
              note={webText("Under your mentorship")}
              onClick={() => setView("my-batches")}
            />
            <Metric
              label={webText("Pending Reviews")}
              value={`${pending.length}`}
              note={webText("Submissions awaiting review")}
              tone="warning"
              onClick={() => setView("reviews-approvals")}
            />
            <Metric
              label={webText("Returned for Correction")}
              value={`${corrections.length}`}
              note={webText("Records returned for revision")}
              tone="danger"
              onClick={() => setView("student-records")}
            />
            <Metric
              label={webText("Approved & Certified")}
              value={`${approved.length}`}
              note={webText("Signed records")}
              tone="success"
              onClick={() => setView("student-records")}
            />
          </div>

          <Section title={webText("Review Queue")} description={webText("Oldest submissions first.")}>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                <WebText text={"Nothing awaiting evaluation right now."} /></p>
            ) : (
              <ul className="space-y-3">
                {pending.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {byCode.get(r.practical_code)?.title ?? r.practical_code}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {r.profiles?.full_name} <WebText text={"• Roll"} />{r.profiles?.roll_number ?? "—"}
                      </span>
                    </span>
                    <StatusBadge status={r.status} />
                    <button
                      onClick={() => setView("reviews-approvals")}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                    >
                      <WebText text={"Open"} /></button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      ) : null}

      {view === "my-batches" ? <BatchesView batches={batches.data} /> : null}

      {view === "student-records" ? (
        <RecordsView reviews={reviews.data} byCode={byCode} />
      ) : null}

      {view === "reviews-approvals" ? (
        <ReviewQueue
          reviews={reviews.data}
          templates={templates.data}
          byCode={byCode}
          onDecide={(input) => decide.mutate(input)}
          busy={decide.isPending}
        />
      ) : null}

      {view === "attendance" ? (
        <FacultyAttendance batches={batches.data} sessions={sessions.data} />
      ) : null}

      {view === "practical-templates" ? (
        <PracticalTemplateManager practicals={practicals.data} templates={templates.data} />
      ) : null}

      {view === "practical-sessions" ? (
        <SessionsView sessions={sessions.data} batches={batches.data} />
      ) : null}

      {view === "viva-upload" ? (
        <Section title={webText("Upload Viva Questions")}>
          <VivaQuestions editable />
        </Section>
      ) : null}

      {view === "reports-analytics" ? (
        <ReportsView reviews={reviews.data} practicals={practicals.data} />
      ) : null}

      {view === "notifications" ? (
        <Section title={webText("Notifications")}>
          <ul className="space-y-3">
            {notifications.data.length === 0 ? (
              <li className="text-sm text-muted-foreground"><WebText text={"No notifications yet."} /></li>
            ) : (
              notifications.data.map((n) => (
                <li key={n.id} className="rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                </li>
              ))
            )}
          </ul>
        </Section>
      ) : null}

      {view === "settings" ? <FacultySettings auth={auth.data} /> : null}
    </AppShell>
  );
}

function BatchesView({ batches }: { batches: Batch[] }) {
  const webText = useWebText();
  return (
    <BatchManager
      batches={batches}
      title={webText("My Assigned Batches")}
      description={webText("Cohorts, roll ranges, lead mentors and assigned labs. You can create, edit and delete batches here.")}
    />
  );
}

function RecordsView({
  reviews,
  byCode,
}: {
  reviews: Review[];
  byCode: Map<string, { title: string; category: string }>;
}) {
  const webText = useWebText();
  const queryClient = useQueryClient();
  const auth = useSuspenseQuery(authContextOptions);
  const [editId, setEditId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const save = useMutation({
    mutationFn: async (input: { id: string; marks: number | null; max: number }) => {
      validateMarks(input.marks, input.max);
      const { error } = await supabase
        .from("submissions")
        .update({ marks: input.marks, reviewed_by: auth.data.userId, reviewed_at: new Date().toISOString() })
        .eq("id", input.id).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marks saved");
      setEditId(null);
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Section
      title={webText("Student Records Master Log")}
      description={webText("Every practical record submitted across your batches. Enter or edit marks here.")}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="py-2 pr-3"><WebText text={"Roll No"} /></th>
              <th className="py-2 pr-3"><WebText text={"Student Name"} /></th>
              <th className="py-2 pr-3"><WebText text={"Batch"} /></th>
              <th className="py-2 pr-3"><WebText text={"Practical Experiment"} /></th>
              <th className="py-2 pr-3"><WebText text={"Status"} /></th>
              <th className="py-2 pr-3"><WebText text={"Marks"} /></th>
              <th className="py-2"><WebText text={"Action"} /></th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                  <WebText text={"No student records submitted yet."} /></td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    {r.profiles?.roll_number ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2">
                      <ProfilePhoto
                        path={r.profiles?.photo_path}
                        name={r.profiles?.full_name ?? "?"}
                        className="size-7"
                      />
                      {r.profiles?.full_name ?? "—"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    {r.profiles?.batch_id ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    {byCode.get(r.practical_code)?.title ?? r.practical_code}
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    {editId === r.id ? (
                      <span className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={r.max_marks}
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          aria-label={webText("Marks")}
                          className="w-16 rounded-md border border-border px-2 py-1 text-sm"
                        />
                        / {r.max_marks}
                      </span>
                    ) : r.marks != null ? (
                      `${r.marks}/${r.max_marks}`
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5">
                    {editId === r.id ? (
                      <span className="flex gap-1">
                        <Button size="sm"
                          disabled={save.isPending}
                          onClick={() =>
                            save.mutate({
                              id: r.id,
                              marks: value === "" ? null : Number(value),
                              max: r.max_marks,
                            })
                          }
                          className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                        >
                          <WebText text={"Save"} /></Button>
                        <Button size="sm" variant="outline"
                          onClick={() => setEditId(null)}
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                        >
                          <WebText text={"Cancel"} /></Button>
                      </span>
                    ) : (
                      <Button size="sm" variant="outline"
                        onClick={() => {
                          setEditId(r.id);
                          setValue(r.marks != null ? String(r.marks) : "");
                        }}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                      >
                        {r.marks != null ? webText("Edit Marks") : webText("Enter Marks")}
                      </Button>
                    )}
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

function ReviewQueue({
  reviews,
  templates,
  byCode,
  onDecide,
  busy,
}: {
  reviews: Review[];
  templates: { code: string; columns: { label: string; unit: string }[]; viva_questions: string[] }[];
  byCode: Map<string, { title: string }>;
  onDecide: (input: {
    id: string;
    studentId: string;
    title: string;
    status: "approved" | "correction";
    marks: number | null;
    remarks: string;
  }) => void;
  busy: boolean;
}) {
  const webText = useWebText();
  const queue = reviews.filter((r) => r.status === "review" || r.status === "correction");
  const [openId, setOpenId] = useState<string | null>(queue[0]?.id ?? null);
  const active = queue.find((r) => r.id === openId) ?? queue[0];
  const [drafts, setDrafts] = useState<Record<string, { marks: string; remarks: string }>>({});
  const draft = active ? drafts[active.id] : undefined;
  const marks = draft?.marks ?? (active?.marks != null ? String(active.marks) : "");
  const remarks = draft?.remarks ?? active?.remarks ?? "";
  const updateDraft = (change: Partial<{ marks: string; remarks: string }>) => {
    if (!active) return;
    setDrafts((previous) => ({ ...previous, [active.id]: { marks, remarks, ...change } }));
  };

  const template = active ? templates.find((t) => t.code === active.practical_code) : undefined;
  const rows = (active?.entry?.["observations"] as Record<string, unknown>[] | undefined) ?? [];

  return (
    <Section
      title={webText("Reviews & Approvals")}
      description={webText("Evaluate the submitted record, assign marks and certify or return it.")}
      actions={
        <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase">
          {queue.length} <WebText text={"Pending Reviews"} /></span>
      }
    >
      {queue.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <WebText text={"No submissions awaiting faculty review."} /></p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {queue.map((r) => (
              <li key={r.id}>
                <Button variant="outline"
                  onClick={() => {
                    setOpenId(r.id);
                  }}
                  className={cn(
                    "h-auto w-full flex-col items-start whitespace-normal rounded-lg border p-3 text-left",
                    active?.id === r.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  <span className="block text-sm font-semibold">
                    {byCode.get(r.practical_code)?.title ?? r.practical_code}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {r.profiles?.full_name} <WebText text={"• Roll"} />{r.profiles?.roll_number ?? "—"}
                  </span>
                </Button>
              </li>
            ))}
          </ul>

          {active ? (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                <p className="font-display text-sm font-bold">
                  {byCode.get(active.practical_code)?.title ?? active.practical_code}
                </p>
                <StatusBadge status={active.status} />
              </div>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <ProfilePhoto
                  path={active.profiles?.photo_path}
                  name={active.profiles?.full_name ?? "?"}
                  className="size-7"
                />
                {active.profiles?.full_name} <WebText text={"• Roll"} />{active.profiles?.roll_number ?? "—"} <WebText text={"• Submitted"} />{webText(" ")}
                {active.submitted_at ? active.submitted_at.slice(0, 10) : webText("—")}
              </p>

              <div className="mt-4 space-y-3">
                {[['Aim', 'aim'], ['Principle', 'principle'], ['Apparatus', 'apparatus']].map(([label, field]) => (
                  <section key={field}>
                    <h3 className="text-sm font-semibold">{webText(label)}</h3>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{String(active.entry[field ?? ''] ?? '—')}</p>
                  </section>
                ))}
              </div>
              <h3 className="mt-4 text-sm font-semibold"><WebText text={"Student Observations"} /></h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                      {(template?.columns ?? []).map((c) => (
                        <th key={c.label} className="py-1.5 pr-2">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/60">
                        {(template?.columns ?? []).map((c) => (
                          <td key={c.label} className="py-1.5 pr-2 font-mono">
                            {String(row[c.label] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rows.length === 0 ? (
                      <tr>
                        <td className="py-3 text-muted-foreground">
                          <WebText text={"No observation table recorded for this submission."} /></td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {((active.entry?.["attachments"] as { name: string; path: string }[] | undefined) ?? []).length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    <WebText text={"Student Attachments"} /></p>
                  <ul className="space-y-1.5">
                    {(active.entry["attachments"] as { name: string; path: string }[]).map((a) => (
                      <li key={a.path}>
                        <button
                          onClick={async () => {
                            const { data, error } = await supabase.storage
                              .from("submission-attachments")
                              .createSignedUrl(a.path, 60);
                            if (error || !data) toast.error(error?.message ?? "Could not open the file.");
                            else window.open(data.signedUrl, "_blank");
                          }}
                          className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                        >
                          <Paperclip className="size-3.5" /> {a.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                <section><h3 className="text-sm font-semibold"><WebText text={"Calculations"} /></h3><p className="mt-1 whitespace-pre-wrap break-words text-sm">{String(active.entry['calc_notes'] ?? '—')}</p></section>
                <section><h3 className="text-sm font-semibold"><WebText text={"Result / Inference"} /></h3><p className="mt-1 whitespace-pre-wrap break-words text-sm">{String(active.entry['inference'] ?? '—')}</p></section>
                {template?.viva_questions.map((question, index) => (
                  <section key={index}><h3 className="text-sm font-semibold">{question}</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm">{String((active.entry['viva'] as Record<string, unknown> | undefined)?.[String(index)] ?? '—')}</p></section>
                ))}
              </div>
              <div className="mt-5 grid gap-3 border-t border-border pt-4">
                <h3 className="font-display text-base font-bold"><WebText text={"Review & Assessment"} /></h3>
                <div>
                  <label htmlFor={`assessment-${active.id}`} className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    <WebText text={"Marks (out of"} />{active.max_marks})
                  </label>
                  <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" title={webText("Decrease marks")} aria-label={webText("Decrease marks")} disabled={busy || marks === "" || Number(marks) <= 0} onClick={() => updateDraft({ marks: String(Math.max(0, Number(marks) - 1)) })}><Minus /></Button>
                  <input
                    id={`assessment-${active.id}`}
                    type="number"
                    min={0}
                    max={active.max_marks}
                    value={marks}
                    step={1}
                    onChange={(e) => updateDraft({ marks: e.target.value })}
                    className="w-20 rounded-md border border-border bg-background px-3 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button variant="outline" size="icon" title={webText("Increase marks")} aria-label={webText("Increase marks")} disabled={busy || Number(marks) >= active.max_marks} onClick={() => updateDraft({ marks: String(Math.min(active.max_marks, Number(marks || 0) + 1)) })}><Plus /></Button>
                  <span className="font-mono text-sm text-muted-foreground">/ {active.max_marks}</span>
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    <WebText text={"Faculty Remarks"} /></span>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e) => updateDraft({ remarks: e.target.value })}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder={webText("Comments returned to the student")}
                  />
                </label>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground"><WebText text={"Quick Feedback (optional)"} /></h4>
                  <div className="flex flex-wrap gap-2">{["Good work", "Needs improvement", "Check calculations", "Label diagram clearly"].map(feedback => <Button key={feedback} size="sm" variant="outline" onClick={() => updateDraft({ remarks: remarks ? `${remarks}\n${feedback}` : feedback })}>{feedback}</Button>)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm"
                    disabled={busy}
                    onClick={() =>
                      onDecide({
                        id: active.id,
                        studentId: active.student_id,
                        title: byCode.get(active.practical_code)?.title ?? active.practical_code,
                        status: "approved",
                        marks: marks === "" ? null : Number(marks),
                        remarks,
                      })
                    }
                  >
                    <Check className="size-3.5" /> <WebText text={"Approve & Save"} /></Button>
                  <Button size="sm" variant="outline"
                    disabled={busy}
                    onClick={() =>
                      onDecide({
                        id: active.id,
                        studentId: active.student_id,
                        title: byCode.get(active.practical_code)?.title ?? active.practical_code,
                        status: "correction",
                        marks: marks === "" ? null : Number(marks),
                        remarks,
                      })
                    }
                    className="flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
                  >
                    <X className="size-3.5" /> <WebText text={"Return for Correction"} /></Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Section>
  );
}

function FacultyAttendance({
  batches,
  sessions,
}: {
  batches: Batch[];
  sessions: { id: string; session_date: string; topic: string; batch_id: string | null; venue: string | null }[];
}) {
  const webText = useWebText();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const session = sessions.find((s) => s.id === sessionId);
  const [students, setStudents] = useState<
    {
      user_id: string;
      full_name: string;
      roll_number: string | null;
      is_held: boolean;
      hold_reason: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [marked, setMarked] = useState<Record<string, string>>({});

  const load = async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, roll_number, is_held, hold_reason")
      .eq("batch_id", session.batch_id ?? "")
      .eq("is_active", true);
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      setStudents(data);
      const { data: existing } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("session_id", session.id);
      setMarked(
        Object.fromEntries((existing ?? []).map((e) => [e.student_id, e.status])),
      );
    }
  };

  const mark = async (studentId: string, status: string) => {
    const { error } = await supabase.from("attendance").upsert(
      {
        session_id: session?.id ?? "",
        student_id: studentId,
        status,
      },
      { onConflict: "session_id,student_id" },
    );
    if (error) toast.error(error.message);
    else {
      setMarked((m) => ({ ...m, [studentId]: status }));
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    }
  };

  const toggleHold = async (studentId: string, hold: boolean) => {
    const reason = hold
      ? window.prompt(
          "Reason for placing this student's records on hold:",
          "Absent from practical session",
        )
      : null;
    if (hold && reason === null) return;
    const args: { _student_id: string; _held: boolean; _reason?: string } = {
      _student_id: studentId,
      _held: hold,
    };
    if (reason) args._reason = reason;
    const { error } = await supabase.rpc("set_student_hold", args);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      hold
        ? "Student records & dashboard placed on hold"
        : "Hold removed — student access restored",
    );
    setStudents((list) =>
      list.map((s) =>
        s.user_id === studentId
          ? { ...s, is_held: hold, hold_reason: reason }
          : s,
      ),
    );
  };

  return (
    <Section
      title={webText("Mark Lab Attendance")}
      description={webText("Attendance against the 80% university exam eligibility threshold.")}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            <WebText text={"Session"} /></span>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.session_date} — {s.topic}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            onClick={load}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <WebText text={"Load Batch Roster"} /></button>
        </div>
      </div>

      {students.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                <th className="py-2 pr-3"><WebText text={"Roll No"} /></th>
                <th className="py-2 pr-3"><WebText text={"Student Name"} /></th>
                <th className="py-2 pr-3"><WebText text={"Mark"} /></th>
                <th className="py-2"><WebText text={"Record Hold"} /></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.user_id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-mono text-xs">{s.roll_number ?? "—"}</td>
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2">
                      {s.full_name}
                      {s.is_held ? (
                        <span
                          className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive uppercase"
                          title={s.hold_reason ?? "On hold"}
                        >
                          <WebText text={"On Hold"} /></span>
                      ) : null}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex gap-2">
                      {["Present", "Absent"].map((st) => (
                        <button
                          key={st}
                          onClick={() => mark(s.user_id, st)}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs font-semibold",
                            marked[s.user_id] === st
                              ? st === "Present"
                                ? "border-success bg-success-soft text-success"
                                : "border-destructive/40 bg-destructive/5 text-destructive"
                              : "border-border hover:bg-secondary",
                          )}
                        >
                          {webText(st)}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5">
                    <button
                      onClick={() => toggleHold(s.user_id, !s.is_held)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-semibold",
                        s.is_held
                          ? "border-success/40 text-success hover:bg-success-soft"
                          : "border-destructive/40 text-destructive hover:bg-destructive/5",
                      )}
                    >
                      {s.is_held ? webText("Unhold") : webText("Hold")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {loading ? webText("Loading roster…") : webText("Select a session and load the batch roster to mark attendance.")}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {batches.length} <WebText text={"academic batches are registered in the department."} /></p>
    </Section>
  );
}

function TemplatesView({
  templates,
}: {
  templates: {
    code: string;
    title: string;
    category: string;
    author: string | null;
    version: string;
    status: string;
    max_marks: number;
    aim: string;
    principle: string;
    apparatus: string;
    procedure: string;
    formula: string;
    viva_questions: string[];
  }[];
}) {
  const webText = useWebText();
  const [open, setOpen] = useState<string | null>(templates[0]?.code ?? null);
  return (
    <Section
      title={webText("Practical Templates")}
      description={webText("Published experiment content, observation schemas and viva banks.")}
    >
      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.code} className="rounded-lg border border-border">
            <button
              onClick={() => setOpen(open === t.code ? null : t.code)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-sm font-bold">{t.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {t.category} • {t.author ?? "Unattributed"} • {t.version}
                </span>
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase",
                  t.status === "Published"
                    ? "bg-success-soft text-success"
                    : "bg-warning-soft text-warning",
                )}
              >
                {t.status}
              </span>
            </button>
            {open === t.code ? (
              <div className="space-y-3 border-t border-border p-4 text-sm">
                <Field label={webText("Aim")} value={t.aim} />
                <Field label={webText("Principle")} value={t.principle} />
                <Field label={webText("Apparatus")} value={t.apparatus} />
                <Field label={webText("Procedure")} value={t.procedure} />
                <Field label={webText("Formula")} value={t.formula} mono />
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    <WebText text={"Viva questions"} /></p>
                  <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs">
                    {(t.viva_questions ?? []).map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ol>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  <WebText text={"Max marks"} />{t.max_marks}
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const webText = useWebText();
  return (
    <div>
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {webText(label)}
      </p>
      <p className={cn("mt-1 whitespace-pre-line text-sm", mono && "font-mono text-xs")}>
        {value || "—"}
      </p>
    </div>
  );
}

function SessionsView({
  sessions,
  batches,
}: {
  sessions: {
    id: string;
    session_date: string;
    topic: string;
    venue: string | null;
    faculty_name: string | null;
    status: string;
    batch_id: string | null;
  }[];
  batches: Batch[];
}) {
  const webText = useWebText();
  const queryClient = useQueryClient();
  const move = useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const { error } = await supabase
        .from("sessions")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session updated");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Section
      title={webText("Practical Lab Sessions")}
      description={webText("Schedule, faculty allocation and lab rooms across batches.")}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="py-2 pr-3"><WebText text={"Session"} /></th>
              <th className="py-2 pr-3"><WebText text={"Date"} /></th>
              <th className="py-2 pr-3"><WebText text={"Batch"} /></th>
              <th className="py-2 pr-3"><WebText text={"Practical Topic"} /></th>
              <th className="py-2 pr-3"><WebText text={"Venue"} /></th>
              <th className="py-2 pr-3"><WebText text={"Faculty Assigned"} /></th>
              <th className="py-2"><WebText text={"Status"} /></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-border/60">
                <td className="py-2.5 pr-3 font-mono text-xs">{s.id}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">{s.session_date}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">
                  {batches.find((b) => b.id === s.batch_id)?.name ?? s.batch_id ?? "—"}
                </td>
                <td className="py-2.5 pr-3">{s.topic}</td>
                <td className="py-2.5 pr-3 text-xs">{s.venue}</td>
                <td className="py-2.5 pr-3 text-xs">{s.faculty_name}</td>
                <td className="py-2.5">
                  <select
                    value={s.status}
                    onChange={(e) => move.mutate({ id: s.id, status: e.target.value })}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {["Scheduled", "In Progress", "Completed"].map((o) => (
                      <option key={o} value={o}>{webText(o)}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function ReportsView({
  reviews,
  practicals,
}: {
  reviews: Review[];
  practicals: { code: string; title: string; category: string }[];
}) {
  const webText = useWebText();
  const cats = [...new Set(practicals.map((p) => p.category))];
  const data = cats.map((c) => {
    const list = practicals.filter((p) => p.category === c);
    const approvedCount = list.filter((p) =>
      reviews.some((r) => r.practical_code === p.code && r.status === "approved"),
    ).length;
    return { category: c, approved: approvedCount, total: list.length };
  });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label={webText("Submissions")} value={`${reviews.length}`} />
        <Metric
          label={webText("Certified")}
          value={`${reviews.filter((r) => r.status === "approved").length}`}
          tone="success"
        />
        <Metric
          label={webText("Awaiting Review")}
          value={`${reviews.filter((r) => r.status === "review").length}`}
          tone="warning"
        />
      </div>
      <Section title={webText("Completion by Category")}>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="approved" fill="#0f766e" name="Certified" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  );
}

function FacultySettings({
  auth,
}: {
  auth: { userId: string; profile: { designation: string | null; department: string | null; phone: string | null } | null };
}) {
  const webText = useWebText();
  const [form, setForm] = useState({
    designation: auth.profile?.designation ?? "",
    department: auth.profile?.department ?? "Department of Physiology",
    phone: auth.profile?.phone ?? "",
  });
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update(form)
        .eq("user_id", auth.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["auth-context"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
    <ChangePassword />
    <Section
      title={webText("Settings")}
      description={webText("Your institutional profile as shown to students and administrators.")}
      actions={
        <button
          onClick={() => save.mutate()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <WebText text={"Save Configuration"} /></button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          ["Designation", "designation"],
          ["Department", "department"],
          ["Contact Mobile", "phone"],
        ] as [string, string][]).map(([label, key]) => (
          <label key={key} className="block">
            <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {webText(label)}
            </span>
            <input
              value={(form as Record<string, string>)[key] ?? ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> <WebText text={"Grading authority is granted by the department administration and cannot be changed from this screen."} /></p>
    </Section>
    </div>
  );
}
