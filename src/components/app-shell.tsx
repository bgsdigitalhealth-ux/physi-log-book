import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Menu, Search, X } from "lucide-react";
import { toast } from "sonner";

import { authQueryOptions, signOut, type AppRole } from "@/lib/auth";
import { homeFor, navFor, roleLabel } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Props = {
  role: AppRole;
  activeView: string;
  onSelectView: (id: string) => void;
  user: { name: string; email: string | null; meta?: string };
  counts?: Record<string, number>;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  children: ReactNode;
};

export function AppShell({
  role,
  activeView,
  onSelectView,
  user,
  counts = {},
  search,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const items = navFor(role);
  const auth = useQuery(authQueryOptions);
  const myRoles = auth.data?.roles ?? [role];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
            BG
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold leading-tight">
              BGS Medical College
            </p>
            <p className="truncate text-[11px] text-sidebar-muted">
              Dept. of Physiology
            </p>
          </div>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="px-5 pt-5 pb-2 font-mono text-[10px] tracking-[0.18em] text-sidebar-muted uppercase">
          {roleLabel[role]} Portal
        </p>

        {myRoles.length > 1 ? (
          <div className="mx-3 mb-2 flex gap-1 rounded-md border border-sidebar-border p-1">
            {(["student", "faculty", "admin"] as AppRole[])
              .filter((r) => myRoles.includes(r))
              .map((r) => (
                <Link
                  key={r}
                  to={homeFor(r)}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex-1 rounded px-2 py-1 text-center text-[11px] font-semibold transition-colors",
                    r === role
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  {roleLabel[r]}
                </Link>
              ))}
          </div>
        ) : null}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeView;
            const count = counts[item.id];
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {count ? (
                  <span className="ml-auto rounded-full bg-danger-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-destructive">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-[11px] text-sidebar-muted">
            {user.email ?? roleLabel[role]}
          </p>
          {user.meta ? (
            <p className="mt-1 truncate font-mono text-[10px] text-sidebar-muted">
              {user.meta}
            </p>
          ) : null}
          <button
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border px-3 py-2 text-xs font-semibold text-sidebar-foreground/90 hover:bg-sidebar-accent"
          >
            <LogOut className="size-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <p className="hidden truncate font-mono text-[11px] tracking-wider text-muted-foreground uppercase sm:block">
            {items.find((i) => i.id === activeView)?.label ?? ""}
          </p>
          {search ? (
            <div className="ml-auto flex w-full max-w-sm items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Search…"}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <Link
                to="/login"
                className="hidden rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary sm:block"
              >
                Sign in
              </Link>
            </div>
          )}
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card shadow-sm", className)}>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="ml-auto flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  note,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
}) {
  const tones = {
    default: "border-border",
    success: "border-success/30 bg-success-soft",
    warning: "border-warning/30 bg-warning-soft",
    danger: "border-destructive/30 bg-danger-soft",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md",
        tones[tone],
      )}
    >
      <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-success-soft text-success border-success/30",
    published: "bg-success-soft text-success border-success/30",
    completed: "bg-success-soft text-success border-success/30",
    Present: "bg-success-soft text-success border-success/30",
    submitted: "bg-secondary text-muted-foreground border-border",
    review: "bg-warning-soft text-warning border-warning/30",
    pending: "bg-warning-soft text-warning border-warning/30",
    Scheduled: "bg-warning-soft text-warning border-warning/30",
    correction: "bg-danger-soft text-destructive border-destructive/30",
    Absent: "bg-danger-soft text-destructive border-destructive/30",
    Late: "bg-warning-soft text-warning border-warning/30",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase",
        map[status] ?? "border-border bg-secondary text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}
