export const PERMISSION_KEYS = [
  "nav_dashboard",
  "nav_students",
  "nav_classes",
  "nav_staff",
  "nav_curriculum",
  "nav_operations",
  "nav_communication",
  "nav_settings",
  "view_stats",
  "view_insights",
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];
