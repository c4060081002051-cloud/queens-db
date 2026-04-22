/**
 * Mirrors backend `PERMISSION_KEYS` — grouped by sector for the settings UI.
 * When new keys are added on the server, extend this catalog.
 */

export type PermissionSectorDef = {
  id: string;
  title: string;
  subtitle: string;
  keys: readonly string[];
};

export const PERMISSION_SECTORS: PermissionSectorDef[] = [
  {
    id: "dashboard",
    title: "Dashboard & overview",
    subtitle: "Home screen, headline metrics, and leadership insights.",
    keys: ["nav_dashboard", "view_stats", "view_insights"],
  },
  {
    id: "students",
    title: "Students",
    subtitle: "Admissions, profiles, lists, imports, and parent-linked records.",
    keys: ["nav_students"],
  },
  {
    id: "classes",
    title: "Classes & sections",
    subtitle: "Class lists, streams, teachers on class, and class reports.",
    keys: ["nav_classes"],
  },
  {
    id: "staff",
    title: "Staff",
    subtitle: "Teaching and non-teaching staff records and assignments.",
    keys: ["nav_staff"],
  },
  {
    id: "curriculum",
    title: "Curriculum & assessments",
    subtitle: "Exams, marks entry, results, and academic assessment tools.",
    keys: ["nav_curriculum"],
  },
  {
    id: "operations",
    title: "Finance & operations",
    subtitle: "Fees, payments, bursary, expenses, payroll, and finance reports.",
    keys: ["nav_operations"],
  },
  {
    id: "communication",
    title: "Communication",
    subtitle: "Notice board, messaging, and school-wide announcements.",
    keys: ["nav_communication"],
  },
  {
    id: "settings",
    title: "Settings & administration",
    subtitle: "School profile, fees structure, users, roles, and system preferences.",
    keys: ["nav_settings"],
  },
] as const;

export const PERMISSION_DETAILS: Record<
  string,
  { title: string; description: string }
> = {
  nav_dashboard: {
    title: "Access dashboard",
    description: "Open the main dashboard after sign-in (role-specific overview cards).",
  },
  view_stats: {
    title: "View headline statistics",
    description: "See aggregate counts and KPI-style figures on the dashboard.",
  },
  view_insights: {
    title: "View insights & summaries",
    description: "See deeper summaries, trends, or analytical callouts where provided.",
  },
  nav_students: {
    title: "Students module",
    description: "Use the Students area: overview, admissions, all students, profiles, import, parents.",
  },
  nav_classes: {
    title: "Classes & sections module",
    description: "Use the Classes area: classes, sections/streams, class students, teachers, categories, reports.",
  },
  nav_staff: {
    title: "Staff module",
    description: "Use the Staff area: teaching and non-teaching staff views and related workflows.",
  },
  nav_curriculum: {
    title: "Curriculum module",
    description: "Use the Curriculum area: exams, assessments, result entry, and related tools.",
  },
  nav_operations: {
    title: "Finance & operations module",
    description: "Use the Finance area: reports, assign fees, record payments, bursary, staff pay, summaries.",
  },
  nav_communication: {
    title: "Communication module",
    description: "Use the Communication area: notice board and related messaging features.",
  },
  nav_settings: {
    title: "Settings module",
    description: "Use Settings: general school options, fees structure, users, roles, and security-related panels.",
  },
};

export function groupAvailableKeysBySector(availableKeys: string[]): PermissionSectorDef[] {
  const set = new Set(availableKeys);
  return PERMISSION_SECTORS.map((sector) => ({
    ...sector,
    keys: sector.keys.filter((k) => set.has(k)),
  })).filter((s) => s.keys.length > 0);
}

/** Keys returned by API but missing from sector defs (fallback bucket). */
export function orphanPermissionKeys(availableKeys: string[]): string[] {
  const assigned = new Set(PERMISSION_SECTORS.flatMap((s) => [...s.keys]));
  return availableKeys.filter((k) => !assigned.has(k));
}
