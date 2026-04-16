import { type DashboardPayload } from "../../api/dashboard";
import { useI18n } from "../../i18n/I18nProvider";
import { StatCard, EventScheduleCard, StatisticsChartCard, DashboardSectionTitle } from "./OverviewShared";

export function HeadTeacherOverview({ dash, loading }: { dash: DashboardPayload | null, loading: boolean }) {
  const { t } = useI18n();
  const s = dash?.stats;

  if (loading && !dash) {
    return <div className="p-8 text-center animate-pulse text-[#636e72] font-semibold">Loading Oversight Dashboard...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DashboardSectionTitle 
        title={t("dashboard.headTeacherOverview")} 
        subtitle="School-wide performance and administrative oversight" 
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("stat.totalStudents")}
          value={String(s?.totalStudents ?? "—")}
          className="bg-gradient-to-br from-[#fce8e5] to-[#efd5d2]"
          iconTint="bg-white/40 text-[#2d3436]"
          icon={<span className="text-xl">🎓</span>}
        />
        <StatCard
          title={t("stat.totalTeachers")}
          value={String(s?.totalTeachers ?? "—")}
          className="bg-gradient-to-br from-[#e8f4e9] to-[#c5e3c8]"
          iconTint="bg-white/40 text-[#2d3436]"
          icon={<span className="text-xl">👩‍🏫</span>}
        />
        <StatCard
          title="Daily Attendance"
          value={`${s?.presentToday ?? 0}`}
          className="bg-gradient-to-br from-[#e8f2fa] to-[#c5dff0]"
          iconTint="bg-white/40 text-[#2d3436]"
          icon={<span className="text-xl">✅</span>}
        />
        <StatCard
          title="Open Enquiries"
          value={String(s?.totalEnquiries ?? "—")}
          className="bg-gradient-to-br from-[#dfe8f5] to-[#a8bdd9]"
          iconTint="bg-white/40 text-[#2d3436]"
          icon={<span className="text-xl">📩</span>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StatisticsChartCard 
            title="Enrolment Trend" 
            subtitle="Growth in student admissions over the current academic cycle"
            chartPoints={dash?.chartPoints ?? []} 
          />
        </div>
        <div>
          <EventScheduleCard calendar={dash?.calendar ?? null} />
        </div>
      </div>

      <section className="neo-card p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#636e72]">Administrative Notices</h3>
        <div className="space-y-3">
          {dash?.notices.slice(0, 3).map((n, i) => (
            <div key={i} className="flex gap-4 border-l-4 border-[#6a9570] bg-[#f5f0e6]/30 p-3 rounded-r-xl">
              <div className="flex-1">
                <p className="text-xs font-bold text-[#2d3436]">{n.author}</p>
                <p className="mt-1 text-sm text-[#636e72] line-clamp-2">{n.text}</p>
              </div>
              <span className="text-[10px] font-semibold text-[#636e72] whitespace-nowrap">{n.date}</span>
            </div>
          ))}
          {dash?.notices.length === 0 && <p className="text-sm text-[#636e72] italic">No active administrative notices.</p>}
        </div>
      </section>
    </div>
  );
}
