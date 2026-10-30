import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authQueryOptions } from "@/lib/auth";
import { homeFor } from "@/lib/nav";
import { useRealtimeSync } from "@/lib/realtime";

export const Route = createFileRoute("/_authenticated")({
  loader: async ({ context }) => {
    const ctx = await context.queryClient.ensureQueryData(authQueryOptions);
    if (!ctx) throw redirect({ to: "/login" });
    if (!ctx.role) throw redirect({ to: "/login" });
    return ctx;
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  useRealtimeSync();
  return <Outlet />;
}

export const roleHome = homeFor;
