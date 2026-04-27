import { useEffect, useMemo, useState } from "react";
import {
  createExamTypeConfig,
  createSubjectConfig,
  deleteExamTypeConfig,
  deleteSubjectConfig,
  fetchExamTypeConfigs,
  fetchPendingResultEntryStudents,
  fetchPerformanceSummary,
  fetchResultEntryOptions,
  fetchResultEntryStudents,
  fetchSubjectConfigs,
  fetchStudentMarkEntry,
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-700">
      <header className="flex flex-col justify-between gap-4 border-b border-[#ebe4d9]/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#2d3436]">Exams Dashboard</h1>
          <p className="mt-1 text-sm text-[#636e72]">Real-time academic performance & scheduling overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="neo-inset-field rounded-full px-4 py-2 text-sm font-semibold text-[#2d3436] outline-none"
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
          <button className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:brightness-110 active:scale-95">
            <span>Print Reports</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          </button>
        </div>
      </header>

      {error ? (
        <div className="neo-card border-l-4 border-red-500 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Exams Card */}
        <section className="neo-card-elevated flex flex-col overflow-hidden">
          <div className="bg-[#faf7f0]/60 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#2d3436]">
              <span className="h-2 w-2 rounded-full bg-[#3498db]"></span>
              Upcoming Exams
            </h2>
          </div>
          <div className="flex-1 p-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-[#ebe4d9]/50"></div>)}
              </div>
            ) : upcomingExams.length > 0 ? (
              <div className="space-y-3">
                {upcomingExams.map(ex => (
                  <div key={ex.id} className="group flex items-center justify-between rounded-xl border border-[#ebe4d9]/60 bg-white/40 p-3 transition hover:bg-white/80">
                    <div>
                      <p className="text-sm font-bold text-[#2d3436]">{ex.subject}</p>
                      <p className="text-xs text-[#636e72]">{ex.className} · {ex.examKey}</p>
                    </div>
                    <div className="text-right text-xs font-black text-[#3498db]">
                      {ex.examDate}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-[#636e72]">No exams scheduled for the near future.</p>
            )}
          </div>
        </section>

        {/* Performance Chart / Summary */}
        <section className="neo-card-elevated flex flex-col overflow-hidden">
          <div className="bg-[#faf7f0]/60 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#2d3436]">
              <span className="h-2 w-2 rounded-full bg-[#e67e22]"></span>
              Term Performance Summary
            </h2>
          </div>
          <div className="flex-1 p-5">
            {loading ? (
               <div className="h-full w-full animate-pulse rounded-xl bg-[#ebe4d9]/50"></div>
            ) : performanceSummary.length > 0 ? (
              <div className="space-y-4">
                {performanceSummary.map(row => (
                  <div key={row.classRoomId}>
                    <div className="mb-1 flex justify-between text-xs font-bold text-[#2d3436]">
                      <span>{row.className}</span>
                      <span>{row.avgScore}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#ebe4d9]/50">
                      <div 
                        className="h-full bg-gradient-to-r from-[#3498db] to-[#2ecc71] transition-all duration-1000"
                        style={{ width: `${row.avgScore}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-[#636e72]">No result data available for this term.</p>
            )}
          </div>
        </section>
      </div>

      {/* Exam Types & Configuration Quick Links */}
      <section className="neo-card p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-[#2d3436] mb-4">Configured Exam Types</h2>
        <div className="flex flex-wrap gap-3">
          {examTypes.map(t => (
            <div key={t.id} className="rounded-full border border-[#ebe4d9] bg-white/60 px-4 py-2 text-xs font-bold text-[#2d3436]">
              {t.displayName}
            </div>
          ))}
          {examTypes.length === 0 && !loading && <p className="text-sm text-[#636e72]">No exam types configured.</p>}
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
    <div className="space-y-5">
      <header className="border-b border-[#ebe4d9]/80 pb-3">
        <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">{titleForSection(section)}</h1>
        <p className="mt-1 text-sm text-[#636e72]">Performance statistics grouped by section and class.</p>
      </header>

      <div className="neo-card p-4">
        <label className="text-sm font-semibold text-[#2d3436]">
          Term
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="neo-inset-field mt-2 w-full max-w-xs rounded-lg px-3 py-2 text-sm"
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="neo-card-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-[#636e72]">Total students</p>
          <p className="mt-1 text-xl font-bold text-[#2d3436]">{loading ? "…" : totalStudents}</p>
        </div>
        <div className="neo-card-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-[#636e72]">Classes covered</p>
          <p className="mt-1 text-xl font-bold text-[#2d3436]">{loading ? "…" : classesCount}</p>
        </div>
        <div className="neo-card-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-[#636e72]">Results entered</p>
          <p className="mt-1 text-xl font-bold text-[#2d3436]">{loading ? "…" : resultsEntered}</p>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}

      <div className="neo-card overflow-hidden">
        <div className="border-b border-[#ebe4d9]/80 bg-[#faf7f0]/60 px-5 py-3">
          <h2 className="text-sm font-bold text-[#2d3436]">Section/Class performance table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#3f4f67]">
            <thead className="bg-[#f5f8f5] text-xs font-bold uppercase text-[#6a9570]">
              <tr>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Section</th>
                <th className="px-5 py-3 text-right">Students</th>
                <th className="px-5 py-3 text-right">Average score</th>
                <th className="px-5 py-3 text-right">Pass rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]">
              {rows.map((row) => (
                <tr key={`${row.className}-${row.sectionName}`}>
                  <td className="px-5 py-3 font-semibold text-[#2d3436]">{row.className}</td>
                  <td className="px-5 py-3">{row.sectionName}</td>
                  <td className="px-5 py-3 text-right">{row.totalStudents}</td>
                  <td className="px-5 py-3 text-right">{fmtAvg(row.avgScore)}</td>
                  <td className="px-5 py-3 text-right">{fmtPct(row.passRate)}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-[#636e72]">
                    No performance data found for this exam and term.
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
        .filter((x) => Number.isFinite(x.score));
      const saved = await saveStudentMarkEntry({
        studentId: entryStudent.studentId,
        term,
        examType,
        marks,
      });
      setSuccess(`Saved ${saved.saved} subject mark entries.`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save result entries");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="neo-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#2d3436]">Marks Entry Page</h1>
            <p className="mt-1 text-sm text-[#636e72]">
              Enter marks per subject for {term} · {examType}.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-[#d7d1c6] bg-white px-4 py-2 text-sm font-semibold text-[#2d3436] transition hover:bg-[#faf7f0]"
          >
            Back to pending list
          </button>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}
      {success ? <p className="text-sm font-semibold text-[#4a6b4e]">{success}</p> : null}

      <div className="neo-card p-6">
        {loading ? (
          <p className="text-sm text-[#636e72]">Loading student marks page...</p>
        ) : entryStudent ? (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-[#2d3436]">Enter Marks: {entryStudent.fullName}</h2>
              <p className="text-sm text-[#636e72]">
                {entryStudent.admissionNumber} · {entryStudent.className} · {term} · {examType}
              </p>
            </div>
            <div className="grid gap-3">
              {entryStudent.subjects.map((row) => (
                <div
                  key={row.subject}
                  className="grid gap-3 rounded-xl border border-[#ebe4d9]/90 bg-[#faf7f0]/60 p-3 sm:grid-cols-[1.6fr_1fr]"
                >
                  <div className="font-semibold text-[#2d3436]">{row.subject}</div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={row.score}
                    onChange={(e) => updateSubjectMark(row.subject, e.target.value)}
                    className="neo-inset-field w-full rounded-lg px-3 py-2 text-sm text-right"
                    placeholder="Out of 100"
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => void onSaveStudentMarks()}
                disabled={saving || loading}
                className="rounded-full bg-gradient-to-br from-[#b8d8ba] to-[#8fb892] px-5 py-2 text-sm font-bold text-[#2d3436] shadow-[3px_3px_8px_rgba(120,150,125,0.4),-2px_-2px_6px_rgba(255,255,255,0.8)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save marks"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-[#636e72]">Student details unavailable.</p>
        )}
      </div>
    </div>
  );
}

function ResultEntryPage({ mode }: { mode: "exams" | "assessments" }) {
  const [options, setOptions] = useState<ResultEntryOptions | null>(null);
  const [term, setTerm] = useState("Term 1");
  const [examType, setExamType] = useState<ExamType>("");
  const [rows, setRows] = useState<
    Array<{
      studentId: number;
      admissionNumber: string;
      fullName: string;
      className: string;
      sectionName: string;
    }>
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchResultEntryOptions()
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        setTerm(data.terms[0] ?? "Term 1");
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
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedStudentId(null);
    void fetchPendingResultEntryStudents({ term, examType })
      .then((items) => {
        if (cancelled) return;
        setRows(
          items.map((x) => ({
            studentId: x.studentId,
            admissionNumber: x.admissionNumber,
            fullName: x.fullName,
            className: x.className,
            sectionName: x.sectionName,
          })),
        );
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load pending students");
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [term, examType]);

  const authorityText =
    options?.authority === "full"
      ? "Access: Admin has full authority."
      : "Access: Authorized user is restricted to assigned class(es).";
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
          setRows((prev) => prev.filter((x) => x.studentId !== selectedStudentId));
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="neo-card p-6">
        <h1 className="text-xl font-bold text-[#2d3436]">
          {mode === "assessments" ? "Assessment Tests Entry" : "Result Entry"}
        </h1>
        <p className="mt-2 text-sm text-[#636e72]">{authorityText}</p>
        <p className="mt-1 text-sm text-[#636e72]">
          Students shown below are automatically filtered to those without records, sorted by class and section.
        </p>
      </div>

      <div className="neo-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold text-[#2d3436]">
            Term
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="neo-inset-field mt-2 w-full rounded-lg px-3 py-2 text-sm"
            >
              {(options?.terms ?? ["Term 1", "Term 2", "Term 3"]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {mode === "assessments" ? (
            <div className="text-sm font-semibold text-[#2d3436]">
              Exam type
              <div className="neo-inset-field mt-2 rounded-lg px-3 py-2 text-sm text-[#3f4f67]">
                {examType || "No ASSESSMENT exam type configured"}
              </div>
            </div>
          ) : (
            <label className="text-sm font-semibold text-[#2d3436]">
              Exam type
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                disabled={examChoices.length === 0}
                className="neo-inset-field mt-2 w-full rounded-lg px-3 py-2 text-sm"
              >
                {examChoices.length === 0 ? (
                  <option value="">No exam types configured</option>
                ) : null}
                {examChoices.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}

      <div className="neo-card overflow-hidden">
        <div className="border-b border-[#ebe4d9]/80 bg-[#faf7f0]/60 px-5 py-3">
          <h2 className="text-sm font-bold text-[#2d3436]">Students without records (auto-filtered)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#3f4f67]">
            <thead className="bg-[#f5f8f5] text-xs font-bold uppercase text-[#6a9570]">
              <tr>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Section</th>
                <th className="px-5 py-3">Admission No</th>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]">
              {rows.map((row) => (
                <tr key={row.studentId}>
                  <td className="px-5 py-3 font-semibold text-[#2d3436]">{row.className}</td>
                  <td className="px-5 py-3">{row.sectionName}</td>
                  <td className="px-5 py-3">{row.admissionNumber}</td>
                  <td className="px-5 py-3 font-semibold text-[#2d3436]">{row.fullName}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentId(row.studentId)}
                      className="rounded-full bg-[#3498db] px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-105"
                    >
                      Enter marks
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-[#636e72]">
                    {loading ? "Loading students..." : "No pending students found for selected term/exam type."}
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
    <div className="space-y-6">
      <div className="neo-card p-6">
        <h1 className="text-xl font-bold text-[#2d3436]">Grading Standards & Scales</h1>
        <p className="mt-1 text-sm text-[#636e72]">Configure academic grading thresholds and division logic.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="neo-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#2d3436] mb-4">Active Scales</h2>
          {error ? <p className="mb-3 text-sm font-semibold text-[#b84040]">{error}</p> : null}
          <div className="space-y-3">
            {scales.map(s => (
              <div key={s.id} className="rounded-xl border border-[#ebe4d9] bg-[#faf7f0]/60 p-4">
                <h3 className="font-bold text-[#2d3436]">{s.name}</h3>
                <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] uppercase font-bold text-[#636e72]">
                  <span>Grade</span>
                  <span>Min</span>
                  <span>Max</span>
                  <span>Point</span>
                </div>
                {/* Simplified threshold display */}
                <p className="mt-2 text-xs text-[#636e72]">JSON: {JSON.stringify(s.thresholds).slice(0, 50)}...</p>
              </div>
            ))}
            {scales.length === 0 && !loading && <p className="text-sm text-[#636e72]">No grading scales found.</p>}
          </div>
        </section>

        <section className="neo-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#2d3436] mb-4">Add New Standard</h2>
          <p className="text-xs text-[#636e72] mb-4">Define custom grading logic for Primary or Secondary sections.</p>
          <button className="w-full rounded-full bg-[#3498db] py-3 text-sm font-bold text-white transition hover:brightness-110">
            Create New Scale Template
          </button>
        </section>
      </div>
    </div>
  );
}

function ReportRemarksPage() {
  return (
    <div className="space-y-6">
      <div className="neo-card p-6 text-center">
        <h1 className="text-xl font-bold text-[#2d3436]">Student Report Remarks</h1>
        <p className="mt-1 text-sm text-[#636e72]">Manage teacher comments and conduct reports for student cards.</p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#3498db]/10 px-6 py-3 text-sm font-bold text-[#3498db]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#3498db]"></span>
          Select a student from the Results Entry page to add remarks
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
    fetchExams()
      .then(setExams)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="neo-card p-6">
        <h1 className="text-xl font-bold text-[#2d3436]">Academic Exam Scheduling</h1>
        <p className="mt-1 text-sm text-[#636e72]">Set dates for BOT, MID, and EOT exams across all classes.</p>
      </div>

      <div className="neo-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#3f4f67]">
            <thead className="bg-[#f5f8f5] text-xs font-bold uppercase text-[#6a9570]">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]">
              {exams.map(ex => (
                <tr key={ex.id}>
                  <td className="px-5 py-3 font-bold text-[#3498db]">{ex.examDate}</td>
                  <td className="px-5 py-3 font-semibold text-[#2d3436]">{ex.subject}</td>
                  <td className="px-5 py-3">{ex.className}</td>
                  <td className="px-5 py-3"><span className="rounded-full bg-[#ebe4d9] px-2 py-1 text-[10px] font-black uppercase">{ex.examKey}</span></td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-[#3498db] hover:underline font-bold">Edit</button>
                  </td>
                </tr>
              ))}
              {exams.length === 0 && !loading && (
                <tr><td colSpan={5} className="py-10 text-center text-[#636e72]">No exams scheduled.</td></tr>
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
    <div className="space-y-6">
      <div className="neo-card p-6">
        <h1 className="text-xl font-bold text-[#2d3436]">Promotion & Graduation Engine</h1>
        <p className="mt-1 text-sm text-[#636e72]">Bulk promote students to the next class or graduate final year students.</p>
      </div>

      <div className="neo-card p-8 text-center border-dashed border-2 border-[#ebe4d9]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1c40f]/10 text-[#f1c40f]">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#2d3436]">Promotion Engine Locked</h2>
        <p className="mt-2 text-sm text-[#636e72]">Promotion is typically available at the end of Term 3. Configure grading scales first to enable automatic promotion eligibility checks.</p>
        <button className="mt-6 rounded-full bg-[#3498db] px-8 py-3 text-sm font-bold text-white transition hover:brightness-110">
          Check Eligibility (Simulate)
        </button>
      </div>
    </div>
  );
}

function LearnsReportPage() {
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [term, setTerm] = useState("Term 1");
  const [examType, setExamType] = useState<ExamType>("");
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [rows, setRows] = useState<
    Array<{
      studentId: number;
      admissionNumber: string;
      fullName: string;
      sectionName: string | null;
      hasResults: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchResultEntryOptions()
      .then((data) => {
        if (cancelled) return;
        setClasses(data.classes);
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

  useEffect(() => {
    if (!selectedClassId || !examType) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
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
            sectionName: x.sectionName,
            hasResults: x.hasResults,
          })),
        );
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load class marksheet");
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, term, examType]);

  const selectedClassName = useMemo(
    () => classes.find((x) => x.id === selectedClassId)?.name ?? "",
    [classes, selectedClassId],
  );

  if (selectedClassId == null) {
    return (
      <div className="space-y-6">
        <div className="neo-card p-6">
          <h1 className="text-xl font-bold text-[#2d3436]">Learner's Reports</h1>
          <p className="mt-1 text-sm text-[#636e72]">
            Open any class to view its marksheet and learner-level result status.
          </p>
        </div>
        {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}
        <div className="neo-card overflow-hidden">
          <div className="border-b border-[#ebe4d9]/80 bg-[#faf7f0]/60 px-5 py-3">
            <h2 className="text-sm font-bold text-[#2d3436]">Classes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#3f4f67]">
              <thead className="bg-[#f5f8f5] text-xs font-bold uppercase text-[#6a9570]">
                <tr>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebe4d9]">
                {classes.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-semibold text-[#2d3436]">{row.name}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedClassId(row.id)}
                        className="rounded-full bg-[#3498db] px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-105"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && classes.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-6 text-center text-sm text-[#636e72]">
                      No classes available.
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

  return (
    <div className="space-y-4">
      <div className="neo-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#2d3436]">{selectedClassName} Marksheet</h1>
            <p className="mt-1 text-sm text-[#636e72]">
              Review marksheet status by learner for the selected term and exam type.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedClassId(null)}
            className="rounded-full border border-[#d7d1c6] bg-white px-4 py-2 text-sm font-semibold text-[#2d3436] transition hover:bg-[#faf7f0]"
          >
            Back to classes
          </button>
        </div>
      </div>
      <div className="neo-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#2d3436]">
            Term
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="neo-inset-field mt-2 w-full rounded-lg px-3 py-2 text-sm"
            >
              {["Term 1", "Term 2", "Term 3"].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#2d3436]">
            Exam type
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value as ExamType)}
              className="neo-inset-field mt-2 w-full rounded-lg px-3 py-2 text-sm"
            >
              {examTypes.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}
      <div className="neo-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#3f4f67]">
            <thead className="bg-[#f5f8f5] text-xs font-bold uppercase text-[#6a9570]">
              <tr>
                <th className="px-5 py-3">Section</th>
                <th className="px-5 py-3">Admission No</th>
                <th className="px-5 py-3">Learner</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]">
              {rows.map((row) => (
                <tr key={row.studentId}>
                  <td className="px-5 py-3">{row.sectionName || "-"}</td>
                  <td className="px-5 py-3">{row.admissionNumber}</td>
                  <td className="px-5 py-3 font-semibold text-[#2d3436]">{row.fullName}</td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        row.hasResults
                          ? "bg-[#cde8cf] text-[#2d3436]"
                          : "bg-[#f7d1cd] text-[#8a2f2f]"
                      }`}
                    >
                      {row.hasResults ? "Has marks" : "Missing marks"}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-[#636e72]">
                    No learners found for this class and filter.
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
