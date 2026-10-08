import {
  LayoutDashboard,
  ClipboardCheck,
  Award,
  CreditCard,
  User,
  Users,
  Megaphone,
  Inbox,
  BookOpen,
  Users2,
  GraduationCap,
  UserCog,
  ListChecks,
} from "lucide-react";

/**
 * Server Components can't pass a component reference (a function) as a prop
 * to a Client Component — only plain, serializable data. So layouts pass an
 * icon *name* (a string) instead, and this map — imported only from inside
 * Client Components (Sidebar, MobileNav) — resolves it to the real icon.
 */
export const NAV_ICONS = {
  dashboard: LayoutDashboard,
  assignments: ClipboardCheck,
  certificates: Award,
  payments: CreditCard,
  profile: User,
  cohorts: Users,
  announcements: Megaphone,
  applications: Inbox,
  courses: BookOpen,
  cohortsAdmin: Users2,
  students: GraduationCap,
  instructors: UserCog,
  quizzes: ListChecks,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;
