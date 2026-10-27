import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "faculty" | "admin";

export type Profile = {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  roll_number: string | null;
  register_number: string | null;
  admission_year: number | null;
  academic_phase: string | null;
  designation: string | null;
  department: string | null;
  batch_id: string | null;
  is_active: boolean;
  gender: string | null;
  photo_path: string | null;
  is_held: boolean;
  hold_reason: string | null;
};

export type AuthContext = {
  userId: string;
  email: string | null;
  role: AppRole | null;
  roles: AppRole[];
  profile: Profile | null;
};

async function loadAuthContext(): Promise<AuthContext | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const userId = session.user.id;
  const [{ data: profileRows }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).limit(1),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const allRoles = (roles ?? []).map((r) => r.role as AppRole);
  const role: AppRole | null =
    (["admin", "faculty", "student"] as AppRole[]).find((r) =>
      allRoles.includes(r),
    ) ?? null;
  return {
    userId,
    email: session.user.email ?? null,
    role,
    roles: allRoles,
    profile: (profileRows?.[0] as Profile | undefined) ?? null,
  };
}

export const authQueryOptions = queryOptions({
  queryKey: ["auth-context"],
  queryFn: loadAuthContext,
  staleTime: 30_000,
});

// Same cache entry, but for screens that only render behind the auth guard and
// therefore can treat the context as non-null.
export const authContextOptions = queryOptions({
  queryKey: ["auth-context"],
  queryFn: async (): Promise<AuthContext> => {
    const ctx = await loadAuthContext();
    if (!ctx) throw new Error("Sign in required");
    return ctx;
  },
  staleTime: 30_000,
});

export function useAuth() {
  return useQuery(authQueryOptions);
}

export async function claimRole(role: AppRole) {
  const { error } = await supabase.rpc("claim_own_role", { _role: role });
  return error;
}

export async function signOut() {
  await supabase.auth.signOut();
}
