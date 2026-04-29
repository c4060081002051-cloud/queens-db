import { useEffect, useMemo, useState } from "react";
import {
  createExamTypeConfig,
  createSubjectConfig,
  deleteExamTypeConfig,
  deleteSubjectConfig,
  fetchExamTypeConfigs,
  fetchPerformanceSummary,
  fetchResultEntryOptions,
  fetchResultEntryStudents,
  fetchSubjectConfigs,
  fetchStudentMarkEntry,
  generateClassMarksheet,
  fetchUpcomingExams,
  fetchExamsPerformanceSummary,
  createExam,
  fetchExams,
  fetchGradingScales,
  saveStudentMarkEntry,
  type ExamTypeConfigRow,
  type PerformanceSummaryRow,
  type ResultEntryOptions,
  type SubjectAssignmentConfigRow,
  type UpcomingExamRow,
  type ExamPerformanceSummaryRow,
  type GeneratedMarksheetPayload,
  type GradingScaleRow,
} from "../../api/academics";
import { useTheme } from "../../theme/ThemeProvider";

export type CurriculumSection =
  | "exams_dashboard"
  | "exam_bot"
  | "exam_mid"
  | "exam_eot"
  | `exam_type:${string}`
  | "assessment_tests"
  | "result_entry"
  | "grading_standards"
  | "report_remarks"
  | "exam_schedule"
  | "promotion_engine"
  | "learns_report"
  | "blank_page";

type ExamType = string;

function titleForSection(section: CurriculumSection): string {
  if (section === "exams_dashboard") return "Exams Dashboard";
  if (section === "exam_bot") return "BOT Exam Performance";
  if (section === "exam_mid") return "MID Exam Performance";
  if (section === "exam_eot") return "EOT Exam Performance";
  if (section.startsWith("exam_type:")) {
    const examKey = section.slice("exam_type:".length).trim();
    return `${examKey || "Custom"} Exam Performance`;
  }
  if (section === "assessment_tests") return "Assessment Tests Entry";
  if (section === "result_entry") return "Result Entry";
  if (section === "grading_standards") return "Grading Standards & Scales";
  if (section === "report_remarks") return "Student Report Remarks";
  if (section === "exam_schedule") return "Academic Exam Scheduling";
  if (section === "promotion_engine") return "Promotion & Graduation Engine";
  return "Subjects & Exam Settings";
}

function ExamsDashboardPage() {
  const [term, setTerm] = useState("Term 1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExamRow[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<ExamPerformanceSummaryRow[]>([]);
  const [examTypes, setExamTypes] = useState<ExamTypeConfigRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    
    Promise.all([
      fetchUpcomingExams(),
      fetchExamsPerformanceSummary(term),
      fetchExamTypeConfigs()
    ]).then(([upcoming, performance, types]) => {
      if (cancelled) return;
      setUpcomingExams(upcoming);
      setPerformanceSummary(performance);
      setExamTypes(types.filter(t => t.isActive));
    }).catch(e => {
      if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [term]);

  const globalAvg = useMemo(() => {
    if (performanceSummary.length === 0) return 0;
    return performanceSummary.reduce((sum, r) => sum + Number(r.avgScore), 0) / performanceSummary.length;
  }, [performanceSummary]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-700">
      <header className="flex flex-col justify-between gap-4 border-b border-[#ebe4d9]/80 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#2d3436]">Academic Command Center</h1>
          <p className="mt-1 text-sm font-semibold text-[#636e72]">Real-time academic performance & institutional oversight.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Term:</span>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="neo-inset-field rounded-full px-5 py-2.5 text-sm font-black text-[#2d3436] outline-none"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          <button className="group flex items-center gap-2 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] px-6 py-3 text-sm font-black text-white shadow-xl transition hover:brightness-110 active:scale-95">
            <span>Print Executive Summary</span>
            <svg className="h-4 w-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
          </button>
        </div>
      </header>

      {error ? (
        <div className="neo-card border-l-4 border-red-500 p-4 text-sm font-bold text-red-700 shadow-md">{error}</div>
      ) : null}

      {/* High Level Stats */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <div className="neo-card-elevated p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Global Average</p>
          <div className="mt-2 flex items-baseline gap-1">
            <p className="text-3xl font-black text-[#2d3436]">{loading ? "—" : globalAvg.toFixed(1)}</p>
            <span className="text-sm font-bold text-[#636e72]">%</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#ebe4d9]/50">
            <div className="h-full bg-[#3498db]" style={{ width: `${globalAvg}%` }}></div>
          </div>
        </div>
        <div className="neo-card-elevated p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Upcoming Exams</p>
          <p className="mt-2 text-3xl font-black text-[#e67e22]">{loading ? "—" : upcomingExams.length}</p>
          <p className="mt-1 text-[10px] font-bold text-[#636e72]">Next 7 Days</p>
        </div>
        <div className="neo-card-elevated p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Active Classes</p>
          <p className="mt-2 text-3xl font-black text-[#2ecc71]">{loading ? "—" : performanceSummary.length}</p>
          <p className="mt-1 text-[10px] font-bold text-[#636e72]">Result Entry Active</p>
        </div>
        <div className="neo-card-elevated p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Term Progress</p>
          <p className="mt-2 text-3xl font-black text-[#9b59b6]">{term === "Term 1" ? "35" : term === "Term 2" ? "65" : "90"}%</p>
          <p className="mt-1 text-[10px] font-bold text-[#636e72]">Academic Calendar</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Upcoming Exams Card */}
        <section className="neo-card-elevated flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#ebe4d9]/60 bg-[#faf7f0]/60 px-6 py-5">
            <h2 className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-[#2d3436]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3498db]/10 text-[#3498db]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </span>
              Exam Schedule
            </h2>
            <button className="text-[10px] font-black uppercase tracking-widest text-[#3498db] hover:underline">View All</button>
          </div>
          <div className="flex-1 p-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-14 w-full animate-pulse rounded-2xl bg-[#ebe4d9]/40"></div>)}
              </div>
            ) : upcomingExams.length > 0 ? (
              <div className="space-y-4">
                {upcomingExams.map(ex => (
                  <div key={ex.id} className="group flex items-center justify-between rounded-2xl border border-[#ebe4d9]/50 bg-white/40 p-4 transition-all hover:translate-x-1 hover:bg-white/80 hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-[#3498db]/10 font-black text-[#3498db]">
                        <span className="text-[10px] leading-none uppercase">{ex.examDate.split('-')[1]}</span>
                        <span className="text-sm leading-none">{ex.examDate.split('-')[2]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#2d3436]">{ex.subject}</p>
                        <p className="text-[10px] font-bold text-[#636e72] uppercase tracking-wide">{ex.className} · {ex.examKey}</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-[#ebe4d9]/40 px-3 py-1 text-[10px] font-black text-[#2d3436]">
                      {ex.examDate}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ebe4d9]/30 text-[#636e72]">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <p className="text-sm font-bold text-[#636e72]">No exams scheduled for the near future.</p>
              </div>
            )}
          </div>
        </section>

        {/* Performance Chart / Summary */}
        <section className="neo-card-elevated flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#ebe4d9]/60 bg-[#faf7f0]/60 px-6 py-5">
            <h2 className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-[#2d3436]">
               <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e67e22]/10 text-[#e67e22]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              </span>
              Class Averages
            </h2>
             <button className="text-[10px] font-black uppercase tracking-widest text-[#e67e22] hover:underline">Analytics</button>
          </div>
          <div className="flex-1 p-6">
            {loading ? (
               <div className="h-full w-full animate-pulse rounded-2xl bg-[#ebe4d9]/40"></div>
            ) : performanceSummary.length > 0 ? (
              <div className="space-y-6">
                {performanceSummary.map(row => (
                  <div key={row.classRoomId} className="group">
                    <div className="mb-2 flex justify-between text-xs font-black text-[#2d3436]">
                      <span className="uppercase tracking-wide">{row.className}</span>
                      <span className="rounded-md bg-[#ebe4d9]/30 px-2 py-0.5">{row.avgScore}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#ebe4d9]/50 shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          Number(row.avgScore) > 75 ? 'bg-gradient-to-r from-[#2ecc71] to-[#27ae60]' :
                          Number(row.avgScore) > 50 ? 'bg-gradient-to-r from-[#3498db] to-[#2980b9]' :
                          'bg-gradient-to-r from-[#e67e22] to-[#d35400]'
                        }`}
                        style={{ width: `${row.avgScore}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ebe4d9]/30 text-[#636e72]">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                </div>
                <p className="text-sm font-bold text-[#636e72]">No result data available for this term.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Exam Types & Configuration Quick Links */}
      <section className="neo-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#2d3436]">Active Assessment Modules</h2>
          <button className="rounded-full bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#2d3436] shadow-sm hover:bg-white transition">Configuration</button>
        </div>
        <div className="flex flex-wrap gap-4">
          {examTypes.map(t => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-[#ebe4d9]/60 bg-white/60 p-3 pr-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9b59b6]/10 text-lg">
                📝
              </div>
              <div>
                <p className="text-xs font-black text-[#2d3436]">{t.displayName}</p>
                <p className="text-[10px] font-bold text-[#636e72] uppercase tracking-tighter">{t.examKey}</p>
              </div>
            </div>
          ))}
          {examTypes.length === 0 && !loading && (
            <div className="w-full py-4 text-center text-xs font-bold text-[#636e72]">No active assessment modules found.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function examTypeForSection(section: CurriculumSection): ExamType {
  if (section === "exam_mid") return "MID";
  if (section === "exam_eot") return "EOT";
  if (section === "assessment_tests") return "ASSESSMENT";
  if (section.startsWith("exam_type:")) {
    return section.slice("exam_type:".length).trim() || "BOT";
  }
  return "BOT";
}

function fmtAvg(v: number | null): string {
  return v == null ? "—" : v.toFixed(1);
}

function fmtPct(v: number | null): string {
  return v == null ? "—" : `${v.toFixed(1)}%`;
}

function PerformanceStatsPage({ section }: { section: CurriculumSection }) {
  const [rows, setRows] = useState<PerformanceSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState("Term 1");
  const examType = examTypeForSection(section);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPerformanceSummary(term, examType)
      .then((items) => {
        if (!cancelled) setRows(items);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load performance summary");
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [examType, term]);

  const classesCount = useMemo(() => new Set(rows.map((x) => x.className)).size, [rows]);
  const totalStudents = useMemo(() => rows.reduce((sum, r) => sum + r.totalStudents, 0), [rows]);
  const resultsEntered = useMemo(
    () => rows.reduce((sum, r) => sum + r.resultsEntered, 0),
    [rows],
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-700">
      <header className="flex flex-col justify-between gap-4 border-b border-[#ebe4d9]/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#2d3436]">{titleForSection(section)}</h1>
          <p className="mt-1 text-sm font-semibold text-[#636e72]">Performance statistics grouped by section and class.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-xs font-black uppercase tracking-widest text-[#636e72]">Active Term:</label>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="neo-inset-field rounded-full px-4 py-2 text-sm font-bold text-[#2d3436] outline-none"
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
      </header>

      {error ? (
        <div className="neo-card border-l-4 border-red-500 p-4 text-sm font-bold text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="neo-card-elevated p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Total Students</p>
          <p className="mt-1 text-2xl font-black text-[#2d3436]">{loading ? "…" : totalStudents}</p>
        </div>
        <div className="neo-card-elevated p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Classes Covered</p>
          <p className="mt-1 text-2xl font-black text-[#3498db]">{loading ? "…" : classesCount}</p>
        </div>
        <div className="neo-card-elevated p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Results Entered</p>
          <p className="mt-1 text-2xl font-black text-[#2ecc71]">{loading ? "…" : resultsEntered}</p>
        </div>
      </div>

      <div className="neo-card-elevated overflow-hidden">
        <div className="border-b border-[#ebe4d9]/80 bg-[#faf7f0]/60 px-6 py-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#2d3436]">Performance Breakdown by Class</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f5f8f5]/50 text-[10px] font-black uppercase tracking-widest text-[#6a9570]">
              <tr>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Section</th>
                <th className="px-6 py-4 text-right">Students</th>
                <th className="px-6 py-4 text-right">Avg Score</th>
                <th className="px-6 py-4 text-right">Pass Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]/40">
              {rows.map((row) => (
                <tr key={`${row.className}-${row.sectionName}`} className="group transition-colors hover:bg-white/40">
                  <td className="px-6 py-4 font-bold text-[#2d3436]">{row.className}</td>
                  <td className="px-6 py-4 text-sm font-medium text-[#636e72]">{row.sectionName}</td>
                  <td className="px-6 py-4 text-right font-bold text-[#2d3436]">{row.totalStudents}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-black text-[#3498db]">{fmtAvg(row.avgScore)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#ebe4d9]/50 hidden sm:block">
                        <div 
                          className="h-full bg-[#2ecc71] transition-all" 
                          style={{ width: `${row.passRate ?? 0}%` }}
                        ></div>
                      </div>
                      <span className="font-black text-[#2ecc71]">{fmtPct(row.passRate)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ebe4d9]/30 text-[#636e72]">
                        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-[#636e72]">No performance data found for this selection.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StudentMarksEntryPage({
  studentId,
  term,
  examType,
  onBack,
  onSaved,
}: {
  studentId: number;
  term: string;
  examType: ExamType;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [entryStudent, setEntryStudent] = useState<{
    studentId: number;
    fullName: string;
    admissionNumber: string;
    className: string;
    subjects: Array<{ subject: string; score: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchStudentMarkEntry({ studentId, term, examType })
      .then((data) => {
        if (cancelled) return;
        setEntryStudent({
          studentId: data.studentId,
          fullName: data.fullName,
          admissionNumber: data.admissionNumber,
          className: data.className,
          subjects: data.subjects.map((s) => ({
            subject: s.subject,
            score: s.score == null ? "" : String(s.score),
          })),
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to open marks entry");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, term, examType]);

  function updateSubjectMark(subject: string, score: string) {
    setEntryStudent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        subjects: prev.subjects.map((row) => (row.subject === subject ? { ...row, score } : row)),
      };
    });
  }

  async function onSaveStudentMarks() {
    if (!entryStudent) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const marks = entryStudent.subjects
        .map((row) => ({
          subject: row.subject,
          score: Number(row.score),
        }))
        .filter((x) => Number.isFinite(x.score) && x.score >= 0 && x.score <= 100);
      
      if (marks.length === 0 && entryStudent.subjects.length > 0) {
        setError("Enter at least one valid mark between 0 and 100 before saving.");
        setSaving(false);
        return;
      }
      
      const saved = await saveStudentMarkEntry({
        studentId: entryStudent.studentId,
        term,
        examType,
        marks,
      });
      if (saved.saved > 0) {
        setSuccess(`Saved ${saved.saved} subject mark entries.`);
        setTimeout(() => {
          onSaved();
        }, 1000);
      } else {
        setError("No marks were saved. Confirm subject values and try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save result entries");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <header className="flex flex-col justify-between gap-4 border-b border-[#ebe4d9]/80 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="neo-icon-btn flex h-10 w-10 items-center justify-center bg-white/60 text-[#2d3436] transition-transform active:scale-90"
            title="Go back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#2d3436]">Marks Entry</h1>
            <p className="mt-0.5 text-sm font-medium text-[#636e72]">
              Academic Year 2026 · {term} · {examType}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void onSaveStudentMarks()}
            disabled={saving || loading || !entryStudent}
            className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#2ecc71] to-[#27ae60] px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span>{saving ? "Saving..." : "Save Marks"}</span>
          </button>
        </div>
      </header>

      {error ? (
        <div className="neo-card border-l-4 border-red-500 bg-red-50/30 p-4 text-sm font-bold text-red-700 animate-in shake duration-500">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      ) : null}

      {success ? (
        <div className="neo-card border-l-4 border-green-500 bg-green-50/30 p-4 text-sm font-bold text-green-700 animate-in zoom-in duration-300">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#3498db] border-t-transparent"></div>
          <p className="mt-4 font-bold text-[#636e72]">Loading student records...</p>
        </div>
      ) : entryStudent ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <aside className="space-y-6">
            <div className="neo-card-elevated p-6 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#3498db]/20 to-[#2980b9]/20 text-[#3498db]">
                <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-[#2d3436]">{entryStudent.fullName}</h2>
              <p className="mt-1 text-sm font-bold text-[#3498db]">{entryStudent.admissionNumber}</p>
              
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="neo-inset p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Class</p>
                  <p className="mt-1 text-sm font-bold text-[#2d3436]">{entryStudent.className}</p>
                </div>
                <div className="neo-inset p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Status</p>
                  <p className="mt-1 text-sm font-bold text-green-600">Missing Marks</p>
                </div>
              </div>
            </div>

            <div className="neo-card p-5">
              <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-[#636e72]">Instructions</h3>
              <ul className="space-y-2 text-sm text-[#2d3436]">
                <li className="flex gap-2">
                  <span className="text-[#3498db] font-bold">•</span>
                  Enter marks out of 100 for each subject.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#3498db] font-bold">•</span>
                  Leave empty if the student missed the exam.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#3498db] font-bold">•</span>
                  Use decimals (e.g. 85.5) if required.
                </li>
              </ul>
            </div>
          </aside>

          <main className="neo-card overflow-hidden">
            <div className="border-b border-[#ebe4d9]/80 bg-[#faf7f0]/60 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#2d3436]">Subject Marks List</h3>
            </div>
            <div className="divide-y divide-[#ebe4d9]/60 p-6">
              {entryStudent.subjects.map((row) => {
                const scoreNum = parseFloat(row.score);
                const isValid = row.score === "" || (scoreNum >= 0 && scoreNum <= 100);
                
                return (
                  <div
                    key={row.subject}
                    className="group flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 group-hover:scale-110 transition-transform">
                        <span className="text-xs font-black text-[#3498db]">{row.subject.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="font-bold text-[#2d3436]">{row.subject}</span>
                    </div>
                    
                    <div className="relative w-full sm:w-48">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={row.score}
                        onChange={(e) => updateSubjectMark(row.subject, e.target.value)}
                        className={`neo-inset-field w-full rounded-xl px-4 py-3 text-right text-sm font-black transition-all outline-none focus:ring-2 ${
                          !isValid 
                            ? "text-red-600 ring-red-400 ring-2" 
                            : row.score !== "" 
                              ? "text-[#2d3436] ring-[#2ecc71]/30 ring-2" 
                              : "text-[#636e72]"
                        }`}
                        placeholder="0.00"
                      />
                      {!isValid && (
                        <span className="absolute -bottom-5 right-0 text-[10px] font-bold text-red-500">Must be 0-100</span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {entryStudent.subjects.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-[#636e72]">No subjects assigned to this student's class.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      ) : (
        <div className="neo-card p-20 text-center">
          <p className="text-lg font-bold text-[#636e72]">Student records could not be found.</p>
          <button onClick={onBack} className="mt-4 text-[#3498db] font-bold hover:underline">Return to list</button>
        </div>
      )}
    </div>
  );
}

function ResultEntryPage({ mode }: { mode: "exams" | "assessments" }) {
  const [options, setOptions] = useState<ResultEntryOptions | null>(null);
  const [term, setTerm] = useState("Term 1");
  const [examType, setExamType] = useState<ExamType>("");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [rows, setRows] = useState<
    Array<{
      studentId: number;
      admissionNumber: string;
      fullName: string;
      className: string;
      sectionName: string;
      hasResults: boolean;
    }>
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchResultEntryOptions()
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        setTerm(data.terms[0] ?? "Term 1");
        setSelectedClassId(data.classes[0]?.id ?? null);
        if (mode === "assessments") {
          const hasAssessment = data.examTypes.includes("ASSESSMENT");
          setExamType(hasAssessment ? "ASSESSMENT" : "");
        } else {
          const examChoices = data.examTypes.filter((x) => x !== "ASSESSMENT");
          setExamType((examChoices[0] as ExamType | undefined) ?? "");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load entry options");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (!selectedClassId || !examType) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedStudentId(null);
    void fetchResultEntryStudents({
      term,
      examType,
      classRoomId: selectedClassId,
    })
      .then((items) => {
        if (cancelled) return;
        setRows(
          items.map((x) => ({
            studentId: x.studentId,
            admissionNumber: x.admissionNumber,
            fullName: x.fullName,
            className:
              options?.classes.find((cls) => cls.id === x.classRoomId)?.name ?? "Unknown class",
            sectionName: x.sectionName ?? "General",
            hasResults: x.hasResults,
          })),
        );
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load students");
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, term, examType, options?.classes]);

  const filteredRows = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(s) ||
        r.admissionNumber.toLowerCase().includes(s) ||
        r.className.toLowerCase().includes(s) ||
        r.sectionName.toLowerCase().includes(s)
    );
  }, [rows, searchTerm]);

  const authorityText =
    options?.authority === "full"
      ? "Full Administrative Authority"
      : "Restricted Access (Assigned Classes Only)";
  const examChoices = (options?.examTypes ?? []).filter((t) => t !== "ASSESSMENT");

  if (selectedStudentId != null) {
    return (
      <StudentMarksEntryPage
        studentId={selectedStudentId}
        term={term}
        examType={examType}
        onBack={() => setSelectedStudentId(null)}
        onSaved={() => {
          setSelectedStudentId(null);
          setRows((prev) =>
            prev.map((x) => (x.studentId === selectedStudentId ? { ...x, hasResults: true } : x)),
          );
        }}
      />
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-700">
      <header className="flex flex-col justify-between gap-4 border-b border-[#ebe4d9]/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#2d3436]">
            {mode === "assessments" ? "Assessment Entry" : "Result Entry"}
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#636e72] flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${options?.authority === 'full' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
            {authorityText}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-black uppercase tracking-widest text-[#636e72]">Term:</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="neo-inset-field rounded-full px-4 py-2 text-sm font-bold text-[#2d3436] outline-none"
            >
              {(options?.terms ?? ["Term 1", "Term 2", "Term 3"]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-black uppercase tracking-widest text-[#636e72]">Class:</label>
            <select
              value={selectedClassId ?? ""}
              onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
              className="neo-inset-field rounded-full px-4 py-2 text-sm font-bold text-[#2d3436] outline-none"
            >
              {(options?.classes ?? []).map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-black uppercase tracking-widest text-[#636e72]">Type:</label>
            {mode === "assessments" ? (
              <div className="neo-inset px-4 py-2 text-sm font-bold text-[#3498db]">
                ASSESSMENT
              </div>
            ) : (
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                disabled={examChoices.length === 0}
                className="neo-inset-field rounded-full px-4 py-2 text-sm font-bold text-[#2d3436] outline-none disabled:opacity-50"
              >
                {examChoices.length === 0 ? (
                  <option value="">None Configured</option>
                ) : null}
                {examChoices.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      {error ? (
        <div className="neo-card border-l-4 border-red-500 p-4 text-sm font-bold text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="neo-card-elevated p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Total Students</p>
            <p className="mt-1 text-2xl font-black text-[#2d3436]">{loading ? "..." : rows.length}</p>
          </div>
          <div className="neo-card-elevated p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Filtered</p>
            <p className="mt-1 text-2xl font-black text-[#3498db]">{loading ? "..." : filteredRows.length}</p>
          </div>
          <div className="neo-card-elevated p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Saved</p>
            <p className="mt-1 text-2xl font-black text-[#2ecc71]">
              {loading ? "..." : rows.filter((row) => row.hasResults).length}
            </p>
          </div>
          <div className="neo-card-elevated p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Missing Marks</p>
            <p className="mt-1 text-2xl font-black text-[#e74c3c]">
              {loading ? "..." : rows.filter((row) => !row.hasResults).length}
            </p>
          </div>
        </div>

        {/* List Section */}
        <section className="neo-card-elevated flex flex-col overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#ebe4d9]/60 bg-[#faf7f0]/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#2d3436]">Students In Selected Class</h2>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="neo-inset-field w-full rounded-full py-2 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#3498db]/30"
              />
              <svg className="absolute left-3.5 top-2.5 h-4 w-4 text-[#636e72]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f5f8f5]/50 text-[10px] font-black uppercase tracking-widest text-[#6a9570]">
                <tr>
                  <th className="px-6 py-4">Student Info</th>
                  <th className="px-6 py-4">Class & Section</th>
                  <th className="px-6 py-4">Admission No</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe4d9]/40">
                {filteredRows.map((row) => (
                  <tr key={row.studentId} className="group transition-colors hover:bg-white/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3498db]/10 to-[#2980b9]/10 font-black text-[#3498db]">
                          {row.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-[#2d3436]">{row.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#2d3436]">{row.className}</span>
                        <span className="text-xs font-medium text-[#636e72]">{row.sectionName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="neo-inset px-3 py-1 text-xs font-black text-[#636e72]">
                        {row.admissionNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          row.hasResults ? "bg-[#cde8cf] text-[#2d3436]" : "bg-[#f7d1cd] text-[#8a2f2f]"
                        }`}
                      >
                        {row.hasResults ? "Saved" : "Missing Marks"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(row.studentId)}
                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] px-4 py-2 text-xs font-black text-white shadow-md transition hover:brightness-110 active:scale-95"
                      >
                        <span>{row.hasResults ? "Edit Marks" : "Enter Marks"}</span>
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ebe4d9]/30 text-[#636e72]">
                          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg font-black text-[#2d3436]">
                            {loading ? "Syncing data..." : rows.length === 0 ? "All caught up!" : "No matches found"}
                          </p>
                          <p className="text-sm font-medium text-[#636e72]">
                            {loading ? "Fetching latest records from server" : rows.length === 0 ? "No students found for this class and selection." : `Try searching for something else.`}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function SubjectsConfigPage() {
  const { resolvedTheme } = useTheme();
  const isDarkUi = resolvedTheme === "dark" || resolvedTheme === "tinted-dark";
  
  const [activeTab, setActiveTab] = useState<"subjects" | "exams" | "schedule">("subjects");
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [subjectItems, setSubjectItems] = useState<SubjectAssignmentConfigRow[]>([]);
  const [examTypes, setExamTypes] = useState<ExamTypeConfigRow[]>([]);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New scheduler state
  const [schedClassId, setSchedClassId] = useState("");
  const [schedExamType, setSchedExamType] = useState("");
  const [schedSubject, setSchedSubject] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedBusy, setSchedBusy] = useState(false);

  // Existing assignment state
  const [subjectCategoryId, setSubjectCategoryId] = useState<number | null>(null);
  const [subjectSectionName, setSubjectSectionName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [newExamKey, setNewExamKey] = useState("");
  const [newExamLabel, setNewExamLabel] = useState("");

  const createdExamTypes = useMemo(
    () => examTypes.filter((row) => !row.isSystem && row.isActive),
    [examTypes],
  );

  const schedClassOptions = useMemo(() => {
    const assignedCategoryIds = new Set(subjectItems.map((row) => row.classCategoryId));
    const assignedCategoryNames = new Set(
      categories.filter((c) => assignedCategoryIds.has(c.id)).map((c) => c.name.trim()),
    );
    if (assignedCategoryNames.size === 0) return [];
    return classes.filter((cls) => assignedCategoryNames.has(cls.name.trim()));
  }, [subjectItems, categories, classes]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [subjectPayload, examRows, entryOptions] = await Promise.all([
        fetchSubjectConfigs(),
        fetchExamTypeConfigs(),
        fetchResultEntryOptions()
      ]);
      setCategories(subjectPayload.categories);
      setSubjectItems(subjectPayload.items);
      setExamTypes(examRows);
      setClasses(entryOptions.classes);
      if (subjectPayload.categories.length > 0 && subjectCategoryId == null) {
        setSubjectCategoryId(subjectPayload.categories[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onScheduleExam() {
    if (!schedClassId || !schedExamType || !schedSubject || !schedDate) {
      setError("Please fill all scheduling fields.");
      return;
    }
    setSchedBusy(true);
    setError(null);
    try {
      await createExam({
        examKey: schedExamType,
        classRoomId: Number(schedClassId),
        subject: schedSubject,
        examDate: schedDate
      });
      setSchedSubject("");
      setSchedDate("");
      alert("Exam/Assessment scheduled successfully!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to schedule exam");
    } finally {
      setSchedBusy(false);
    }
  }

  async function onAddExamType() {
    const examKey = newExamKey.trim();
    const displayName = newExamLabel.trim();
    if (!examKey || !displayName) return;
    try {
      await createExamTypeConfig({ examKey, displayName });
      setNewExamKey("");
      setNewExamLabel("");
      await refresh();
      window.dispatchEvent(new Event("academics:exam-types-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add exam type");
    }
  }

  async function onDeleteExamType(row: ExamTypeConfigRow) {
    try {
      await deleteExamTypeConfig(row.id);
      await refresh();
      window.dispatchEvent(new Event("academics:exam-types-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete exam type");
    }
  }

  async function onAddSubject() {
    if (!subjectCategoryId) return;
    const cleanSubject = subjectName.trim();
    if (!cleanSubject) return;
    try {
      await createSubjectConfig({
        classCategoryId: subjectCategoryId,
        sectionName: subjectSectionName.trim() || undefined,
        subjectName: cleanSubject,
      });
      setSubjectName("");
      setSubjectSectionName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add subject assignment");
    }
  }

  async function onDeleteSubject(id: number) {
    try {
      await deleteSubjectConfig(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete subject assignment");
    }
  }

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const inputClass = `w-full rounded-xl border px-4 py-2.5 text-xs transition-all focus:ring-4 outline-none ${
    isDarkUi 
      ? "bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:ring-teal-500/10" 
      : "bg-slate-50 border-slate-100 text-[#2d3436] placeholder-slate-400 focus:border-teal-600 focus:ring-teal-600/5"
  }`;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Premium Header */}
      <div className={`neo-card overflow-hidden rounded-3xl border shadow-sm transition-all duration-500 ${
        isDarkUi ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"
      }`}>
        <div className={`border-b px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${isDarkUi ? "border-slate-800" : "border-slate-50"}`}>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${isDarkUi ? "text-white" : "text-[#0c2340]"}`}>Curriculum Configuration</h1>
            <p className="mt-1 text-sm font-medium text-slate-500 uppercase tracking-widest">Subjects & Exam Engine</p>
          </div>
          <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
             <TabBtn active={activeTab === "subjects"} onClick={() => setActiveTab("subjects")} label="Subject Assignment" icon="📚" isDarkUi={isDarkUi} />
             <TabBtn active={activeTab === "exams"} onClick={() => setActiveTab("exams")} label="Exam Types" icon="📝" isDarkUi={isDarkUi} />
             <TabBtn active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")} label="Scheduling" icon="📅" isDarkUi={isDarkUi} />
          </div>
        </div>

        {error && (
          <div className="mx-8 mt-6 flex items-center gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-500">
            <span className="text-xl">⚠️</span>
            <p className="text-xs font-black uppercase tracking-tight">{error}</p>
          </div>
        )}

        <div className="p-8">
          {activeTab === "subjects" && (
            <div className="grid lg:grid-cols-[1fr_1.5fr] gap-10">
               <div className="space-y-6">
                  <div>
                    <h3 className={`text-lg font-black ${isDarkUi ? "text-white" : "text-[#0c2340]"}`}>New Subject Assignment</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Define subjects for specific class categories.</p>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Category</label>
                        <select
                          value={subjectCategoryId ?? ""}
                          onChange={(e) => setSubjectCategoryId(Number(e.target.value))}
                          className={inputClass}
                        >
                          <option value="" disabled>Select Category...</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Section (Optional)</label>
                        <input
                          value={subjectSectionName}
                          onChange={(e) => setSubjectSectionName(e.target.value)}
                          placeholder="e.g. Upper Primary"
                          className={inputClass}
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Subject Name</label>
                        <input
                          value={subjectName}
                          onChange={(e) => setSubjectName(e.target.value)}
                          placeholder="e.g. Mathematics"
                          className={inputClass}
                        />
                     </div>
                     <button
                        onClick={() => void onAddSubject()}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-teal-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                     >
                        Assign Subject
                     </button>
                  </div>
               </div>

               <div className={`rounded-3xl border p-6 ${isDarkUi ? "bg-slate-800/20 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                  <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkUi ? "text-slate-400" : "text-slate-500"}`}>Current Subject Ledger</h3>
                  <div className="grid gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {subjectItems.map((row) => (
                      <div
                        key={row.id}
                        className={`group flex items-center justify-between rounded-2xl border p-4 transition-all hover:scale-[1.02] ${
                          isDarkUi ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-black ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>{row.subjectName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {categoryNameById.get(row.classCategoryId)} · {row.sectionName || "General Curriculum"}
                          </p>
                        </div>
                        <button
                          onClick={() => void onDeleteSubject(row.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === "exams" && (
            <div className="grid lg:grid-cols-[1fr_1.5fr] gap-10">
               <div className="space-y-6">
                  <div>
                    <h3 className={`text-lg font-black ${isDarkUi ? "text-white" : "text-[#0c2340]"}`}>Custom Exam Types</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Add non-standard assessment cycles.</p>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Reference Key</label>
                        <input
                          value={newExamKey}
                          onChange={(e) => setNewExamKey(e.target.value.toUpperCase())}
                          placeholder="e.g. MOCK"
                          className={inputClass}
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Display Label</label>
                        <input
                          value={newExamLabel}
                          onChange={(e) => setNewExamLabel(e.target.value)}
                          placeholder="e.g. Mock Examination"
                          className={inputClass}
                        />
                     </div>
                     <button
                        onClick={() => void onAddExamType()}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                     >
                        Register Exam Type
                     </button>
                  </div>
               </div>

               <div className={`rounded-3xl border p-6 ${isDarkUi ? "bg-slate-800/20 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                  <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkUi ? "text-slate-400" : "text-slate-500"}`}>Exam Registry</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {examTypes.map((row) => (
                      <div
                        key={row.id}
                        className={`group relative overflow-hidden rounded-2xl border p-5 transition-all hover:scale-[1.02] ${
                          isDarkUi ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                           <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl ${
                             row.isSystem ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600"
                           }`}>
                              {row.isSystem ? "⚙️" : "📝"}
                           </div>
                           <div>
                              <p className={`text-sm font-black ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>{row.displayName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{row.examKey}</p>
                           </div>
                        </div>
                        {row.isSystem && (
                          <span className="absolute top-0 right-0 bg-slate-100 px-3 py-1 text-[8px] font-black uppercase text-slate-400 rounded-bl-xl">System</span>
                        )}
                        {!row.isSystem && (
                          <button
                            onClick={() => void onDeleteExamType(row)}
                            className="absolute top-4 right-4 h-7 w-7 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="max-w-2xl mx-auto space-y-10">
               <div className="text-center">
                  <h3 className={`text-2xl font-black tracking-tight ${isDarkUi ? "text-white" : "text-[#0c2340]"}`}>Schedule New Assessment</h3>
                  <p className="text-sm font-medium text-slate-500 mt-2">Publish an exam or test to the academic calendar.</p>
               </div>
               
               <div className={`grid gap-8 p-10 rounded-[2.5rem] border ${
                 isDarkUi ? "bg-slate-800/20 border-slate-700" : "bg-slate-50 border-slate-100"
               }`}>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Target Class</label>
                       <select
                          value={schedClassId}
                          onChange={(e) => setSchedClassId(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select class...</option>
                          {schedClassOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {schedClassOptions.length === 0 && (
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">No subject assignments found.</p>
                        )}
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Assessment Cycle</label>
                       <select
                          value={schedExamType}
                          onChange={(e) => setSchedExamType(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select type...</option>
                          {createdExamTypes.map((t) => <option key={t.examKey} value={t.examKey}>{t.displayName}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Subject Domain</label>
                       <input
                          value={schedSubject}
                          onChange={(e) => setSchedSubject(e.target.value)}
                          placeholder="e.g. Mathematics"
                          className={inputClass}
                        />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Scheduled Date</label>
                       <input
                          type="date"
                          value={schedDate}
                          onChange={(e) => setSchedDate(e.target.value)}
                          className={inputClass}
                        />
                    </div>
                  </div>

                  <button
                    disabled={schedBusy}
                    onClick={() => void onScheduleExam()}
                    className="h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-600/30 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                  >
                    {schedBusy ? "Processing..." : "Publish Assessment Schedule"}
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, label, icon, isDarkUi }: { 
  active: boolean; 
  onClick: () => void; 
  label: string; 
  icon: string;
  isDarkUi: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-5 py-2.5 text-xs font-black transition-all ${
        active 
          ? isDarkUi ? "bg-slate-700 text-white shadow-lg shadow-slate-950/20" : "bg-white text-[#0c2340] shadow-sm"
          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}

function GradingStandardsPage() {
  const [scales, setScales] = useState<GradingScaleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchGradingScales()
      .then(setScales)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-700">
      <header className="flex flex-col justify-between gap-4 border-b border-[#ebe4d9]/80 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#2d3436]">Grading Standards & Scales</h1>
          <p className="mt-1 text-sm font-semibold text-[#636e72]">Configure academic grading thresholds and division logic.</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="neo-card-elevated flex flex-col overflow-hidden">
          <div className="border-b border-[#ebe4d9]/60 bg-[#faf7f0]/60 px-6 py-5">
             <h2 className="text-xs font-black uppercase tracking-widest text-[#2d3436]">Active Grading Policies</h2>
          </div>
          <div className="flex-1 p-6">
            {error ? <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600">{error}</div> : null}
            <div className="space-y-4">
              {scales.map(s => (
                <div key={s.id} className="group rounded-2xl border border-[#ebe4d9]/60 bg-white/40 p-5 transition-all hover:bg-white/80">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-black text-[#2d3436]">{s.name}</h3>
                    <button className="text-[10px] font-black uppercase tracking-widest text-[#3498db]">Edit Policy</button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    {Object.entries(s.thresholds).slice(0, 4).map(([grade, score]) => (
                      <div key={grade} className="rounded-xl bg-[#ebe4d9]/30 p-2">
                        <p className="text-[10px] font-black uppercase text-[#636e72]">{grade}</p>
                        <p className="text-sm font-black text-[#2d3436]">{score as number}+</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-[#636e72]">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>Used across {s.name.includes('Primary') ? '7' : '6'} class sections</span>
                  </div>
                </div>
              ))}
              {scales.length === 0 && !loading && (
                <div className="py-12 text-center text-sm font-bold text-[#636e72]">No grading scales found.</div>
              )}
              {loading && <div className="h-32 w-full animate-pulse rounded-2xl bg-[#ebe4d9]/40"></div>}
            </div>
          </div>
        </section>

        <section className="neo-card-elevated p-8">
           <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#3498db]/10 to-[#2980b9]/10 text-3xl">
              📐
            </div>
            <h2 className="text-xl font-black text-[#2d3436]">Global Academic Policy</h2>
            <p className="mt-3 max-w-sm text-sm font-medium text-[#636e72]">
              Define custom grading logic for Primary or Secondary sections. Changes here will instantly update performance reports across the entire school.
            </p>
            <button className="mt-10 w-full rounded-2xl bg-gradient-to-br from-[#3498db] to-[#2980b9] py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl transition hover:brightness-110 active:scale-95">
              Initialize New Template
            </button>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#636e72]">Last updated 2 days ago</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ReportRemarksPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-700">
      <header className="flex flex-col justify-between gap-4 border-b border-[#ebe4d9]/80 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#2d3436]">Student Report Remarks</h1>
          <p className="mt-1 text-sm font-semibold text-[#636e72]">Manage teacher comments and conduct reports for student cards.</p>
        </div>
      </header>

      <div className="neo-card-elevated p-16 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#3498db]/10 to-[#2980b9]/10 text-4xl mb-8">
          💬
        </div>
        <h2 className="text-2xl font-black text-[#2d3436]">No Student Selected</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm font-medium text-[#636e72]">
          Remarks are managed during the result entry process. To add comments, please select a student from the Results Entry page and click on the "Add Remarks" option in their mark entry form.
        </p>
        
        <div className="mt-12 inline-flex items-center gap-3 rounded-2xl bg-[#3498db]/10 px-8 py-4 text-sm font-black text-[#3498db]">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#3498db]"></span>
          Select a student from Results Entry to begin
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="p-4 rounded-2xl bg-[#ebe4d9]/30 border border-white/50">
            <p className="text-xs font-black uppercase text-[#636e72] mb-1">Conduct Reports</p>
            <p className="text-[10px] font-bold text-[#2d3436]">Behavioral assessment logs</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#ebe4d9]/30 border border-white/50">
            <p className="text-xs font-black uppercase text-[#636e72] mb-1">Termly Comments</p>
            <p className="text-[10px] font-bold text-[#2d3436]">Custom teacher feedback</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#ebe4d9]/30 border border-white/50">
            <p className="text-xs font-black uppercase text-[#636e72] mb-1">HM Signature</p>
            <p className="text-[10px] font-bold text-[#2d3436]">Official report validation</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamSchedulePage() {
  const [exams, setExams] = useState<UpcomingExamRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    void fetchExams()
      .then(setExams)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-700">
      <header className="flex flex-col justify-between gap-4 border-b border-[#ebe4d9]/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#2d3436]">Exam Scheduling</h1>
          <p className="mt-1 text-sm font-semibold text-[#636e72]">Set and manage dates for BOT, MID, and EOT exams.</p>
        </div>
      </header>

      <div className="neo-card-elevated overflow-hidden">
        <div className="border-b border-[#ebe4d9]/60 bg-[#faf7f0]/40 px-6 py-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#2d3436]">Scheduled Academic Exams</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f5f8f5]/50 text-[10px] font-black uppercase tracking-widest text-[#6a9570]">
              <tr>
                <th className="px-6 py-4">Exam Date</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]/40">
              {exams.map(ex => (
                <tr key={ex.id} className="group transition-colors hover:bg-white/40">
                  <td className="px-6 py-4">
                    <span className="font-black text-[#3498db]">{ex.examDate}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-[#2d3436]">{ex.subject}</td>
                  <td className="px-6 py-4 font-medium text-[#636e72]">{ex.className}</td>
                  <td className="px-6 py-4">
                    <span className="neo-inset px-3 py-1 text-[10px] font-black uppercase text-[#2d3436]">
                      {ex.examKey}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="rounded-full bg-white/80 px-4 py-1.5 text-xs font-black text-[#3498db] shadow-sm hover:bg-white transition active:scale-95">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {exams.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ebe4d9]/30 text-[#636e72]">
                        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-[#636e72]">No exams scheduled yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PromotionPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-700">
      <header className="flex flex-col justify-between gap-4 border-b border-[#ebe4d9]/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#2d3436]">Promotion Engine</h1>
          <p className="mt-1 text-sm font-semibold text-[#636e72]">Manage bulk student promotions and graduation.</p>
        </div>
      </header>

      <div className="neo-card-elevated p-12 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#f1c40f]/10 text-[#f1c40f] ring-8 ring-[#f1c40f]/5">
          <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h2 className="mt-8 text-2xl font-black text-[#2d3436]">Promotion Engine Locked</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm font-medium text-[#636e72]">
          Promotion is typically available at the end of Term 3. Configure grading scales first to enable automatic promotion eligibility checks.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <button className="rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] px-8 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 active:scale-95">
            Check Eligibility (Simulate)
          </button>
          <button className="rounded-full bg-white px-8 py-3 text-sm font-black text-[#2d3436] shadow-md transition hover:bg-[#faf7f0] active:scale-95">
            View Requirements
          </button>
        </div>
      </div>
    </div>
  );
}

function LearnsReportPage() {
  const [classes, setClasses] = useState<
    Array<{ id: number; name: string; categoryId: number | null; categoryName: string | null }>
  >([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [term, setTerm] = useState("Term 1");
  const [examType, setExamType] = useState<ExamType>("");
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [marksheet, setMarksheet] = useState<GeneratedMarksheetPayload | null>(null);
  const [, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchResultEntryOptions()
      .then((data) => {
        if (cancelled) return;
        setClasses(data.classes);
        const categoryIds = Array.from(new Set(data.classes.map((x) => x.categoryId).filter((x): x is number => x != null)));
        setSelectedCategoryId(categoryIds[0] ?? null);
        setTerm(data.terms[0] ?? "Term 1");
        const nonAssessmentTypes = data.examTypes.filter((x) => x !== "ASSESSMENT");
        setExamTypes(nonAssessmentTypes);
        setExamType(nonAssessmentTypes[0] ?? data.examTypes[0] ?? "");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load class list");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Map(
          classes
            .filter((x) => x.categoryId != null)
            .map((x) => [x.categoryId as number, x.categoryName ?? "Uncategorized"]),
        ).entries(),
      ).map(([id, name]) => ({ id, name })),
    [classes],
  );

  const classOptions = useMemo(
    () => classes.filter((x) => x.categoryId === selectedCategoryId),
    [classes, selectedCategoryId],
  );

  useEffect(() => {
    if (selectedCategoryId == null) {
      setSelectedClassId(null);
      return;
    }
    const stillValid = classOptions.some((x) => x.id === selectedClassId);
    if (!stillValid) setSelectedClassId(classOptions[0]?.id ?? null);
  }, [selectedCategoryId, classOptions, selectedClassId]);

  async function onGenerateMarksheet() {
    if (!selectedClassId || !examType) return;
    setGenerating(true);
    setError(null);
    try {
      const item = await generateClassMarksheet({
        term,
        examType,
        classRoomId: selectedClassId,
      });
      setMarksheet(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate marksheet");
      setMarksheet(null);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-700">
      <header className="flex flex-col justify-between gap-4 border-b border-[#ebe4d9]/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#2d3436]">Learner Result Reports</h1>
          <p className="mt-1 text-sm font-semibold text-[#636e72]">Generate and view comprehensive class marksheets.</p>
        </div>
      </header>

      <div className="neo-card p-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Section</label>
            <select
              value={selectedCategoryId ?? ""}
              onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="neo-inset-field w-full rounded-xl px-4 py-3 text-sm font-bold text-[#2d3436] outline-none"
            >
              {categoryOptions.length === 0 ? <option value="">No categories</option> : null}
              {categoryOptions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Class</label>
            <select
              value={selectedClassId ?? ""}
              onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
              className="neo-inset-field w-full rounded-xl px-4 py-3 text-sm font-bold text-[#2d3436] outline-none"
            >
              {classOptions.length === 0 ? <option value="">No classes</option> : null}
              {classOptions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#636e72]">Term & Type</label>
            <div className="flex gap-2">
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="neo-inset-field flex-1 rounded-xl px-3 py-3 text-sm font-bold text-[#2d3436] outline-none"
              >
                {["Term 1", "Term 2", "Term 3"].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className="neo-inset-field flex-1 rounded-xl px-3 py-3 text-sm font-bold text-[#2d3436] outline-none"
              >
                {examTypes.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void onGenerateMarksheet()}
              disabled={generating || !selectedClassId || !examType}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#3498db] to-[#2980b9] px-6 py-3.5 text-sm font-black text-white shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {generating ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span>{generating ? "Generating..." : "Generate Marksheet"}</span>
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="neo-card border-l-4 border-red-500 p-4 text-sm font-bold text-red-700">{error}</div>
      ) : null}

      {marksheet ? (
        <div className="neo-card-elevated overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#ebe4d9]/80 bg-[#faf7f0]/60 px-6 py-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[#2d3436]">
                {marksheet.className} · {marksheet.term} · {marksheet.examType}
              </h2>
              <p className="mt-0.5 text-xs font-bold text-[#3498db]">{marksheet.rows.length} Learners Ranked</p>
            </div>
            <button className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-black text-[#2d3436] shadow-sm hover:bg-white transition">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f5f8f5]/50 text-[10px] font-black uppercase tracking-widest text-[#6a9570]">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Learner</th>
                  {marksheet.subjects.map((subject) => (
                    <th key={subject} className="px-6 py-4 text-right">
                      {subject}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe4d9]/40">
                {marksheet.rows.map((row) => (
                  <tr key={row.studentId} className="group transition-colors hover:bg-white/40">
                    <td className="px-6 py-4">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full font-black text-xs ${
                        row.position === 1 ? 'bg-yellow-100 text-yellow-700' : 
                        row.position === 2 ? 'bg-slate-100 text-slate-600' : 
                        row.position === 3 ? 'bg-orange-100 text-orange-700' : 
                        'text-[#636e72]'
                      }`}>
                        {row.position}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#2d3436]">{row.fullName}</td>
                    {marksheet.subjects.map((subject) => (
                      <td key={`${row.studentId}-${subject}`} className="px-6 py-4 text-right font-black text-[#2d3436]">
                        {row.marksBySubject[subject] ?? "-"}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <span className="rounded-lg bg-[#3498db]/10 px-3 py-1.5 font-black text-[#3498db]">
                        {row.totalMarks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="neo-card border-dashed border-2 border-[#ebe4d9] p-20 text-center">
           <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ebe4d9]/30 text-[#636e72] mb-4">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="font-black text-[#2d3436]">Ready to Generate</p>
          <p className="text-sm font-medium text-[#636e72] mt-1">Select a class and exam type above to view the performance marksheet.</p>
        </div>
      )}
    </div>
  );
}

export function CurriculumSectionPage({ section }: { section: CurriculumSection }) {
  if (section === "exams_dashboard") return <ExamsDashboardPage />;
  if (section === "result_entry") return <ResultEntryPage mode="exams" />;
  if (section === "assessment_tests") return <ResultEntryPage mode="assessments" />;
  if (section === "grading_standards") return <GradingStandardsPage />;
  if (section === "report_remarks") return <ReportRemarksPage />;
  if (section === "exam_schedule") return <ExamSchedulePage />;
  if (section === "promotion_engine") return <PromotionPage />;
  if (section === "learns_report") return <LearnsReportPage />;
  if (section === "blank_page") return <SubjectsConfigPage />;
  return <PerformanceStatsPage section={section} />;
}
