import type { NavItem } from "@/components/shell/sidebar";
import type { UserRole } from "@/lib/types";

export const STUDENT_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/announcements", label: "Announcements", icon: "announcements" },
  { href: "/assignments", label: "Assignments", icon: "assignments" },
  { href: "/certificates", label: "Certificates", icon: "certificates" },
  { href: "/payments", label: "Payments", icon: "payments" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

export const INSTRUCTOR_ITEMS: NavItem[] = [
  { href: "/teach", label: "My cohorts", icon: "cohorts" },
  { href: "/teach/courses", label: "Courses", icon: "courses" },
  { href: "/teach/quizzes", label: "Quizzes", icon: "quizzes" },
  { href: "/teach/submissions", label: "Submissions", icon: "assignments" },
  { href: "/teach/announcements", label: "Announcements", icon: "announcements" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

export const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/applications", label: "Applications", icon: "applications" },
  { href: "/admin/courses", label: "Courses", icon: "courses" },
  { href: "/admin/cohorts", label: "Cohorts", icon: "cohortsAdmin" },
  { href: "/admin/students", label: "Students", icon: "students" },
  { href: "/admin/instructors", label: "Instructors", icon: "instructors" },
  { href: "/admin/payments", label: "Payments", icon: "payments" },
  { href: "/admin/certificates", label: "Certificates", icon: "certificates" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

export const PORTAL_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  instructor: "Instructor",
  student: "Student",
};

export function itemsForRole(role: UserRole): NavItem[] {
  if (role === "admin") return ADMIN_ITEMS;
  if (role === "instructor") return INSTRUCTOR_ITEMS;
  return STUDENT_ITEMS;
}
