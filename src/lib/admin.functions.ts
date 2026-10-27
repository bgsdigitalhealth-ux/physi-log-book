import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffInput = {
  email: string;
  password: string;
  full_name: string;
  role: "faculty" | "admin" | "student";
  designation: string;
  identifier: string;
  register_number?: string;
  batch_id: string;
};

async function requireAdmin(
  supabase: { from: (t: string) => any },
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("Only a department administrator can perform this action.");
  }
}

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: StaffInput) => {
    if (!d || typeof d !== "object") throw new Error("Invalid request.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) {
      throw new Error("Enter a valid institutional email address.");
    }
    if (!d.full_name || d.full_name.trim().length < 2) {
      throw new Error("Enter the full name.");
    }
    if (!d.password || d.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    if (d.role !== "faculty" && d.role !== "admin" && d.role !== "student") {
      throw new Error("Role must be student, faculty or admin.");
    }
    if (d.role === "student" && !d.register_number?.trim()) {
      throw new Error("Enter the student's register number.");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const isStudent = data.role === "student";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name.trim(),
        designation: isStudent ? "Student" : data.designation?.trim() || "Faculty Member",
        department: "Department of Physiology",
        roll_number: data.identifier?.trim() || "",
        batch_id: data.batch_id || null,
      },
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("Account could not be created.");

    const newUserId = created.user.id;

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });
    if (roleError) throw new Error(roleError.message);

    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name.trim(),
        email: data.email.trim().toLowerCase(),
        designation: isStudent ? null : data.designation?.trim() || "Faculty Member",
        department: "Department of Physiology",
        roll_number: data.identifier?.trim() || null,
        register_number: isStudent ? data.register_number?.trim() || null : null,
        batch_id: data.batch_id || null,
      })
      .eq("user_id", newUserId);

    return { userId: newUserId, email: data.email.trim().toLowerCase() };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => {
    if (!d || typeof d.userId !== "string" || !d.userId) {
      throw new Error("Invalid request.");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { deleted: data.userId };
  });
