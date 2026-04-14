import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  markAllMessagesRead,
  markAllNotificationsRead,
  fetchMessages,
  fetchNotifications,
} from "./api/inbox";
import {
  fetchDashboard,
  type DashboardCalendar,
  type DashboardLearner,
  type DashboardPayload,
} from "./api/dashboard";
import { AdminLayout, type AdminUser } from "./components/admin/AdminLayout";
import { InboxDetailView } from "./components/inbox/InboxDetailView";
import { InboxListView } from "./components/inbox/InboxListView";
import type { InboxItem } from "./components/admin/headerInboxDemo";
import { SettingsModesPanel } from "./components/settings/SettingsModesPanel";
import { SettingsFeesStructurePanel } from "./components/settings/SettingsFeesStructurePanel";
import { ExpensesAllPage } from "./components/expenses/ExpensesAllPage";
import { SchoolExpensesPanel } from "./components/expenses/SchoolExpensesPanel";
import {
  FinanceSectionPage,
  type FinanceSection,
} from "./components/finance/FinanceSectionPage";
import {
  StudentsSectionPage,
  type StudentNavSection,
} from "./components/students/StudentsSectionPage";
import {
  StaffSectionPage,
  type StaffNavSection,
  type TeachingSection,
  type NonTeachingCategory,
} from "./components/staff/StaffSectionPage";
import {
  ClassesSectionPage,
  type ClassesSection,
} from "./components/classes/ClassesSectionPage";
import {
  CurriculumSectionPage,
  type CurriculumSection,
} from "./components/curriculum/CurriculumSectionPage";
import { useI18n } from "./i18n/I18nProvider";
import { formatShortAgo } from "./utils/formatShortAgo";

type DashboardProps = {
  user: AdminUser | null;
  profileLoading: boolean;
  profileError: string | null;
  onRetryProfile: () => void;
  onLogout: () => void;
  onAccountUpdated?: () => void;
};

const DASHBOARD_VIEW_STATE_KEY = "junior_school_dashboard_view_state";

const learnerToolbarBtn =
  "rounded-xl bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] p-2.5 text-[#636e72] shadow-[2px_2px_5px_rgba(200,188,170,0.35),-1px_-1px_4px_rgba(255,255,255,0.9)] transition hover:text-[#5a8faf] active:translate-y-px";

function LearnerProfileCard({ learner }: { learner: DashboardLearner }) {
  const { t } = useI18n();
  const fields = [
    { label: t("learner.gender"), value: learner.gender },
    { label: t("learner.roll"), value: learner.roll },
    { label: t("learner.admissionId"), value: learner.admissionId },
    { label: t("learner.admitted"), value: learner.admissionDate },
    { label: t("learner.class"), value: learner.className },
    { label: t("learner.section"), value: learner.section },
  ];

  return (
    <article className="neo-card-elevated flex min-w-0 flex-col overflow-hidden p-0">
      <header className="flex flex-col gap-3 border-b border-[#ebe4d9]/90 bg-gradient-to-r from-[#faf7f0] via-[#f5f0e6] to-[#e8f2ec]/60 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#636e72]">{learner.title}</p>
          <h3 className="mt-1 text-base font-bold leading-snug text-[#2d3436] sm:text-lg">
            {learner.name}
          </h3>
        </div>
        <div
          className="flex shrink-0 flex-wrap justify-end gap-1.5 rounded-xl bg-[#f5f0e6]/80 p-1.5 ring-1 ring-[#ebe4d9]/90"
          role="toolbar"
          aria-label={t("learner.toolbar")}
        >
          <button type="button" title={t("learner.view")} aria-label={t("learner.view")} className={learnerToolbarBtn}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden>
              <path
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
              />
              <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
          <button type="button" title={t("learner.print")} aria-label={t("learner.print")} className={learnerToolbarBtn}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden>
              <path
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
                d="M7 8V4h10v4M6 14H5a2 2 0 01-2-2V9h18v3a2 2 0 01-2 2h-1M7 18h10v4H7v-4z"
              />
              <path stroke="currentColor" strokeWidth="1.6" d="M7 14h10" />
            </svg>
          </button>
          <button type="button" title={t("learner.download")} aria-label={t("learner.download")} className={learnerToolbarBtn}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden>
              <path
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                d="M12 4v10m0 0l-3-3m3 3l3-3M5 19h14"
              />
            </svg>
          </button>
          <button type="button" title={t("learner.upload")} aria-label={t("learner.upload")} className={learnerToolbarBtn}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden>
              <path
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                d="M12 20v-10m0 0l-3 3m3-3l3 3M5 14v2a2 2 0 002 2h10a2 2 0 002-2v-2"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex shrink-0 justify-center sm:w-[5.5rem] sm:flex-col sm:items-center sm:gap-2">
          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#e8f4e9] via-[#d4eaf6] to-[#f7ebe9] text-3xl shadow-[inset_2px_2px_8px_rgba(200,188,170,0.35),inset_-2px_-2px_8px_rgba(255,255,255,0.9)]">
            <span aria-hidden>🎓</span>
          </div>
          <p className="hidden text-center text-[10px] font-semibold uppercase tracking-wide text-[#636e72] sm:block">
            {t("learner.photo")}
          </p>
        </div>

        <dl className="min-w-0 flex-1 space-y-0 divide-y divide-[#ebe4d9]/70">
          {fields.map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-1 py-2.5 first:pt-0 sm:flex-row sm:items-baseline sm:gap-4 sm:py-3"
            >
              <dt className="shrink-0 text-xs font-semibold text-[#636e72] sm:w-36 sm:shrink-0">
                {label}
              </dt>
              <dd className="min-w-0 text-sm font-semibold leading-snug text-[#2d3436] sm:flex-1">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="border-t border-[#ebe4d9]/80 bg-[#faf7f0]/40 px-4 py-2.5 text-[11px] leading-relaxed text-[#636e72]">
        {t("learner.demoFooter")}
      </p>
    </article>
  );
}

function StatCard({
  title,
  value,
  icon,
  className,
  iconTint,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  className: string;
  iconTint: string;
}) {
  return (
    <div className={`neo-stat flex items-center gap-4 p-4 sm:p-5 ${className}`}>
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[inset_2px_2px_6px_rgba(0,0,0,0.06),2px_2px_6px_rgba(255,255,255,0.85)] ${iconTint}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight tracking-tight text-[#2d3436]">{value}</p>
        <p className="text-sm font-semibold text-[#636e72]">{title}</p>
      </div>
    </div>
  );
}

const DEFAULT_CHART_POINTS: [number, number][] = [
  [0, 55],
  [30, 40],
  [60, 48],
  [90, 25],
  [120, 35],
  [150, 20],
  [180, 30],
  [200, 15],
];

function buildDirectoryStatCards(
  stats: DashboardPayload["stats"] | null,
  loading: boolean,
): {
  value: string;
  titleKey: string;
  className: string;
  iconTint: string;
  icon: ReactNode;
}[] {
  const v = (n: number | undefined) => {
    if (loading) return "—";
    if (n === undefined) return "—";
    return String(n);
  };
  const s = stats;
  return [
  {
    value: v(s?.totalStudents),
    titleKey: "stat.totalStudents",
    className: "bg-gradient-to-br from-[#fce8e5] via-[#f7d1cd] to-[#efd5d2]",
    iconTint: "bg-gradient-to-br from-[#fad5d0] to-[#f0b8b2] text-[#2d3436]",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M13 7a4 4 0 100-8 4 4 0 000 8z"
        />
      </svg>
    ),
  },
  {
    value: v(s?.totalTeachers),
    titleKey: "stat.totalTeachers",
    className: "bg-gradient-to-br from-[#e8f4e9] via-[#d4ead6] to-[#c5e3c8]",
    iconTint: "bg-gradient-to-br from-[#cde8cf] to-[#b8d8ba] text-[#2d3436]",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          d="M16 11a4 4 0 10-8 0M4 20v-1a6 6 0 0112 0v1M20 8v12M20 8l-3 3"
        />
      </svg>
    ),
  },
  {
    value: v(s?.totalParents),
    titleKey: "stat.totalParents",
    className: "bg-gradient-to-br from-[#e8f2fa] via-[#d4e8f5] to-[#c5dff0]",
    iconTint: "bg-gradient-to-br from-[#c9e2f2] to-[#b9d9eb] text-[#2d3436]",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M8 11a3 3 0 116 0M4 20v-1a5 5 0 0110 0v1M16 8l4 2v8"
        />
      </svg>
    ),
  },
  {
    value: v(s?.totalLibrarians),
    titleKey: "stat.totalLibrarians",
    className: "bg-gradient-to-br from-[#dfe8f5] via-[#c5d4eb] to-[#a8bdd9]",
    iconTint: "bg-gradient-to-br from-[#b9c9e0] to-[#8fa8c9] text-[#2d3436]",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          d="M6 4h12v16H6V4zm3 4h6M9 12h6"
        />
      </svg>
    ),
  },
  {
    value: v(s?.totalAccountants),
    titleKey: "stat.totalAccountants",
    className: "bg-gradient-to-br from-[#e5f2e6] via-[#d0e6d2] to-[#b8d8ba]",
    iconTint: "bg-gradient-to-br from-[#b8d8ba] to-[#8fb892] text-[#2d3436]",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M12 12a3 3 0 100-6 3 3 0 000 6zM6 20v-1a6 6 0 0112 0v1"
        />
      </svg>
    ),
  },
  {
    value: v(s?.totalEnquiries),
    titleKey: "stat.totalEnquiries",
    className: "bg-gradient-to-br from-[#fce8e5] via-[#f5d0cc] to-[#e8b8b2]",
    iconTint: "bg-gradient-to-br from-[#f0c4be] to-[#e8a8a2] text-[#2d3436]",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M12 8v4m0 4h.01M4 6h16v12H4V6z"
        />
      </svg>
    ),
  },
  {
    value: v(s?.allMessages),
    titleKey: "stat.allMessages",
    className: "bg-gradient-to-br from-[#dfe5ee] via-[#c8d3e3] to-[#a8b8ce]",
    iconTint: "bg-gradient-to-br from-[#aebfcf] to-[#8fa0b5] text-[#2d3436]",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          d="M4 6h16v10H8l-4 4V6z"
        />
      </svg>
    ),
  },
  {
    value: v(s?.presentToday),
    titleKey: "stat.presentToday",
    className: "bg-gradient-to-br from-[#e8f2fa] via-[#d4e8f5] to-[#c5dff0]",
    iconTint: "bg-gradient-to-br from-[#b9d9eb] to-[#8bb8d4] text-[#2d3436]",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M4 19V9M9 19V5M14 19v-6M19 19V12" />
      </svg>
    ),
  },
];
}

function EventScheduleCard({ calendar }: { calendar: DashboardCalendar | null }) {
  const { t } = useI18n();
  const ym = calendar?.yearMonth ?? "2026-04";
  const parts = ym.split("-").map(Number);
  const y = Number.isFinite(parts[0]) ? parts[0] : 2026;
  const mo = Number.isFinite(parts[1]) ? parts[1] : 4;
  const monthLabel =
    calendar?.monthLabel ??
    new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const first = new Date(y, mo - 1, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(y, mo, 0).getDate();
  const highlight = new Set(calendar?.highlightDays ?? []);
  const cells: (number | null)[] = [...Array(startPad).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  return (
    <section className="neo-card flex h-full flex-col p-4 sm:p-5">
      <h2 className="border-b border-[#ebe4d9] pb-2 text-sm font-semibold text-[#2d3436]">{t("dashboard.eventSchedule")}</h2>
      <p className="mt-3 text-center text-xs font-bold uppercase tracking-wide text-[#636e72]">{monthLabel}</p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#636e72]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`w-${i}`}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d == null ? (
            <span key={`e-${i}`} className="aspect-square" />
          ) : (
            <span
              key={`${d}-${i}`}
              className={`flex aspect-square items-center justify-center rounded-lg text-[11px] font-semibold ${
                highlight.has(d)
                  ? "bg-gradient-to-br from-[#cde8cf] to-[#b8d8ba] text-[#2d3436] shadow-[2px_2px_5px_rgba(120,150,125,0.35)]"
                  : "neo-inset text-[#636e72]"
              }`}
            >
              {d}
            </span>
          ),
        )}
      </div>
      <ul className="mt-3 space-y-1 text-xs text-[#636e72]">
        {(calendar?.events ?? []).slice(0, 4).map((ev) => (
          <li key={`${ev.date}-${ev.title}`}>
            <span className="font-semibold text-[#6a9570]">{ev.date}</span> — {ev.title}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[#636e72]">{t("dashboard.eventDemo")}</p>
    </section>
  );
}

function StatisticsChartCard({ chartPoints }: { chartPoints: [number, number][] }) {
  const { t } = useI18n();
  const coords = chartPoints.length >= 2 ? chartPoints : DEFAULT_CHART_POINTS;
  const linePts = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPts = `0,80 ${linePts} 200,80`;

  return (
    <section className="neo-card flex h-full flex-col p-4 sm:p-5">
      <h2 className="border-b border-[#ebe4d9] pb-2 text-sm font-semibold text-[#2d3436]">{t("dashboard.statisticsChart")}</h2>
      <p className="mt-2 text-xs text-[#636e72]">{t("dashboard.chartDemo")}</p>
      <div className="neo-inset-field mt-4 flex min-h-[180px] flex-1 items-end justify-center rounded-2xl p-4">
        <svg viewBox="0 0 200 80" className="h-full w-full max-h-40 text-[#6a9570]" aria-hidden>
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b8d8ba" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#b8d8ba" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon fill="url(#chartFill)" points={areaPts} />
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={linePts}
          />
          {coords.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="#5a8faf" />
          ))}
        </svg>
      </div>
    </section>
  );
}

type InboxScreen =
  | { screen: "home" }
  | { screen: "list"; kind: "notifications" | "messages" }
  | { screen: "detail"; kind: "notifications" | "messages"; id: number };

type PersistedViewState = {
  settingsPanel: string | null;
  inboxScreen: InboxScreen;
  mainView:
    | "dashboard"
    | "expenses"
    | "students"
    | "staff"
    | "finance"
    | "classes"
    | "curriculum";
  studentSection: StudentNavSection;
  staffSection: StaffNavSection;
  teachingSection: TeachingSection;
  nonTeachingCategory: NonTeachingCategory;
  financeSection: FinanceSection;
  classesSection: ClassesSection;
  curriculumSection: CurriculumSection;
  selectedClassName: string | null;
};

function readPersistedViewState(): PersistedViewState | null {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_VIEW_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedViewState>;
    const mainView =
      parsed.mainView === "expenses" ||
      parsed.mainView === "students" ||
      parsed.mainView === "staff" ||
      parsed.mainView === "finance" ||
      parsed.mainView === "classes" ||
      parsed.mainView === "curriculum"
        ? parsed.mainView
        : "dashboard";
    const studentSection =
      parsed.studentSection === "admissions" ||
      parsed.studentSection === "import"
        ? parsed.studentSection
        : "all";
    const staffSection =
      parsed.staffSection === "nonTeaching" || parsed.staffSection === "teaching"
        ? parsed.staffSection
        : "teaching";
    const teachingSection =
      parsed.teachingSection === "kindergarten" ||
      parsed.teachingSection === "lower_primary" ||
      parsed.teachingSection === "upper_primary" ||
      parsed.teachingSection === "all"
        ? parsed.teachingSection
        : "all";
    const nonTeachingCategory =
      parsed.nonTeachingCategory === "administration" ||
      parsed.nonTeachingCategory === "finance" ||
      parsed.nonTeachingCategory === "library" ||
      parsed.nonTeachingCategory === "health" ||
      parsed.nonTeachingCategory === "operations" ||
      parsed.nonTeachingCategory === "all"
        ? parsed.nonTeachingCategory
        : "all";
    const financeSection =
      parsed.financeSection === "daily_report" ||
      parsed.financeSection === "debtors_report" ||
      parsed.financeSection === "record_payment" ||
      parsed.financeSection === "bursery" ||
      parsed.financeSection === "staff_payment" ||
      parsed.financeSection === "finance_summary" ||
      parsed.financeSection === "overview"
        ? parsed.financeSection
        : "overview";
    const classesSection: ClassesSection =
      parsed.classesSection === "all_classes" ||
      parsed.classesSection === "sections_streams" ||
      parsed.classesSection === "class_students" ||
      parsed.classesSection === "class_teachers" ||
      parsed.classesSection === "class_categories" ||
      parsed.classesSection === "class_reports"
        ? parsed.classesSection
        : "all_classes";
    const curriculumSection: CurriculumSection =
      parsed.curriculumSection === "exam_bot" ||
      parsed.curriculumSection === "exam_mid" ||
      parsed.curriculumSection === "exam_eot" ||
      parsed.curriculumSection === "assessment_tests" ||
      parsed.curriculumSection === "result_entry" ||
      parsed.curriculumSection === "blank_page"
        ? parsed.curriculumSection
        : "exam_bot";
    const inboxScreen: InboxScreen =
      parsed.inboxScreen?.screen === "list" &&
      (parsed.inboxScreen.kind === "notifications" || parsed.inboxScreen.kind === "messages")
        ? { screen: "list", kind: parsed.inboxScreen.kind }
        : parsed.inboxScreen?.screen === "detail" &&
            (parsed.inboxScreen.kind === "notifications" ||
              parsed.inboxScreen.kind === "messages") &&
            Number.isFinite(parsed.inboxScreen.id)
          ? { screen: "detail", kind: parsed.inboxScreen.kind, id: Number(parsed.inboxScreen.id) }
          : { screen: "home" };
    return {
      settingsPanel: typeof parsed.settingsPanel === "string" ? parsed.settingsPanel : null,
      inboxScreen,
      mainView,
      studentSection,
      staffSection,
      teachingSection,
      nonTeachingCategory,
      financeSection,
      classesSection,
      curriculumSection,
      selectedClassName:
        typeof parsed.selectedClassName === "string" ? parsed.selectedClassName : null,
    };
  } catch {
    return null;
  }
}

function mapToHeaderItems(rows: { id: number; title: string; body: string; read: boolean; createdAt: string }[]): InboxItem[] {
  return rows.map((x) => ({
    id: String(x.id),
    title: x.title,
    body: x.body,
    read: x.read,
    time: formatShortAgo(x.createdAt),
  }));
}

export function Dashboard({
  user,
  profileLoading,
  profileError,
  onRetryProfile,
  onLogout,
  onAccountUpdated,
}: DashboardProps) {
  const { t } = useI18n();
  const initialView = readPersistedViewState();
  const [settingsPanel, setSettingsPanel] = useState<string | null>(
    initialView?.settingsPanel ?? null,
  );
  const [inboxScreen, setInboxScreen] = useState<InboxScreen>(
    initialView?.inboxScreen ?? { screen: "home" },
  );
  const [headerNotifications, setHeaderNotifications] = useState<InboxItem[]>([]);
  const [headerMessages, setHeaderMessages] = useState<InboxItem[]>([]);
  const [dash, setDash] = useState<DashboardPayload | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);
  const [mainView, setMainView] = useState<
    "dashboard" | "expenses" | "students" | "staff" | "finance" | "classes" | "curriculum"
  >(
    initialView?.mainView ?? "dashboard",
  );
  const [studentSection, setStudentSection] = useState<StudentNavSection>(
    initialView?.studentSection ?? "all",
  );
  const [staffSection, setStaffSection] = useState<StaffNavSection>(
    initialView?.staffSection ?? "teaching",
  );
  const [teachingSection, setTeachingSection] = useState<TeachingSection>(
    initialView?.teachingSection ?? "all",
  );
  const [nonTeachingCategory, setNonTeachingCategory] = useState<NonTeachingCategory>(
    initialView?.nonTeachingCategory ?? "all",
  );
  const [financeSection, setFinanceSection] = useState<FinanceSection>(
    initialView?.financeSection ?? "overview",
  );
  const [classesSection, setClassesSection] = useState<ClassesSection>(
    initialView?.classesSection ?? "all_classes",
  );
  const [curriculumSection, setCurriculumSection] = useState<CurriculumSection>(
    initialView?.curriculumSection ?? "exam_bot",
  );
  const [selectedClassName, setSelectedClassName] = useState<string | null>(
    initialView?.selectedClassName ?? null,
  );

  const refreshHeaderInbox = useCallback(async () => {
    try {
      const [n, m] = await Promise.all([
        fetchNotifications({ unreadOnly: true }),
        fetchMessages({ unreadOnly: true }),
      ]);
      setHeaderNotifications(mapToHeaderItems(n));
      setHeaderMessages(mapToHeaderItems(m));
    } catch {
      setHeaderNotifications([]);
      setHeaderMessages([]);
    }
  }, []);

  useEffect(() => {
    void refreshHeaderInbox();
  }, [refreshHeaderInbox]);

  useEffect(() => {
    if (settingsPanel === "modes") return;
    if (inboxScreen.screen !== "home") return;
    let cancelled = false;
    setDashLoading(true);
    setDashError(null);
    void fetchDashboard({ calendarMonth: "2026-04" })
      .then((data) => {
        if (!cancelled) setDash(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setDashError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inboxScreen.screen, settingsPanel]);

  useEffect(() => {
    try {
      const value: PersistedViewState = {
        settingsPanel,
        inboxScreen,
        mainView,
        studentSection,
        staffSection,
        teachingSection,
        nonTeachingCategory,
        financeSection,
        classesSection,
        curriculumSection,
        selectedClassName,
      };
      sessionStorage.setItem(DASHBOARD_VIEW_STATE_KEY, JSON.stringify(value));
    } catch {
      // Ignore storage failures (e.g. privacy mode/storage disabled).
    }
  }, [settingsPanel, inboxScreen, mainView, studentSection, staffSection, teachingSection, nonTeachingCategory, financeSection, classesSection, curriculumSection, selectedClassName]);

  const directoryCards = buildDirectoryStatCards(dash?.stats ?? null, dashLoading);
  const learners = dash?.learners ?? [];
  const notices = dash?.notices ?? [];
  const chartPoints = dash?.chartPoints ?? DEFAULT_CHART_POINTS;
  const socialTiles = dash?.social ?? [];
  const kpis = dash?.kpis;
  const snapshot = dash?.snapshot;

  return (
    <AdminLayout
      user={user}
      profileLoading={profileLoading}
      onLogout={onLogout}
      headerNotifications={headerNotifications}
      headerMessages={headerMessages}
      onMarkAllNotificationsRead={async () => {
        await markAllNotificationsRead();
        await refreshHeaderInbox();
      }}
      onMarkAllMessagesRead={async () => {
        await markAllMessagesRead();
        await refreshHeaderInbox();
      }}
      onOpenNotificationFromHeader={(id) => {
        setSettingsPanel(null);
        setInboxScreen({
          screen: "detail",
          kind: "notifications",
          id: Number.parseInt(id, 10),
        });
      }}
      onOpenMessageFromHeader={(id) => {
        setSettingsPanel(null);
        setInboxScreen({
          screen: "detail",
          kind: "messages",
          id: Number.parseInt(id, 10),
        });
      }}
      onReadMoreNotifications={() => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "list", kind: "notifications" });
      }}
      onReadMoreMessages={() => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "list", kind: "messages" });
      }}
      onOpenInboxList={(kind) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "list", kind });
      }}
      onDashboardHome={() => {
        setMainView("dashboard");
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
      }}
      onSelectSettingsPanel={(panel) => {
        setInboxScreen({ screen: "home" });
        setSettingsPanel(panel);
      }}
      onSelectStudentSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("students");
        setStudentSection(section);
      }}
      onSelectStaffSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("staff");
        setStaffSection(section);
      }}
      onSelectTeachingSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("staff");
        setStaffSection("teaching");
        setTeachingSection(section);
      }}
      onSelectNonTeachingCategory={(category) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("staff");
        setStaffSection("nonTeaching");
        setNonTeachingCategory(category);
      }}
      onSelectClassList={(className) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setSelectedClassName(className);
        setMainView("students");
        setStudentSection("all");
      }}
      onSelectClassSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("classes");
        setClassesSection(section);
      }}
      onSelectFinanceSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("finance");
        setFinanceSection(section);
      }}
      onSelectCurriculumSection={(section) => {
        setSettingsPanel(null);
        setInboxScreen({ screen: "home" });
        setMainView("curriculum");
        setCurriculumSection(section);
      }}
      onAccountUpdated={onAccountUpdated}
    >
      <main className="dashboard-main-padding">
        {settingsPanel === "modes" ? <SettingsModesPanel /> : null}
        {settingsPanel === "fees_structure" ? <SettingsFeesStructurePanel /> : null}
        {settingsPanel === "modes" || settingsPanel === "fees_structure" ? null : inboxScreen.screen !== "home" ? (
          inboxScreen.screen === "list" ? (
            <InboxListView
              kind={inboxScreen.kind}
              onBack={() => setInboxScreen({ screen: "home" })}
              onSelectItem={(id) =>
                setInboxScreen({
                  screen: "detail",
                  kind: inboxScreen.kind,
                  id,
                })
              }
              onInboxChanged={refreshHeaderInbox}
            />
          ) : (
            <InboxDetailView
              kind={inboxScreen.kind}
              id={inboxScreen.id}
              onBack={() =>
                setInboxScreen({
                  screen: "list",
                  kind: inboxScreen.kind,
                })
              }
              onInboxChanged={refreshHeaderInbox}
            />
          )
        ) : mainView === "expenses" ? (
          <ExpensesAllPage />
        ) : mainView === "students" ? (
          <StudentsSectionPage section={studentSection} classNameFilter={selectedClassName} />
        ) : mainView === "staff" ? (
          <StaffSectionPage
            section={staffSection}
            teachingSection={teachingSection}
            nonTeachingCategory={nonTeachingCategory}
            onChangeTeachingSection={setTeachingSection}
            onChangeNonTeachingCategory={setNonTeachingCategory}
          />
        ) : mainView === "finance" ? (
          <FinanceSectionPage
            section={financeSection}
            onChangeSection={setFinanceSection}
          />
        ) : mainView === "classes" ? (
          <ClassesSectionPage section={classesSection} />
        ) : mainView === "curriculum" ? (
          <CurriculumSectionPage section={curriculumSection} />
        ) : null}
        {settingsPanel === "modes" ||
        settingsPanel === "fees_structure" ||
        inboxScreen.screen !== "home" ||
        mainView === "expenses" ||
        mainView === "students" ||
        mainView === "staff" ||
        mainView === "finance" ||
        mainView === "classes" ||
        mainView === "curriculum" ? null : (
          <>
        {profileError ? (
          <div
            className="neo-card mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#2d3436]"
            role="alert"
          >
            <span>{profileError}</span>
            <button
              type="button"
              onClick={onRetryProfile}
              className="shrink-0 rounded-full bg-gradient-to-br from-[#b8d8ba] to-[#8fb892] px-5 py-2 text-sm font-bold text-[#2d3436] shadow-[3px_3px_8px_rgba(120,150,125,0.4),-2px_-2px_6px_rgba(255,255,255,0.8)] transition hover:brightness-105"
            >
              {t("dashboard.retry")}
            </button>
          </div>
        ) : null}

        {dashError ? (
          <div
            className="neo-card mb-6 px-4 py-3 text-sm text-[#2d3436]"
            role="alert"
          >
            {dashError}
          </div>
        ) : null}

        <section className="mb-6" aria-labelledby="sms-overview-heading">
          <h2
            id="sms-overview-heading"
            className="mb-3 text-xs font-bold uppercase tracking-wide text-[#636e72]"
          >
            {t("dashboard.directoryOverview")}
          </h2>
          <p className="mb-3 text-xs text-[#636e72]">{t("dashboard.directoryHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {directoryCards.map((s) => (
              <StatCard
                key={s.titleKey}
                value={s.value}
                title={t(s.titleKey)}
                className={s.className}
                iconTint={s.iconTint}
                icon={s.icon}
              />
            ))}
          </div>
        </section>

        <div className="mb-6 grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <EventScheduleCard calendar={dash?.calendar ?? null} />
          <StatisticsChartCard chartPoints={chartPoints} />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={t("dashboard.dueFees")}
            value={dashLoading ? "—" : (kpis?.dueFees ?? "—")}
            className="bg-gradient-to-br from-[#fce8e5] via-[#f7d1cd] to-[#efd5d2]"
            iconTint="bg-gradient-to-br from-[#fad5d0] to-[#f0b8b2] text-[#2d3436]"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
                <path
                  stroke="currentColor"
                  strokeWidth="1.8"
                  d="M12 3v18M7 8h10M7 12h6"
                />
              </svg>
            }
          />
          <StatCard
            title={t("dashboard.upcomingExams")}
            value={dashLoading ? "—" : (kpis?.upcomingExams ?? "—")}
            className="bg-gradient-to-br from-[#e8f4e9] via-[#d4ead6] to-[#c5e3c8]"
            iconTint="bg-gradient-to-br from-[#cde8cf] to-[#b8d8ba] text-[#2d3436]"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
                <path
                  stroke="currentColor"
                  strokeWidth="1.8"
                  d="M8 6h8v12H8V6zm2 0V4h4v2M10 10h4M10 14h4"
                />
              </svg>
            }
          />
          <StatCard
            title={t("dashboard.resultsPublished")}
            value={dashLoading ? "—" : (kpis?.resultsPublished ?? "—")}
            className="bg-gradient-to-br from-[#e8f2fa] via-[#d4e8f5] to-[#c5dff0]"
            iconTint="bg-gradient-to-br from-[#c9e2f2] to-[#b9d9eb] text-[#2d3436]"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
                <path
                  stroke="currentColor"
                  strokeWidth="1.8"
                  d="M12 3l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V7l7-4z"
                />
              </svg>
            }
          />
          <StatCard
            title={t("dashboard.termExpenses")}
            value={dashLoading ? "—" : (kpis?.termExpenses ?? "—")}
            className="bg-gradient-to-br from-[#f2ebe4] via-[#ebe4d9] to-[#dceef6]"
            iconTint="bg-gradient-to-br from-[#e0ebe8] to-[#c9e2f2] text-[#2d3436]"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden>
                <path
                  stroke="currentColor"
                  strokeWidth="1.8"
                  d="M4 6h16v10H4V6zm2 4h4M4 18h16v2H4v-2z"
                />
              </svg>
            }
          />
        </div>

        <div className="space-y-6">
          <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-stretch">
            <div className="grid min-w-0 grid-cols-1 gap-6">
              {learners.length === 0 ? (
                <p className="text-sm text-[#636e72]">{t("dashboard.noLearners")}</p>
              ) : (
                learners.map((learner) => (
                  <LearnerProfileCard key={learner.admissionId} learner={learner} />
                ))
              )}
            </div>
            <aside className="flex min-h-0 lg:min-h-full">
              <section className="neo-card flex h-full w-full flex-col p-5">
                <h2 className="border-b border-[#ebe4d9] pb-3 font-semibold text-[#2d3436]">
                  {t("dashboard.noticeBoard")}
                </h2>
                <ul className="mt-4 space-y-4">
                  {notices.length === 0 ? (
                    <li className="text-sm text-[#636e72]">{t("dashboard.noNotices")}</li>
                  ) : null}
                  {notices.map((n, i) => (
                    <li key={i} className="text-sm">
                      <p className="text-xs font-bold text-[#6a9570]">{n.date}</p>
                      <p className="mt-1 font-semibold text-[#2d3436]">{n.author}</p>
                      <p className="mt-1 leading-relaxed text-[#636e72]">{n.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="neo-card flex h-full flex-col bg-gradient-to-br from-[#faf7f0] to-[#e8f2fa] p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#636e72]">
                {t("dashboard.schoolSnapshot")}
              </h2>
              <p className="mt-3 text-3xl font-bold text-[#2d3436]">
                {dashLoading ? "—" : (snapshot?.activeStudents.toLocaleString() ?? "—")}
              </p>
              <p className="text-sm text-[#636e72]">{t("dashboard.activeStudentsHint")}</p>
              <div className="mt-auto flex gap-2 border-t border-[#ebe4d9] pt-4">
                <button
                  type="button"
                  className="rounded-full bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] px-4 py-1.5 text-xs font-semibold text-[#2d3436] shadow-[3px_3px_6px_rgba(200,188,170,0.35),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:text-[#5a8faf]"
                >
                  {t("dashboard.view")}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] px-4 py-1.5 text-xs font-semibold text-[#2d3436] shadow-[3px_3px_6px_rgba(200,188,170,0.35),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:text-[#5a8faf]"
                >
                  {t("dashboard.export")}
                </button>
              </div>
            </article>
            <article className="neo-card flex h-full flex-col bg-gradient-to-br from-[#f5f0e6] to-[#e8f4e9] p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#636e72]">
                {t("dashboard.classesSections")}
              </h2>
              <p className="mt-3 text-3xl font-bold text-[#2d3436]">
                {dashLoading ? "—" : (snapshot?.classRooms.toLocaleString() ?? "—")}
              </p>
              <p className="text-sm text-[#636e72]">{t("dashboard.homeroomsHint")}</p>
              <div className="mt-auto flex gap-2 border-t border-[#ebe4d9] pt-4">
                <button
                  type="button"
                  className="rounded-full bg-gradient-to-br from-[#cde8cf] to-[#b8d8ba] px-4 py-1.5 text-xs font-bold text-[#2d3436] shadow-[3px_3px_6px_rgba(120,150,125,0.3),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:brightness-105"
                >
                  {t("dashboard.manage")}
                </button>
              </div>
            </article>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {socialTiles.length === 0 ? (
              <p className="col-span-full text-sm text-[#636e72]">{t("dashboard.noSocial")}</p>
            ) : (
              socialTiles.map((s) => (
                <div
                  key={s.platformKey}
                  className={`flex min-h-[5.5rem] flex-col items-center justify-center rounded-2xl px-3 py-4 text-center ${s.className}`}
                >
                  <p className="text-lg font-bold">{dashLoading ? "—" : s.sub}</p>
                  <p className="text-xs font-semibold opacity-90">{s.label}</p>
                </div>
              ))
            )}
          </div>

          <SchoolExpensesPanel
            limit={25}
            title={t("dashboard.recentExpenses")}
            showShowAll
            onShowAll={() => {
              setSettingsPanel(null);
              setInboxScreen({ screen: "home" });
              setMainView("expenses");
            }}
          />
        </div>
          </>
        )}
      </main>
    </AdminLayout>
  );
}
