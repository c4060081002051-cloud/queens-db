import { apiUrl, authHeaders } from "./baseUrl";

export type DashboardStats = {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalLibrarians: number;
  totalAccountants: number;
  totalEnquiries: number;
  allMessages: number;
  presentToday: number;
};

export type DashboardKpis = {
  dueFees: string;
  upcomingExams: string;
  resultsPublished: string;
  termExpenses: string;
};

export type DashboardSnapshot = {
  activeStudents: number;
  classRooms: number;
};

export type DashboardCalendar = {
  yearMonth: string;
  monthLabel: string;
  highlightDays: number[];
  /** `date` is formatted DD/MM/YYYY for display */
  events: { date: string; day: number; title: string }[];
};

export type DashboardLearner = {
  title: string;
  name: string;
  gender: string;
  admissionId: string;
  /** DD/MM/YYYY */
  admissionDate: string;
  className: string;
  section: string;
};

export type DashboardNotice = {
  /** DD/MM/YYYY */
  date: string;
  author: string;
  text: string;
};

export type DashboardExpenseRow = {
  id: string;
  type: string;
  amount: string;
  amountUgx: string;
  status: "Paid" | "Due";
  email: string;
  /** DD/MM/YYYY */
  date: string;
  /** ISO time when the expense was recorded (optional for older API responses). */
  recordedAt?: string;
};

export type DashboardSocialTile = {
  platformKey: string;
  label: string;
  sub: string;
  className: string;
};

export type DashboardPayload = {
  stats: DashboardStats;
  kpis: DashboardKpis;
  snapshot: DashboardSnapshot;
  calendar: DashboardCalendar;
  chartPoints: [number, number][];
  social: DashboardSocialTile[];
  learners: DashboardLearner[];
  notices: DashboardNotice[];
  expenses: DashboardExpenseRow[];
};

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) throw new Error("Empty response");
  return JSON.parse(text) as T;
}

export async function fetchDashboard(opts?: {
  calendarMonth?: string;
}): Promise<DashboardPayload> {
  const q =
    opts?.calendarMonth && /^\d{4}-\d{2}$/.test(opts.calendarMonth)
      ? `?calendarMonth=${encodeURIComponent(opts.calendarMonth)}`
      : "";
  const res = await fetch(apiUrl(`/api/me/dashboard${q}`), {
    headers: { ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const err = await readJson<{ error?: string; detail?: string }>(res).catch(
      () => null,
    );
    if (res.status === 503 && err?.error === "Database unavailable") {
      const tech =
        err.detail && import.meta.env.DEV
          ? `\n\nDetails (dev only): ${err.detail}`
          : "";
      throw new Error(
        "Could not load dashboard data — database unreachable or schema out of date. Start MySQL, run npm run db:sync in backend, then npm run seed:dashboard for sample rows." +
          tech,
      );
    }
    throw new Error(err?.error ?? "Request failed");
  }
  return readJson<DashboardPayload>(res);
}
