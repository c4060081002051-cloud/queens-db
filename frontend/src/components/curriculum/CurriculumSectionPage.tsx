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
  fetchSubjectConfigs,
  fetchStudentMarkEntry,
  saveStudentMarkEntry,
  type ExamTypeConfigRow,
  type PerformanceSummaryRow,
  type ResultEntryOptions,
  type SubjectAssignmentConfigRow,
} from "../../api/academics";

export type CurriculumSection =
  | "exams_dashboard"
  | "exam_bot"
  | "exam_mid"
  | "exam_eot"
  | `exam_type:${string}`
  | "assessment_tests"
  | "result_entry"
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
  return "Blank Page";
}

function ExamsDashboardPage() {
  const [term, setTerm] = useState("Term 1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examSummaries, setExamSummaries] = useState<
    Array<{ examKey: string; displayName: string; rows: PerformanceSummaryRow[] }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchExamTypeConfigs()
      .then((examTypes) => {
        const activeExamTypes = examTypes.filter((row) => row.isActive);
        if (activeExamTypes.length === 0) return [];
        return Promise.all(
          activeExamTypes.map((row) =>
            fetchPerformanceSummary(term, row.examKey).then((rows) => ({
              examKey: row.examKey,
              displayName: row.displayName || row.examKey,
              rows,
            })),
          ),
        );
      })
      .then((items) => {
        if (cancelled) return;
        setExamSummaries(items);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load exams dashboard");
          setExamSummaries([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [term]);

  function aggregate(rows: PerformanceSummaryRow[]) {
    const classes = new Set(rows.map((x) => `${x.className}::${x.sectionName}`)).size;
    const students = rows.reduce((sum, row) => sum + row.totalStudents, 0);
    const entered = rows.reduce((sum, row) => sum + row.resultsEntered, 0);
    const avgScore =
      rows.length > 0
        ? rows.reduce((sum, row) => sum + (row.avgScore ?? 0), 0) / rows.length
        : null;
    const passRate =
      rows.length > 0
        ? rows.reduce((sum, row) => sum + (row.passRate ?? 0), 0) / rows.length
        : null;
    return { classes, students, entered, avgScore, passRate };
  }

  const cards = examSummaries.map((row) => ({
    examKey: row.examKey,
    label: row.displayName,
    data: aggregate(row.rows),
  }));
  const totalEntered = cards.reduce((sum, item) => sum + item.data.entered, 0);
  const totalStudents = cards.reduce((sum, item) => sum + item.data.students, 0);
  const completionPct = totalStudents > 0 ? ((totalEntered / totalStudents) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-5">
      <header className="border-b border-[#ebe4d9]/80 pb-3">
        <h1 className="text-xl font-bold tracking-tight text-[#2d3436]">Exams Dashboard</h1>
        <p className="mt-1 text-sm text-[#636e72]">
          Central overview for all configured exam-type performance.
        </p>
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
          <p className="text-xs uppercase tracking-wide text-[#636e72]">Results entered</p>
          <p className="mt-1 text-xl font-bold text-[#2d3436]">{loading ? "…" : totalEntered}</p>
        </div>
        <div className="neo-card-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-[#636e72]">Students tracked</p>
          <p className="mt-1 text-xl font-bold text-[#2d3436]">{loading ? "…" : totalStudents}</p>
        </div>
        <div className="neo-card-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-[#636e72]">Completion rate</p>
          <p className="mt-1 text-xl font-bold text-[#2d3436]">{loading ? "…" : `${completionPct}%`}</p>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((block) => (
          <section key={block.examKey} className="neo-card p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#2d3436]">{block.label}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[#636e72]">Classes</p>
                <p className="font-bold text-[#2d3436]">{loading ? "…" : block.data.classes}</p>
              </div>
              <div>
                <p className="text-[#636e72]">Results entered</p>
                <p className="font-bold text-[#2d3436]">{loading ? "…" : block.data.entered}</p>
              </div>
              <div>
                <p className="text-[#636e72]">Average score</p>
                <p className="font-bold text-[#2d3436]">
                  {loading ? "…" : block.data.avgScore == null ? "—" : block.data.avgScore.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-[#636e72]">Pass rate</p>
                <p className="font-bold text-[#2d3436]">
                  {loading ? "…" : block.data.passRate == null ? "—" : `${block.data.passRate.toFixed(1)}%`}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>
      {!loading && cards.length === 0 ? (
        <p className="text-sm text-[#636e72]">No exam types configured.</p>
      ) : null}
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
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [subjectItems, setSubjectItems] = useState<SubjectAssignmentConfigRow[]>([]);
  const [examTypes, setExamTypes] = useState<ExamTypeConfigRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubjectAssignment, setShowSubjectAssignment] = useState(false);
  const [subjectCategoryId, setSubjectCategoryId] = useState<number | null>(null);
  const [subjectSectionName, setSubjectSectionName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [newExamKey, setNewExamKey] = useState("");
  const [newExamLabel, setNewExamLabel] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [subjectPayload, examRows] = await Promise.all([
        fetchSubjectConfigs(),
        fetchExamTypeConfigs(),
      ]);
      setCategories(subjectPayload.categories);
      setSubjectItems(subjectPayload.items);
      setExamTypes(examRows);
      if (subjectPayload.categories.length > 0 && subjectCategoryId == null) {
        setSubjectCategoryId(subjectPayload.categories[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subject settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="space-y-4">
      <div className="neo-card p-6">
        <h1 className="text-xl font-bold text-[#2d3436]">Subjects & Exam Types</h1>
        <p className="mt-1 text-sm text-[#636e72]">
          Admin configuration for custom exam types and subject assignment by class category/section.
        </p>
      </div>

      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowSubjectAssignment(true)}
          className="rounded-full bg-[#3498db] px-4 py-2 text-xs font-bold text-white transition hover:brightness-105"
        >
          Add assign subject
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="neo-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#2d3436]">Exam Types</h2>
          <div className="mt-3 grid gap-2">
            <input
              value={newExamKey}
              onChange={(e) => setNewExamKey(e.target.value)}
              placeholder="Exam key (e.g. MOCK)"
              className="neo-inset-field rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={newExamLabel}
              onChange={(e) => setNewExamLabel(e.target.value)}
              placeholder="Display name (e.g. Mock Exam)"
              className="neo-inset-field rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void onAddExamType()}
              className="rounded-full bg-[#3498db] px-4 py-2 text-xs font-bold text-white transition hover:brightness-105"
            >
              Add exam type
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {examTypes.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl border border-[#ebe4d9] bg-[#faf7f0]/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-bold text-[#2d3436]">{row.displayName}</p>
                  <p className="text-xs text-[#636e72]">{row.examKey}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onDeleteExamType(row)}
                  className="rounded-full bg-[#f7d1cd] px-3 py-1 text-xs font-bold text-[#b84040] transition hover:brightness-95"
                >
                  Delete
                </button>
              </div>
            ))}
            {!loading && examTypes.length === 0 ? (
              <p className="text-xs text-[#636e72]">No exam types configured.</p>
            ) : null}
          </div>
        </section>

        {showSubjectAssignment ? (
          <section className="neo-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#2d3436]">Subject Assignment</h2>
            <div className="mt-3 grid gap-2">
              <select
                value={subjectCategoryId ?? ""}
                onChange={(e) => setSubjectCategoryId(Number(e.target.value))}
                className="neo-inset-field rounded-lg px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Select class category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                value={subjectSectionName}
                onChange={(e) => setSubjectSectionName(e.target.value)}
                placeholder="Section name (optional, e.g. Blue)"
                className="neo-inset-field rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Subject name"
                className="neo-inset-field rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void onAddSubject()}
                className="rounded-full bg-[#3498db] px-4 py-2 text-xs font-bold text-white transition hover:brightness-105"
              >
                Add subject
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {subjectItems.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-xl border border-[#ebe4d9] bg-[#faf7f0]/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-bold text-[#2d3436]">{row.subjectName}</p>
                    <p className="text-xs text-[#636e72]">
                      {categoryNameById.get(row.classCategoryId) ?? `Category ${row.classCategoryId}`}
                      {" · "}
                      {row.sectionName || "All sections"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onDeleteSubject(row.id)}
                    className="rounded-full bg-[#f7d1cd] px-3 py-1 text-xs font-bold text-[#b84040]"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {!loading && subjectItems.length === 0 ? (
                <p className="text-xs text-[#636e72]">No subject assignments configured.</p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function CurriculumSectionPage({ section }: { section: CurriculumSection }) {
  if (section === "exams_dashboard") return <ExamsDashboardPage />;
  if (section === "result_entry") return <ResultEntryPage mode="exams" />;
  if (section === "assessment_tests") return <ResultEntryPage mode="assessments" />;
  if (section === "blank_page") return <SubjectsConfigPage />;
  return <PerformanceStatsPage section={section} />;
}
