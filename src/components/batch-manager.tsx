import { WebText, useWebText } from "@/components/website-content";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Section } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { makeBatchId, toNullable } from "@/lib/batch-id";

export type Batch = {
  id: string;
  name: string;
  roll_range: string | null;
  student_count: number;
  mentor: string | null;
  venue: string | null;
};

const EMPTY_FORM = {
  name: "",
  roll_range: "",
  mentor: "",
  venue: "",
  student_count: "",
};

type FormState = typeof EMPTY_FORM;

/**
 * Shared batch manager used by faculty and administrators.
 * Creates, updates and deletes academic cohorts; students see batches read-only.
 */
export function BatchManager({
  batches,
  title = "Manage Academic Batches",
  description = "Create academic cohorts, set roll boundaries and allocate lead mentors.",
}: {
  batches: Batch[];
  title?: string;
  description?: string;
}) {
  const webText = useWebText();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["batches"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Batch designation is required.");
      const id = makeBatchId(form.name, batches.map((b) => b.id));
      const strength = form.student_count.trim();
      if (strength && !/^\d+$/.test(strength))
        throw new Error("Number of students must be a whole number.");
      const { error } = await supabase.from("batches").insert({
        id,
        name: form.name.trim(),
        roll_range: toNullable(form.roll_range),
        mentor: toNullable(form.mentor),
        venue: toNullable(form.venue),
        student_count: strength ? Number(strength) : 0,
      });
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      toast.success(`Batch ${id} created`);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No batch selected.");
      if (!editForm.name.trim()) throw new Error("Batch designation is required.");
      const strength = editForm.student_count.trim();
      if (strength && !/^\d+$/.test(strength))
        throw new Error("Number of students must be a whole number.");
      const { error } = await supabase
        .from("batches")
        .update({
          name: editForm.name.trim(),
          roll_range: toNullable(editForm.roll_range),
          mentor: toNullable(editForm.mentor),
          venue: toNullable(editForm.venue),
          student_count: strength ? Number(strength) : editing.student_count,
        })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Batch updated");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("batches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Batch deleted");
      invalidate();
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("foreign key") || e.message.includes("violates")
          ? "This batch still has students or sessions assigned. Reassign them first."
          : e.message,
      ),
  });

  const openEdit = (b: Batch) => {
    setEditing(b);
    setEditForm({
      name: b.name,
      roll_range: b.roll_range ?? "",
      mentor: b.mentor ?? "",
      venue: b.venue ?? "",
      student_count: String(b.student_count ?? 0),
    });
  };

  return (
    <Section title={webText(title)} description={webText(description)}>
      <div className="mb-6 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 xl:grid-cols-5">
        <Field
          label={webText("Batch Designation")}
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder={webText("Batch C1 (AY 2026-27)")}
        />
        <Field
          label={webText("Roll Range")}
          value={form.roll_range}
          onChange={(v) => setForm({ ...form, roll_range: v })}
          placeholder={webText("e.g. 151-190")}
        />
        <Field
          label={webText("Lead Mentor")}
          value={form.mentor}
          onChange={(v) => setForm({ ...form, mentor: v })}
          placeholder={webText("Dr. Name")}
        />
        <Field
          label={webText("Assigned Lab")}
          value={form.venue}
          onChange={(v) => setForm({ ...form, venue: v })}
          placeholder={webText("Physiology Lab 1")}
        />
        <Field
          label={webText("Number of Students")}
          value={form.student_count}
          onChange={(v) => setForm({ ...form, student_count: v })}
          placeholder={webText("e.g. 38")}
        />
        <div className="flex items-end sm:col-span-2 xl:col-span-1">
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {create.isPending ? webText("Creating…") : webText("Create New Batch")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            <WebText text={"No batches yet. Create the first one above."} /></p>
        ) : (
          batches.map((b) => (
            <div key={b.id} className="rounded-lg border border-border p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-base font-bold">{b.name}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px]">
                  {b.id}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px]">
                  {b.roll_range ?? "Roll range not set"}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px]">
                  {b.student_count} <WebText text={"Students"} /></span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    <WebText text={"Lead Mentor"} /></p>
                  <p className="font-medium">{b.mentor ?? "Unassigned"}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    <WebText text={"Assigned Lab"} /></p>
                  <p className="font-medium">{b.venue ?? "To be allocated"}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => openEdit(b)}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                >
                  <WebText text={"Edit"} /></button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Permanently delete ${b.name}? Students and sessions assigned to it must be moved first.`,
                      )
                    )
                      remove.mutate(b.id);
                  }}
                  disabled={remove.isPending}
                  className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
                >
                  <WebText text={"Delete"} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing ? (
        <OverlayModal
          title={`Edit Batch — ${editing.id}`}
          onClose={() => setEditing(null)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={webText("Batch Designation")}
              value={editForm.name}
              onChange={(v) => setEditForm({ ...editForm, name: v })}
            />
            <Field
              label={webText("Roll Range")}
              value={editForm.roll_range}
              onChange={(v) => setEditForm({ ...editForm, roll_range: v })}
              placeholder={webText("e.g. 101-150")}
            />
            <Field
              label={webText("Lead Mentor")}
              value={editForm.mentor}
              onChange={(v) => setEditForm({ ...editForm, mentor: v })}
              placeholder={webText("Dr. Name")}
            />
            <Field
              label={webText("Assigned Lab")}
              value={editForm.venue}
              onChange={(v) => setEditForm({ ...editForm, venue: v })}
              placeholder={webText("Physiology Lab 1")}
            />
            <Field
              label={webText("Number of Students")}
              value={editForm.student_count}
              onChange={(v) => setEditForm({ ...editForm, student_count: v })}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
            >
              <WebText text={"Cancel"} /></button>
            <button
              onClick={() => update.mutate()}
              disabled={update.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <WebText text={"Save Changes"} /></button>
          </div>
        </OverlayModal>
      ) : null}
    </Section>
  );
}

function Field({
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
  const webText = useWebText();
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {webText(label)}
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

function OverlayModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const webText = useWebText();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-display text-lg font-bold">{webText(title)}</h2>
          <button
            onClick={onClose}
            className="ml-auto text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <WebText text={"Close"} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
