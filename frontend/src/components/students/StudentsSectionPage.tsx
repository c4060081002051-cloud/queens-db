import { useEffect, useMemo, useState } from "react";
import { AdmissionImportTable } from "./AdmissionImportTable";
import { NewAdmissionForm } from "./NewAdmissionForm";
import { ParentsSectionPage } from "./ParentsSectionPage";
import { StudentsListPanel } from "./StudentsListPanel";
import { fetchStudents, type StudentApiRow } from "../../api/students";
import { useI18n } from "../../i18n/I18nProvider";

export type StudentNavSection =
  | "overview"
  | "all"
  | "admissions"
  | "profiles"
  | "import"
  | "parents";

export function StudentsSectionPage({
  section,
  classNameFilter = null,
  onChangeSection,
}: {
  section: StudentNavSection;
  classNameFilter?: string | null;
  onChangeSection?: (value: StudentNavSection) => void;
}) {
  const { t } = useI18n();
  const [listRefresh, setListRefresh] = useState(0);
  const [overviewRows, setOverviewRows] = useState<StudentApiRow[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);

  useEffect(() => {
    if (section !== "overview") return;
    let cancelled = false;
    setOverviewLoading(true);
    void fetchStudents({ sortBy: "date", sortDir: "desc", limit: 500 })
      .then((rows) => {
        if (!cancelled) {
          setOverviewRows(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOverviewRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [section, listRefresh]);

  const overviewStats = useMemo(() => {
    const rows = classNameFilter
      ? overviewRows.filter(
          (row) =>
            (row.className ?? "").trim().toLowerCase() ===
            classNameFilter.trim().toLowerCase(),
        )
      : overviewRows;
    const parentEmails = new Set(
      rows.map((row) => row.parentEmail?.trim().toLowerCase()).filter(Boolean),
    );
    const classNames = new Set(
      rows.map((row) => row.className?.trim()).filter(Boolean),
    );
    const newAdmissions = rows.filter((row) =>
      ["new_admission", "first"].includes(row.registrationType.toLowerCase()),
    ).length;
    return {
      totalStudents: rows.length,
      totalParents: parentEmails.size,
      totalClasses: classNames.size,
      newAdmissions,
      recentStudents: rows.slice(0, 6),
    };
  }, [overviewRows, classNameFilter]);

  const titleKey =
    section === "admissions"
      ? "students.page.admissionsTitle"
      : section === "import"
        ? "students.page.importTitle"
      : section === "parents"
        ? "students.page.parentsTitle"
      : section === "profiles"
        ? "students.page.profilesTitle"
        : "students.page.allTitle";
  const introKey =
    section === "admissions"
      ? "students.page.introAdmissions"
      : section === "import"
        ? "students.page.introImport"
      : section === "parents"
        ? "students.page.introParents"
      : section === "profiles"
        ? "students.page.introProfiles"
        : "students.page.introAll";

  if (section === "overview") {
    const cards: Array<{
      key: Exclude<StudentNavSection, "all">;
      title: string;
      desc: string;
      icon: string;
      color: string;
    }> = [
      {
        key: "admissions",
        title: t("students.page.admissionsTitle"),
        desc: "Register new learners and capture admission details.",
        icon: "📝",
        color: "from-[#eef2f7] to-[#e0e7f1]",
      },
      {
        key: "profiles",
        title: t("students.page.profilesTitle"),
        desc: "Open learner records and review individual profiles.",
        icon: "🎓",
        color: "from-[#f5fbf8] to-[#e8f5ed]",
      },
      {
        key: "import",
        title: t("students.page.importTitle"),
        desc: "Bulk import admissions into the student register.",
        icon: "📥",
        color: "from-[#fff9f4] to-[#ffeadb]",
      },
      {
        key: "parents",
        title: t("students.page.parentsTitle"),
        desc: "Review parents and guardians linked to each learner.",
        icon: "👨‍👩‍👧",
        color: "from-[#fff5f5] to-[#ffe8e8]",
      },
    ];

    return (
      <div className="min-w-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <header className="border-b border-[#ebe4d9]/80 pb-6">
          <h1 className="text-3xl font-black tracking-tight text-[#2d3436]">
            Student Command Center
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#636e72]">
            Review enrolment, open student workflows quickly, and keep the learner
            directory organized from one place.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StudentStatCard
            label="Total Students"
            value={overviewLoading ? "..." : String(overviewStats.totalStudents)}
            tone="blue"
          />
          <StudentStatCard
            label="Parents / Guardians"
            value={overviewLoading ? "..." : String(overviewStats.totalParents)}
            tone="green"
          />
          <StudentStatCard
            label="Active Classes"
            value={overviewLoading ? "..." : String(overviewStats.totalClasses)}
            tone="amber"
          />
          <StudentStatCard
            label="New Admissions"
            value={overviewLoading ? "..." : String(overviewStats.newAdmissions)}
            tone="rose"
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => onChangeSection?.(card.key)}
              className={`group neo-card bg-gradient-to-br p-5 text-left transition-all hover:translate-y-[-2px] hover:shadow-lg ${card.color}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-2xl" role="img" aria-label={card.title}>
                  {card.icon}
                </span>
                <svg
                  className="h-5 w-5 translate-x-1 text-[#5a8faf] opacity-0 transition-opacity group-hover:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </div>
              <h2 className="text-base font-bold text-[#2d3436] transition-colors group-hover:text-[#5a8faf]">
                {card.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#636e72]">
                {card.desc}
              </p>
            </button>
          ))}
        </section>

        <section>
          <div className="neo-card overflow-hidden p-0">
            <div className="border-b border-[#ebe4d9]/80 bg-[#faf7f0]/40 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#2d3436]">
                Recent Admissions
              </h2>
              <p className="mt-1 text-xs text-[#636e72]">
                Newly added learners appear here for quick follow-up.
              </p>
            </div>
            {overviewLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5a8faf] border-t-transparent" />
              </div>
            ) : overviewStats.recentStudents.length === 0 ? (
              <div className="px-5 py-10 text-sm text-[#636e72]">
                No student records available yet.
              </div>
            ) : (
              <div className="divide-y divide-[#ebe4d9]/70">
                {overviewStats.recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#2d3436]">
                        {student.fullName}
                      </p>
                      <p className="mt-1 text-xs text-[#636e72]">
                        {student.admissionNumber} · {student.className || "No class"} ·{" "}
                        {student.sectionName || "No section"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onChangeSection?.("profiles")}
                      className="rounded-full bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] px-4 py-1.5 text-xs font-semibold text-[#2d3436] shadow-[3px_3px_6px_rgba(200,188,170,0.35),-2px_-2px_5px_rgba(255,255,255,0.85)] transition hover:text-[#5a8faf]"
                    >
                      Open Profiles
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>

      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="border-b border-[#ebe4d9]/80 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">{t(titleKey)}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#636e72]">{t(introKey)}</p>
      </header>

      {section === "admissions" ? (
        <NewAdmissionForm onCreated={() => setListRefresh((k) => k + 1)} />
      ) : section === "import" ? (
        <AdmissionImportTable onDone={() => setListRefresh((k) => k + 1)} />
      ) : section === "parents" ? (
        <ParentsSectionPage />
      ) : (
        <StudentsListPanel
          limit={500}
          showDirectoryTools
          refreshKey={listRefresh}
          classNameFilter={classNameFilter}
          title=""
        />
      )}
    </div>
  );
}

function StudentStatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "rose";
}) {
  const toneMap = {
    blue: "from-[#e8f2fa] via-[#d4e8f5] to-[#c5dff0]",
    green: "from-[#e8f4e9] via-[#d4ead6] to-[#c5e3c8]",
    amber: "from-[#faf7f0] via-[#f3ead8] to-[#ead9b8]",
    rose: "from-[#fce8e5] via-[#f7d1cd] to-[#efd5d2]",
  };

  return (
    <div className={`neo-stat flex items-center gap-4 bg-gradient-to-br p-4 sm:p-5 ${toneMap[tone]}`}>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight tracking-tight text-[#2d3436]">
          {value}
        </p>
        <p className="text-sm font-semibold text-[#636e72]">{label}</p>
      </div>
    </div>
  );
}

