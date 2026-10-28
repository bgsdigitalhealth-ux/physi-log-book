import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageCircleQuestion,
  Printer,
  Settings,
  ShieldCheck,
  TrendingUp,
  User,
  UserCog,
  PencilLine,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/auth";

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
};

export const studentNav: NavItem[] = [
  { id: "dashboard-overview", label: "Dashboard Overview", icon: LayoutDashboard },
  { id: "my-profile", label: "My Profile", icon: User },
  { id: "assigned-practicals", label: "Assigned Practicals", icon: BookOpen },
  { id: "practical-entry", label: "Practical Entry", icon: ClipboardList },
  { id: "submission-status", label: "Submission Status", icon: FileCheck2 },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "progress-analytics", label: "Progress & Analytics", icon: BarChart3 },
  { id: "feedback-viva", label: "Upgrade", icon: TrendingUp },
  { id: "viva-questions", label: "Viva Questions", icon: MessageCircleQuestion },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "download-print", label: "Download / Print Journal", icon: Printer },
  { id: "learning-resources", label: "Learning Resources", icon: Library },
];

export const facultyNav: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "my-batches", label: "My Batches", icon: Users },
  { id: "student-records", label: "Student Records", icon: FileText },
  { id: "reviews-approvals", label: "Reviews & Approvals", icon: ClipboardCheck },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "practical-templates", label: "Practical Templates", icon: BookOpen },
  { id: "practical-sessions", label: "Practical Sessions", icon: ListChecks },
  { id: "viva-upload", label: "Upload Viva Questions", icon: MessageCircleQuestion },
  { id: "reports-analytics", label: "Reports & Analytics", icon: BarChart3 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

export const adminNav: NavItem[] = [
  { id: "edit-web", label: "Edit web", icon: PencilLine },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "manage-users", label: "Manage Users", icon: UserCog },
  { id: "manage-batches", label: "Manage Batches", icon: Users },
  { id: "manage-practicals", label: "Manage Practicals", icon: BookOpen },
  { id: "practical-templates", label: "Practical Templates", icon: ClipboardList },
  { id: "session-management", label: "Session Management", icon: ListChecks },
  { id: "student-records", label: "Student Records", icon: FileText },
  { id: "reviews-approvals", label: "Review Queue Oversight", icon: ClipboardCheck },
  { id: "attendance", label: "Attendance Oversight", icon: CalendarDays },
  { id: "reports-analytics", label: "Reports & Analytics", icon: BarChart3 },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export const navFor = (role: AppRole | null): NavItem[] =>
  role === "faculty" ? facultyNav : role === "admin" ? adminNav : studentNav;

export const roleLabel: Record<AppRole, string> = {
  student: "Student",
  faculty: "Faculty",
  admin: "Administrator",
};

export const homeFor = (role: AppRole | null) =>
  role === "faculty" ? "/faculty" : role === "admin" ? "/admin" : "/student";

export { ShieldCheck, GraduationCap };
