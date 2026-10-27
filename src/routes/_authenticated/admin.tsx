import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  queryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Plus, ShieldCheck, Unlock } from "lucide-react";
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
import { authContextOptions, authQueryOptions, type AppRole } from "@/lib/auth";
import { studentQueryOptions } from "./student";
import { facultyQueryOptions } from "./faculty";
import { createStaffAccount, deleteUserAccount } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PracticalTemplateManager } from "@/components/practical-template-manager";
import { ProfilePhoto } from "@/components/profile-photo";
import { BatchManager } from "@/components/batch-manager";

type Staff = {
  user_id: string;
  full_name: string;
  email: string | null;
  roll_number: string | null;
  register_number: string | null;
  designation: string | null;
  batch_id: string | null;
  is_active: boolean;
  created_at: string;
};
type Batch = {
  id: string;
  name: string;
  roll_range: string | null;
  student_count: number;
  mentor: string | null;
  venue: string | null;
};
type Practical = {
  code: string;
  seq: number;
  title: string;
  category: string;
  type: string;
  active: boolean;
};
type Session = {
  id: string;
  session_date: string;
  topic: string;
  venue: string | null;
  faculty_name: string | null;
  status: string;
  batch_id: string | null;
};
type Review = {
  id: string;
  practical_code: string;
  status: string;
  marks: number | null;
  max_marks: number;
  submitted_at: string | null;
  profiles: { full_name: string; roll_number: string | null; batch_id: string | null; photo_path: string | null } | null;
};
type Freeze = {
  is_frozen: boolean;
  reason?: string;
  scope?: string;
  frozen_by?: string;
  frozen_at?: string;
  note?: string;
};

const CATEGORIES = [
  "Hematology",
  "Cardiovascular",
  "Respiratory",
  "Clinical Examination",
  "Human Experiments",
  "Amphibian Graphs",
  "Demonstration",
];
const TYPES = [
  "Laboratory",
  "Clinical",
  "Simulation",
  "Bedside Demo",
  "Laboratory / Bench Work",
];

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Department Administration | Physiology Practical Record" },
      {
        name: "description",
        content:
          "Department administrator console for users, batches, practicals, lab sessions and academic governance.",
      },
      {
        property: "og:title",
        content: "Department Administration | Physiology Practical Record",
      },
      {
        property: "og:description",
        content:
          "Manage institutional users, academic batches, practical curricula, lab sessions and system governance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(authQueryOptions);
    await Promise.all([
      context.queryClient.ensureQueryData(facultyQueryOptions.batches()),
      context.queryClient.ensureQueryData(studentQueryOptions.practicals()),
      context.queryClient.ensureQueryData(studentQueryOptions.templates()),
      context.queryClient.ensureQueryData(studentQueryOptions.sessions()),
      context.queryClient.ensureQueryData(facultyQueryOptions.reviews()),
      context.queryClient.ensureQueryData(adminQueryOptions.staff()),
      context.queryClient.ensureQueryData(adminQueryOptions.settings()),
    ]);
  },
  component: AdminPage,
});

export const adminQueryOptions = {
  staff: () =>
    queryOptions({
      queryKey: ["admin-staff"],
      queryFn: async () => {
        const [profiles, roles] = await Promise.all([
          supabase.from("profiles").select("*").order("created_at"),
          supabase.from("user_roles").select("user_id, role"),
        ]);
        if (profiles.error) throw profiles.error;
        if (roles.error) throw roles.error;
        const roleMap = new Map(roles.data.map((r) => [r.user_id, r.role as AppRole]));
        const staff = (profiles.data as Staff[]).map((p) => ({
          ...p,
          role: roleMap.get(p.user_id) ?? ("student" as AppRole),
        }));
        return staff;
      },
    }),
  settings: () =>
    queryOptions({
      queryKey: ["app-settings"],
      queryFn: async () => {
        const { data, error } = await supabase.from("app_settings").select("*");
        if (error) throw error;
        const map = new Map(data.map((s) => [s.key, s.value]));
        return {
          freeze: (map.get("academic_freeze") ?? { is_frozen: false }) as Freeze,
          academic_year: (map.get("academic_year") as string) ?? "2026 - 2027",
          attendance_min: (map.get("attendance_min") as number) ?? 80,
          default_max_marks: (map.get("default_max_marks") as number) ?? 20,
        };
      },
    }),
};

function AdminPage() {
  const [view, setView] = useState("dashboard");
  const auth = useSuspenseQuery(authContextOptions);
  const batches = useSuspenseQuery(facultyQueryOptions.batches());
  const practicals = useSuspenseQuery(studentQueryOptions.practicals());
  const templates = useSuspenseQuery(studentQueryOptions.templates());
  const sessions = useSuspenseQuery(studentQueryOptions.sessions());
  const reviews = useSuspenseQuery(facultyQueryOptions.reviews());
  const staff = useSuspenseQuery(adminQueryOptions.staff());
  const settings = useSuspenseQuery(adminQueryOptions.settings());
  const queryClient = useQueryClient();

  const [freezeOpen, setFreezeOpen] = useState(false);
  const freeze = settings.data.freeze;

  const notifications = useSuspenseQuery(
    queryOptions({
      queryKey: ["notifications", auth.data.userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as {
          id: string;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          created_at: string;
        }[];
      },
    }),
  );

  const reloadSettings = () =>
    queryClient.invalidateQueries({ queryKey: ["app-settings"] });

  const setFreeze = useMutation({
    mutationFn: async (input: { frozen: boolean; reason: string; scope: string }) => {
      const value: Freeze = input.frozen
        ? {
            is_frozen: true,
            reason: input.reason,
            scope: input.scope,
            frozen_by: auth.data.profile?.full_name ?? "Department Administrator",
            frozen_at: new Date().toISOString(),
          }
        : { is_frozen: false, note: "Term 1 practical records open." };
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "academic_freeze", value, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.frozen ? "Academic freeze engaged" : "Academic freeze released");
      setFreezeOpen(false);
      reloadSettings();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <AppShell
        role="admin"
        activeView={view}
        onSelectView={setView}
        user={{
          name: auth.data.profile?.full_name || "Department Administrator",
          email: auth.data.profile?.email ?? auth.data.email,
          meta: "Super Admin • Access Level 1",
        }}
        counts={{
          "manage-users": staff.data.length,
          "manage-batches": batches.data.length,
          "manage-practicals": practicals.data.filter((p) => p.active).length,
        }}
        search={{
          value: "",
          onChange: () => undefined,
          placeholder: "Search users, roll no, batches, practicals...",
        }}
      >
        {freeze.is_frozen ? (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <Lock className="size-4 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-destructive">
                SYSTEM-WIDE ACADEMIC FREEZE ACTIVE
              </p>
              <p className="text-xs text-muted-foreground">
                Locked: {freeze.reason ?? "Academic audit freeze"} (Frozen at{" "}
                {freeze.frozen_at?.slice(0, 10) ?? "Just now"} by{" "}
                {freeze.frozen_by ?? "Admin"})
              </p>
            </div>
            <button
              onClick={() => setFreezeOpen(true)}
              className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              Manage Freeze
            </button>
          </div>
        ) : null}

        {view === "dashboard" ? (
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                Department of Physiology • MBBS Phase I
              </p>
              <h1 className="mt-1 font-display text-3xl font-extrabold">
                Department Administration Console
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Central academic operations and governance.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Institutional Users"
                value={`${staff.data.length} Active`}
                note="Faculty & Administrators"
                onClick={() => setView("manage-users")}
              />
              <Metric
                label="Active Batches"
                value={`${batches.data.length} Batches`}
                note="A1, A2, B1, B2 (AY 2026-27)"
                onClick={() => setView("manage-batches")}
              />
              <Metric
                label="Approved Experiments"
                value={`${practicals.data.length} Modules`}
                note="Hematology, CVS, Resp, Nerve"
                onClick={() => setView("manage-practicals")}
              />
              <Metric
                label="Scheduled Sessions"
                value={`${sessions.data.length} Lab Postings`}
                note="Clinical & Experimental Labs"
                tone="warning"
                onClick={() => setView("session-management")}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Section
                title="Faculty Batch Mentorship Roster"
                actions={
                  <button
                    onClick={() => setView("manage-batches")}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                  >
                    Manage
                  </button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        <th className="py-2 pr-3">Batch</th>
                        <th className="py-2 pr-3">Strength</th>
                        <th className="py-2 pr-3">Lead Faculty Mentor</th>
                        <th className="py-2 pr-3">Assigned Lab</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.data.map((b) => (
                        <tr key={b.id} className="border-b border-border/60">
                          <td className="py-2.5 pr-3 font-medium">
                            {b.name.split(" (")[0]}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-xs">
                            {b.student_count}
                          </td>
                          <td className="py-2.5 pr-3 text-xs">{b.mentor ?? "Unassigned"}</td>
                          <td className="py-2.5 pr-3 text-xs">{b.venue ?? "-"}</td>
                          <td className="py-2.5 text-xs text-success">Active</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section
                title="Active Lab Sessions Schedule"
                actions={
                  <button
                    onClick={() => setView("session-management")}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                  >
                    Manage All
                  </button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        <th className="py-2 pr-3">Session</th>
                        <th className="py-2 pr-3">Batch</th>
                        <th className="py-2 pr-3">Practical Topic</th>
                        <th className="py-2 pr-3">Faculty Assigned</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.data.slice(0, 5).map((s) => (
                        <tr key={s.id} className="border-b border-border/60">
                          <td className="py-2.5 pr-3 font-mono text-xs">{s.id}</td>
                          <td className="py-2.5 pr-3 font-mono text-xs">{s.batch_id}</td>
                          <td className="py-2.5 pr-3 text-xs">{s.topic}</td>
                          <td className="py-2.5 pr-3 text-xs">{s.faculty_name}</td>
                          <td className="py-2.5">
                            <StatusBadge status={s.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          </div>
        ) : null}

        {view === "manage-users" ? <ManageUsers staff={staff.data} /> : null}

        {view === "manage-batches" ? <ManageBatches batches={batches.data} /> : null}

        {view === "manage-practicals" ? (
          <ManagePracticals practicals={practicals.data} />
        ) : null}

        {view === "practical-templates" ? (
          <PracticalTemplateManager practicals={practicals.data} templates={templates.data} />
        ) : null}

        {view === "session-management" ? (
          <ManageSessions sessions={sessions.data} batches={batches.data} />
        ) : null}

        {view === "student-records" ? (
          <AdminRecords reviews={reviews.data} practicals={practicals.data} />
        ) : null}

        {view === "reviews-approvals" ? (
          <Section
            title="Faculty Review Queue Oversight"
            description="Administrative oversight of submitted practicals and sign-offs."
            actions={
              <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase">
                {reviews.data.filter((r) => r.status === "review").length} Pending Reviews
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    <th className="py-2 pr-3">Student Name</th>
                    <th className="py-2 pr-3">Roll</th>
                    <th className="py-2 pr-3">Batch</th>
                    <th className="py-2 pr-3">Experiment Title</th>
                    <th className="py-2 pr-3">Submitted On</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.data.filter((r) => r.status === "review").length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        No pending submissions awaiting faculty review.
                      </td>
                    </tr>
                  ) : (
                    reviews.data
                      .filter((r) => r.status === "review")
                      .map((r) => (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="py-2.5 pr-3">{r.profiles?.full_name ?? "—"}</td>
                          <td className="py-2.5 pr-3 font-mono text-xs">
                            {r.profiles?.roll_number ?? "—"}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-xs">
                            {r.profiles?.batch_id ?? "—"}
                          </td>
                          <td className="py-2.5 pr-3 text-xs">
                            {practicals.data.find((p) => p.code === r.practical_code)?.title ??
                              r.practical_code}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-xs">
                            {r.submitted_at?.slice(0, 10) ?? "—"}
                          </td>
                          <td className="py-2.5">
                            <StatusBadge status={r.status} />
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        ) : null}

        {view === "attendance" ? <AttendanceOversight reviews={reviews.data} /> : null}

        {view === "reports-analytics" ? (
          <ReportsAnalytics practicals={practicals.data} reviews={reviews.data} />
        ) : null}

        {view === "notifications" ? (
          <Broadcast notifications={notifications.data} />
        ) : null}

        {view === "system-settings" ? (
          <SystemSettings
            settings={settings.data}
            onOpenFreeze={() => setFreezeOpen(true)}
          />
        ) : null}
      </AppShell>

      {freezeOpen ? (
        <FreezeModal
          freeze={freeze}
          onClose={() => setFreezeOpen(false)}
          onConfirm={(frozen, reason, scope) =>
            setFreeze.mutate({ frozen, reason, scope })
          }
          busy={setFreeze.isPending}
        />
      ) : null}
    </>
  );
}

function ManageUsers({
  staff,
}: {
  staff: (Staff & { role: AppRole })[];
}) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    identifier: "",
    register_number: "",
    designation: "Assoc Prof",
    role: "faculty" as "faculty" | "admin" | "student",
    batch_id: "BATCH-B2",
    password: "",
  });

  const create = useMutation({
    mutationFn: async () =>
      createStaffAccount({
        data: {
          full_name: form.full_name,
          email: form.email,
          identifier: form.identifier,
          register_number: form.register_number,
          designation: form.designation,
          role: form.role,
          batch_id: form.batch_id,
          password: form.password,
        },
      }),
    onSuccess: () => {
      toast.success("Account created and role assigned");
      setOpen(false);
      setForm({
        ...form,
        full_name: "",
        email: "",
        identifier: "",
        register_number: "",
        password: "",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (input: { userId: string; active: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: input.active })
        .eq("user_id", input.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editUser, setEditUser] = useState<(Staff & { role: AppRole }) | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    roll_number: "",
    register_number: "",
    designation: "",
    batch_id: "",
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editUser) throw new Error("No user selected.");
      if (!editForm.full_name.trim()) throw new Error("Full name is required.");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name.trim(),
          roll_number: editForm.roll_number.trim() || null,
          register_number: editForm.register_number.trim() || null,
          designation: editForm.designation.trim() || null,
          batch_id: editForm.batch_id || null,
        })
        .eq("user_id", editUser.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User details updated");
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => deleteUserAccount({ data: { userId } }),
    onSuccess: () => {
      toast.success("User account deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = staff.filter((s) => filter === "all" || s.role === filter);
  const isStudent = form.role === "student";

  return (
    <Section
      title="Manage Institutional Users"
      description="Add, deactivate and assign roles to students, faculty and administrators."
      actions={
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" /> Add New User
        </button>
      }
    >
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4 rounded-md border border-border px-3 py-1.5 text-xs"
      >
        <option value="all">All Roles</option>
        <option value="student">Students</option>
        <option value="faculty">Faculty</option>
        <option value="admin">Administrators</option>
      </select>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="py-2 pr-3">Full Name</th>
              <th className="py-2 pr-3">Email Address</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Roll / Desig</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Created On</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.user_id} className="border-b border-border/60">
                <td className="py-2.5 pr-3 font-medium">{u.full_name}</td>
                <td className="py-2.5 pr-3 text-xs">{u.email}</td>
                <td className="py-2.5 pr-3">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase">
                    {u.role}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-xs">{u.designation ?? u.roll_number ?? "—"}</td>
                <td className="py-2.5 pr-3">
                  <span
                    className={cn(
                      "font-semibold",
                      u.is_active ? "text-success" : "text-destructive",
                    )}
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs">
                  {u.created_at.slice(0, 10)}
                </td>
                <td className="py-2.5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setEditUser(u);
                        setEditForm({
                          full_name: u.full_name,
                          roll_number: u.roll_number ?? "",
                          register_number: u.register_number ?? "",
                          designation: u.designation ?? "",
                          batch_id: u.batch_id ?? "",
                        });
                      }}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        toggle.mutate({ userId: u.user_id, active: !u.is_active })
                      }
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Permanently delete ${u.full_name}? This removes their login and cannot be undone.`)) {
                          remove.mutate(u.user_id);
                        }
                      }}
                      disabled={remove.isPending}
                      className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open ? (
        <Modal title="Add New University User" onClose={() => setOpen(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={form.full_name}
              onChange={(v) => setForm({ ...form, full_name: v })}
              placeholder={isStudent ? "Student full name" : "Dr. / Faculty Full Name"}
            />
            <Input
              label="Email Address"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="user@bgsmch.edu.in"
            />
            <Input
              label={isStudent ? "Roll Number" : "Roll / Employee Number"}
              value={form.identifier}
              onChange={(v) => setForm({ ...form, identifier: v })}
              placeholder={isStudent ? "e.g. 118" : "e.g. EMP-44"}
            />
            {isStudent ? (
              <Input
                label="Register Number"
                value={form.register_number}
                onChange={(v) => setForm({ ...form, register_number: v })}
                placeholder="e.g. BGSMCH-2026-MED-118"
              />
            ) : (
              <Input
                label="Designation"
                value={form.designation}
                onChange={(v) => setForm({ ...form, designation: v })}
                placeholder="Assoc Prof"
              />
            )}
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Role Type
              </span>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value as "faculty" | "admin" | "student",
                  })
                }
                className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="student">Student (enrol with temporary password)</option>
                <option value="faculty">Faculty Member / Reviewer</option>
                <option value="admin">Department Administrator</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Assigned Batch
              </span>
              <select
                value={form.batch_id}
                onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {["BATCH-B2", "BATCH-B1", "BATCH-A2", "BATCH-A1"].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Temporary Password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Create Account
            </button>
          </div>
        </Modal>
      ) : null}

      {editUser ? (
        <Modal title={`Edit User — ${editUser.full_name}`} onClose={() => setEditUser(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={editForm.full_name}
              onChange={(v) => setEditForm({ ...editForm, full_name: v })}
            />
            <Input
              label="Roll / Employee Number"
              value={editForm.roll_number}
              onChange={(v) => setEditForm({ ...editForm, roll_number: v })}
            />
            <Input
              label="Register Number"
              value={editForm.register_number}
              onChange={(v) => setEditForm({ ...editForm, register_number: v })}
              placeholder="Students only"
            />
            <Input
              label="Designation"
              value={editForm.designation}
              onChange={(v) => setEditForm({ ...editForm, designation: v })}
              placeholder="Faculty only"
            />
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Assigned Batch
              </span>
              <select
                value={editForm.batch_id}
                onChange={(e) => setEditForm({ ...editForm, batch_id: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No batch</option>
                {["BATCH-B2", "BATCH-B1", "BATCH-A2", "BATCH-A1"].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Email address and password cannot be changed here. Role changes are made
            from the user's account record.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setEditUser(null)}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => update.mutate()}
              disabled={update.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Save Changes
            </button>
          </div>
        </Modal>
      ) : null}
    </Section>
  );
}

function ManageBatches({ batches }: { batches: Batch[] }) {
  return <BatchManager batches={batches} />;
}

function ManagePracticals({ practicals }: { practicals: Practical[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    seq: "",
    title: "",
    category: "Hematology",
    type: "Laboratory",
  });
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of practicals) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [practicals]);

  const visible = practicals.filter(
    (p) =>
      (catFilter === "All" || p.category === catFilter) &&
      (!search.trim() ||
        [p.code, p.title, p.category, p.type].join(" ").toLowerCase().includes(search.trim().toLowerCase()))
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim().toUpperCase(),
        seq: Number(form.seq),
        title: form.title.trim(),
        category: form.category,
        type: form.type,
        active: true,
      };
      if (!payload.code || !payload.title || !Number.isFinite(payload.seq)) {
        throw new Error("Code, sequence and title are required.");
      }
      if (editCode) {
        const { error } = await supabase
          .from("practicals")
          .update(payload)
          .eq("code", editCode);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("practicals").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Practical saved");
      setOpen(false);
      setEditCode(null);
      setForm({ code: "", seq: "", title: "", category: "Hematology", type: "Laboratory" });
      queryClient.invalidateQueries({ queryKey: ["practicals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.from("practicals").delete().eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Practical removed");
      queryClient.invalidateQueries({ queryKey: ["practicals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Section
      title="Manage Practicals & Curricula"
      description="Create, activate and sequence experiment content aligned with NMC requirements."
      actions={
        <button
          onClick={() => {
            setEditCode(null);
            setOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" /> Add New Practical
        </button>
      }
    >
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...categories.map(([c]) => c)] as string[]).map((c) => {
            const count = c === "All" ? practicals.length : categories.find(([k]) => k === c)?.[1] ?? 0;
            return (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  catFilter === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {c} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
        <Input label="Search" value={search} onChange={setSearch} placeholder="Search by code, title or type…" className="max-w-sm" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Sequence</th>
              <th className="py-2 pr-3">Practical Experiment Title</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.code} className="border-b border-border/60">
                <td className="py-2.5 pr-3 font-mono text-xs">{p.code}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">
                  #{String(p.seq).padStart(2, "0")}
                </td>
                <td className="py-2.5 pr-3">{p.title}</td>
                <td className="py-2.5 pr-3 text-xs">{p.category}</td>
                <td className="py-2.5 pr-3 text-xs">{p.type}</td>
                <td className="py-2.5 pr-3 text-xs text-success">
                  {p.active ? "Active" : "Inactive"}
                </td>
                <td className="py-2.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditCode(p.code);
                        setForm({
                          code: p.code,
                          seq: String(p.seq),
                          title: p.title,
                          category: p.category,
                          type: p.type,
                        });
                        setOpen(true);
                      }}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove.mutate(p.code)}
                      className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/5"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No practicals match this category or search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {open ? (
        <Modal
          title={editCode ? `Edit Practical (${editCode})` : "Add New Practical"}
          onClose={() => setOpen(false)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Practical Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="e.g. PH-EX-009" />
            <Input label="Sequence Number" value={form.seq} onChange={(v) => setForm({ ...form, seq: v })} placeholder="e.g. 9" />
            <Input label="Practical Experiment Title" className="sm:col-span-2" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g. Determination of ESR" />
            <Select label="Category" value={form.category} options={CATEGORIES} onChange={(v) => setForm({ ...form, category: v })} />
            <Select label="Type" value={form.type} options={TYPES} onChange={(v) => setForm({ ...form, type: v })} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Active — Published and instantly synchronized across faculty and student
            dashboards.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Save Practical
            </button>
          </div>
        </Modal>
      ) : null}
    </Section>
  );
}

function ManageSessions({ sessions, batches }: { sessions: Session[]; batches: Batch[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    session_date: "",
    topic: "",
    batch_id: "BATCH-B2",
    venue: "Physiology Lab 1",
    faculty_name: "",
    status: "Scheduled",
  });

  const schedule = useMutation({
    mutationFn: async () => {
      if (!form.topic.trim() || !form.session_date) {
        throw new Error("Topic and date are required.");
      }
      if (editId) {
        const { error } = await supabase
          .from("sessions")
          .update({
            topic: form.topic.trim(),
            session_date: form.session_date,
            batch_id: form.batch_id,
            venue: form.venue.trim() || "To be allocated",
            faculty_name: form.faculty_name.trim() || "Unassigned",
            status: form.status,
          })
          .eq("id", editId);
        if (error) throw error;
        return;
      }
      const id = form.id.trim().toUpperCase() || `SES-${String(sessions.length + 1).padStart(2, "0")}`;
      const { error } = await supabase.from("sessions").insert({
        id,
        topic: form.topic.trim(),
        session_date: form.session_date,
        batch_id: form.batch_id,
        venue: form.venue.trim() || "To be allocated",
        faculty_name: form.faculty_name.trim() || "Unassigned",
        status: "Scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editId ? "Session updated" : "Lab session scheduled");
      setOpen(false);
      setEditId(null);
      setForm({ ...form, id: "", topic: "", session_date: "", faculty_name: "", status: "Scheduled" });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session deleted");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("foreign key") || e.message.includes("violates")
          ? "This session still has attendance or submissions linked to it."
          : e.message,
      ),
  });

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      patch: { faculty_name?: string; venue?: string };
    }) => {
      const { error } = await supabase.from("sessions").update(input.patch).eq("id", input.id);
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
      title="Practical Lab Session Management"
      description="Schedule practical lab sessions, assign faculty, rooms and dates."
      actions={
        <button
          onClick={() => {
            setEditId(null);
            setForm({ id: "", session_date: "", topic: "", batch_id: "BATCH-B2", venue: "Physiology Lab 1", faculty_name: "", status: "Scheduled" });
            setOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" /> Schedule Lab Session
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="py-2 pr-3">Session ID</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Batch</th>
              <th className="py-2 pr-3">Experiment Title</th>
              <th className="py-2 pr-3">Faculty Assigned</th>
              <th className="py-2 pr-3">Venue</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-muted-foreground">
                  No practical lab sessions scheduled yet. Click "+ Schedule Lab Session"
                  to create one.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-mono text-xs">{s.id}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{s.session_date}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{s.batch_id}</td>
                  <td className="py-2.5 pr-3 text-xs">{s.topic}</td>
                  <td className="py-2.5 pr-3">
                    <input
                      defaultValue={s.faculty_name ?? ""}
                      onBlur={(e) =>
                        e.target.value !== (s.faculty_name ?? "") &&
                        update.mutate({ id: s.id, patch: { faculty_name: e.target.value } })
                      }
                      className="w-full rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>
                  <td className="py-2.5 pr-3">
                    <input
                      defaultValue={s.venue ?? ""}
                      onBlur={(e) =>
                        e.target.value !== (s.venue ?? "") &&
                        update.mutate({ id: s.id, patch: { venue: e.target.value } })
                      }
                      className="w-full rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditId(s.id);
                          setForm({
                            id: s.id,
                            session_date: s.session_date,
                            topic: s.topic,
                            batch_id: s.batch_id ?? "BATCH-B2",
                            venue: s.venue ?? "",
                            faculty_name: s.faculty_name ?? "",
                            status: s.status,
                          });
                          setOpen(true);
                        }}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete session ${s.id} (${s.topic})?`)) {
                            remove.mutate(s.id);
                          }
                        }}
                        disabled={remove.isPending}
                        className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open ? (
        <Modal title={editId ? `Edit Session (${editId})` : "Schedule Lab Session"} onClose={() => { setOpen(false); setEditId(null); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Session Topic / Practical Title" className="sm:col-span-2" value={form.topic} onChange={(v) => setForm({ ...form, topic: v })} placeholder="e.g. Effect of Exercise on Blood Pressure" />
            <Input label="Date" value={form.session_date} onChange={(v) => setForm({ ...form, session_date: v })} placeholder="2026-11-02" />
            {editId ? (
              <Select label="Status" value={form.status} options={["Scheduled", "Completed", "Cancelled"]} onChange={(v) => setForm({ ...form, status: v })} />
            ) : (
              <Input label="Session ID (optional)" value={form.id} onChange={(v) => setForm({ ...form, id: v })} placeholder="SES-16" />
            )}
            <Select label="Batch" value={form.batch_id} options={batches.map((b) => b.id)} onChange={(v) => setForm({ ...form, batch_id: v })} />
            <Input label="Venue" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} placeholder="Physiology Lab 1" />
            <Input label="Faculty Assigned" className="sm:col-span-2" value={form.faculty_name} onChange={(v) => setForm({ ...form, faculty_name: v })} placeholder="Dr. Name" />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => { setOpen(false); setEditId(null); }}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => schedule.mutate()}
              disabled={schedule.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {editId ? "Save Changes" : "Schedule Session"}
            </button>
          </div>
        </Modal>
      ) : null}
    </Section>
  );
}

function AdminRecords({ reviews, practicals }: { reviews: Review[]; practicals: Practical[] }) {
  const exportCsv = () => {
    const header = "Record ID,Roll,Student,Batch,Experiment,Status,Marks";
    const lines = reviews.map((r, i) =>
      [
        `SUB-2026-${4800 + i}`,
        r.profiles?.roll_number ?? "",
        r.profiles?.full_name ?? "",
        r.profiles?.batch_id ?? "",
        practicals.find((p) => p.code === r.practical_code)?.title ?? r.practical_code,
        r.status,
        r.marks ?? "",
      ].join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Records exported");
  };

  return (
    <Section
      title="Institutional Student Records Master Log"
      description="Central oversight of student entries, evaluation scores and digital certification."
      actions={
        <button
          onClick={exportCsv}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
        >
          Export Records (CSV)
        </button>
      }
    >
      <p className="mb-4 rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
        Digital verification and grading are managed exclusively by Faculty.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="py-2 pr-3">Roll No</th>
              <th className="py-2 pr-3">Student Name</th>
              <th className="py-2 pr-3">Batch</th>
              <th className="py-2 pr-3">Experiment</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Marks</th>
              <th className="py-2">Governance</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                  No student records submitted yet. Records certified by Faculty mentors
                  will appear here.
                </td>
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
                  <td className="py-2.5 pr-3 text-xs">
                    {practicals.find((p) => p.code === r.practical_code)?.title ??
                      r.practical_code}
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    {r.marks != null ? `${r.marks}/${r.max_marks ?? 20}` : "-"}
                  </td>
                  <td className="py-2.5 font-mono text-[10px] uppercase text-muted-foreground">
                    View-Only
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

function AttendanceOversight({ reviews }: { reviews: Review[] }) {
  const data = [
    { name: "Certified", value: reviews.filter((r) => r.status === "approved").length },
    { name: "In Review", value: reviews.filter((r) => r.status === "review").length },
    { name: "Corrections", value: reviews.filter((r) => r.status === "correction").length },
  ].filter((d) => d.value > 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Records Tracked" value={`${reviews.length}`} />
        <Metric label="Exam Threshold" value="80%" note="Mandatory eligibility" tone="warning" />
        <Metric label="Certified" value={`${reviews.filter((r) => r.status === "approved").length}`} tone="success" />
      </div>
      <Section title="MBBS Phase I Record Distribution">
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  );
}

function ReportsAnalytics({
  practicals,
  reviews,
}: {
  practicals: Practical[];
  reviews: Review[];
}) {
  const data = practicals.map((p) => ({
    code: p.code,
    approved: reviews.filter((r) => r.practical_code === p.code && r.status === "approved")
      .length,
  }));
  return (
    <Section
      title="Department Reports & Academic Analytics"
      description="Completion rate by experiment and batch comparison metrics."
    >
      <div className="h-80">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="code" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="approved" fill="#0284c7" name="Certified" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
}

function Broadcast({
  notifications,
}: {
  notifications: { id: string; title: string; message: string; type: string; created_at: string }[];
}) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<AppRole>("student");

  const send = useMutation({
    mutationFn: async () => {
      if (!subject.trim()) throw new Error("Circular subject is required.");
      const { error } = await supabase.from("notifications").insert({
        audience,
        title: subject.trim(),
        message: message.trim() || subject.trim(),
        type: "info",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Circular broadcast");
      setSubject("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Section
      title="Institutional Notifications & Broadcasts"
      description="Broadcast circulars to students and faculty."
      actions={
        <button
          onClick={() => send.mutate()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Broadcast Circular
        </button>
      }
    >
      <div className="mb-6 grid gap-3 rounded-lg border border-border p-4">
        <Input label="Circular Subject" value={subject} onChange={setSubject} placeholder="e.g. Internal Assessment Dates" />
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Message
          </span>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <Select
          label="Audience"
          value={audience}
          options={["student", "faculty", "admin"]}
          onChange={(v) => setAudience(v as AppRole)}
        />
      </div>

      <ul className="space-y-3">
        {notifications.map((n) => (
          <li key={n.id} className="rounded-lg border border-border p-4">
            <p className="text-sm font-semibold">{n.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              {new Date(n.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function SystemSettings({
  settings,
  onOpenFreeze,
}: {
  settings: {
    freeze: Freeze;
    academic_year: string;
    attendance_min: number;
    default_max_marks: number;
  };
  onOpenFreeze: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    academic_year: settings.academic_year,
    attendance_min: String(settings.attendance_min),
    default_max_marks: String(settings.default_max_marks),
  });

  const save = useMutation({
    mutationFn: async () => {
      const min = Number(form.attendance_min);
      const max = Number(form.default_max_marks);
      if (!form.academic_year.trim()) throw new Error("Academic year is required.");
      if (min < 0 || min > 100) throw new Error("Attendance must be between 0 and 100.");
      if (max < 1) throw new Error("Maximum marks must be greater than zero.");
      const { error } = await supabase.from("app_settings").upsert([
        { key: "academic_year", value: form.academic_year.trim() },
        { key: "attendance_min", value: min },
        { key: "default_max_marks", value: max },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuration saved");
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const freeze = settings.freeze;

  return (
    <div className="space-y-6">
      <Section
        title="System Settings & Governance"
        description="Configure academic year, attendance thresholds and mark limits."
        actions={
          <button
            onClick={() => save.mutate()}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Save Configuration
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Active Academic Year" value={form.academic_year} onChange={(v) => setForm({ ...form, academic_year: v })} />
          <Input label="Minimum Attendance Threshold (%)" value={form.attendance_min} onChange={(v) => setForm({ ...form, attendance_min: v })} />
          <Input label="Default Practical Max Marks" value={form.default_max_marks} onChange={(v) => setForm({ ...form, default_max_marks: v })} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          University Curricula Standard: NMC Competency-Based Medical Education (CBME)
        </p>
      </Section>

      <Section
        title="Master Academic Freeze Governance"
        description="When frozen by Central Administration, all student submissions, entries and faculty grading are locked immediately across all portals."
        actions={
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase",
              freeze.is_frozen ? "bg-destructive/10 text-destructive" : "bg-success-soft text-success",
            )}
          >
            {freeze.is_frozen ? "SYSTEM FROZEN (LOCKED)" : "System Active (Normal)"}
          </span>
        }
      >
        {freeze.is_frozen ? (
          <div className="mb-4 grid gap-2 text-sm sm:grid-cols-3">
            <p>
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Frozen By:{" "}
              </span>
              {freeze.frozen_by ?? "Admin"}
            </p>
            <p>
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Timestamp:{" "}
              </span>
              {freeze.frozen_at?.slice(0, 16).replace("T", " ") ?? "Recently"}
            </p>
            <p>
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Official Reason:{" "}
              </span>
              {freeze.reason ?? "Administrative Review"}
            </p>
          </div>
        ) : null}
        <button
          onClick={onOpenFreeze}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold",
            freeze.is_frozen
              ? "border border-success/40 text-success hover:bg-success-soft"
              : "bg-destructive text-white hover:opacity-90",
          )}
        >
          {freeze.is_frozen ? (
            <Unlock className="size-3.5" />
          ) : (
            <Lock className="size-3.5" />
          )}
          {freeze.is_frozen
            ? "Release Academic Freeze (Unlock)"
            : "Engage Academic Freeze"}
        </button>
      </Section>
    </div>
  );
}

function FreezeModal({
  freeze,
  onClose,
  onConfirm,
  busy,
}: {
  freeze: Freeze;
  onClose: () => void;
  onConfirm: (frozen: boolean, reason: string, scope: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("End of Term Academic Assessment & Registry Lock");
  const [scope, setScope] = useState("all");
  return (
    <Modal
      title={
        freeze.is_frozen
          ? "Release Academic Operations Freeze"
          : "Engage Academic Operations Freeze"
      }
      onClose={onClose}
    >
      {freeze.is_frozen ? (
        <p className="text-sm text-muted-foreground">
          System is currently frozen. Active since {freeze.frozen_at ?? "Recently"} by{" "}
          {freeze.frozen_by ?? "Admin"}. Reason: {freeze.reason ?? "Administrative Review"}.
          Releasing the freeze will restore standard submission and grading rights for all
          students and faculty.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will immediately halt all student practical observation entries, new
            submissions, profile modifications, and faculty review mark assignments across
            the college portal.
          </p>
          <Input label="Official Reason for Freeze" value={reason} onChange={setReason} />
          <Select
            label="Scope of Freeze"
            value={scope}
            options={["all", "student_only", "faculty_only"]}
            onChange={setScope}
          />
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Security Protocol: This operation engages central institutional governance.
            Neither students nor faculty members have permissions to override this lock.
          </p>
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(!freeze.is_frozen, reason, scope)}
          disabled={busy}
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {freeze.is_frozen ? "Confirm & Unlock System" : "Confirm & Freeze All Operations"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="ml-auto text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
