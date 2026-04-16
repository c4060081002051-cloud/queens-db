import { type ReactNode } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { type DashboardCalendar, type DashboardLearner } from "../../api/dashboard";

const learnerToolbarBtn =
  "rounded-xl bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] p-2.5 text-[#636e72] shadow-[2px_2px_5px_rgba(200,188,170,0.35),-1px_-1px_4px_rgba(255,255,255,0.9)] transition hover:text-[#5a8faf] active:translate-y-px";

export function LearnerProfileCard({ learner }: { learner: DashboardLearner }) {
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
          <button type="button" title={t("learner.view")} className={learnerToolbarBtn}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
          <button type="button" title={t("learner.print")} className={learnerToolbarBtn}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" d="M7 8V4h10v4M6 14H5a2 2 0 01-2-2V9h18v3a2 2 0 01-2 2h-1M7 18h10v4H7v-4z" />
              <path stroke="currentColor" strokeWidth="1.6" d="M7 14h10" />
            </svg>
          </button>
        </div>
      </header>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex shrink-0 justify-center sm:w-[5.5rem] sm:flex-col sm:items-center sm:gap-2">
          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#e8f4e9] via-[#d4eaf6] to-[#f7ebe9] text-3xl shadow-[inset_2px_2px_8px_rgba(200,188,170,0.35),inset_-2px_-2px_8px_rgba(255,255,255,0.9)]">
            <span aria-hidden>🎓</span>
          </div>
        </div>
        <dl className="min-w-0 flex-1 space-y-0 divide-y divide-[#ebe4d9]/70">
          {fields.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1 py-1.5 sm:flex-row sm:items-baseline sm:gap-4 sm:py-2">
              <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[#636e72] sm:w-28">
                {label}
              </dt>
              <dd className="min-w-0 text-xs font-bold leading-snug text-[#2d3436] sm:flex-1">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

export function StatCard({
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
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[inset_2px_2px_6px_rgba(0,0,0,0.06),2px_2px_6px_rgba(255,255,255,0.85)] ${iconTint}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight tracking-tight text-[#2d3436]">{value}</p>
        <p className="text-sm font-semibold text-[#636e72]">{title}</p>
      </div>
    </div>
  );
}

export function EventScheduleCard({ calendar }: { calendar: DashboardCalendar | null }) {
  const { t } = useI18n();
  const ym = calendar?.yearMonth ?? "2026-04";
  const parts = ym.split("-").map(Number);
  const y = parts[0] || 2026;
  const mo = parts[1] || 4;
  const monthLabel = calendar?.monthLabel ?? new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const first = new Date(y, mo - 1, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(y, mo, 0).getDate();
  const highlight = new Set(calendar?.highlightDays ?? []);
  const cells: (number | null)[] = [...Array(startPad).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <section className="neo-card flex h-full flex-col p-4 sm:p-5">
      <h2 className="border-b border-[#ebe4d9] pb-2 text-sm font-semibold text-[#2d3436]">{t("dashboard.eventSchedule")}</h2>
      <p className="mt-3 text-center text-xs font-bold uppercase tracking-wide text-[#636e72]">{monthLabel}</p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#636e72]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d == null ? <span key={i} /> : (
            <span key={i} className={`flex aspect-square items-center justify-center rounded-lg text-[11px] font-semibold ${highlight.has(d) ? "bg-gradient-to-br from-[#cde8cf] to-[#b8d8ba] text-[#2d3436]" : "neo-inset text-[#636e72]"}`}>
              {d}
            </span>
          )
        )}
      </div>
      <ul className="mt-3 space-y-1 text-xs text-[#636e72]">
        {(calendar?.events ?? []).slice(0, 3).map((ev, i) => (
          <li key={i}><span className="font-semibold text-[#6a9570]">{ev.date}</span> — {ev.title}</li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardSectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold tracking-tight text-[#2d3436]">{title}</h2>
      {subtitle && <p className="text-xs font-semibold text-[#636e72]">{subtitle}</p>}
    </div>
  );
}

export function StatisticsChartCard({ chartPoints, title, subtitle }: { chartPoints: [number, number][], title: string, subtitle?: string }) {
  const linePts = chartPoints.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPts = `0,80 ${linePts} 200,80`;

  return (
    <section className="neo-card flex h-full flex-col p-4 sm:p-5">
      <h2 className="border-b border-[#ebe4d9] pb-2 text-sm font-semibold text-[#2d3436]">{title}</h2>
      {subtitle && <p className="mt-2 text-xs text-[#636e72]">{subtitle}</p>}
      <div className="neo-inset-field mt-4 flex min-h-[160px] flex-1 items-end justify-center rounded-2xl p-4">
        <svg viewBox="0 0 200 80" className="h-full w-full max-h-40 text-[#6a9570]">
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b8d8ba" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#b8d8ba" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon fill="url(#chartFill)" points={areaPts} />
          <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={linePts} />
          {chartPoints.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#5a8faf" />)}
        </svg>
      </div>
    </section>
  );
}
