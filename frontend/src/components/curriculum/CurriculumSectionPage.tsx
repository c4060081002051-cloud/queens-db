import { useEffect, useMemo, useState } from "react";
import {
  fetchPendingResultEntryStudents,
  fetchPerformanceSummary,
  fetchResultEntryOptions,
  fetchStudentMarkEntry,
  saveStudentMarkEntry,
  type PerformanceSummaryRow,
  type ResultEntryOptions,
} from "../../api/academics";

export type CurriculumSection =
  | "exam_bot"
  | "exam_mid"
  | "exam_eot"
  | "assessment_tests"
  | "result_entry"
  | "blank_page";

type ExamType = "BOT" | "MID" | "EOT" | "ASSESSMENT";

function titleForSection(section: CurriculumSection): string {
  if (section === "exam_bot") return "BOT Exam Performance";
  if (section === "exam_mid") return "MID Exam Performance";
  if (section === "exam_eot") return "EOT Exam Performance";
  if (section === "assessment_tests") return "Assessment Tests Entry";
  if (section === "result_entry") return "Result Entry";
  return "Blank Page";
}

function examTypeForSection(section: CurriculumSection): ExamType {
  if (section === "exam_mid") return "MID";
  if (section === "exam_eot") return "EOT";
  if (section === "assessment_tests") return "ASSESSMENT";
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
  const [examType, setExamType] = useState<ExamType>(mode === "assessments" ? "ASSESSMENT" : "BOT");
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
          setExamType("ASSESSMENT");
        } else {
          const examChoices = data.examTypes.filter((x) => x !== "ASSESSMENT");
          setExamType((examChoices[0] as ExamType | undefined) ?? "BOT");
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
              <div className="neo-inset-field mt-2 rounded-lg px-3 py-2 text-sm text-[#3f4f67]">ASSESSMENT</div>
            </div>
          ) : (
            <label className="text-sm font-semibold text-[#2d3436]">
              Exam type
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className="neo-inset-field mt-2 w-full rounded-lg px-3 py-2 text-sm"
              >
                {(options?.examTypes ?? ["BOT", "MID", "EOT"]).filter((t) => t !== "ASSESSMENT").map((t) => (
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

function BlankDesignPage() {
  return (
    <div className="neo-card p-6">
      <h1 className="text-xl font-bold text-[#2d3436]">Blank Page</h1>
      <p className="mt-2 text-sm text-[#636e72]">Placeholder page created. You can provide the layout/design requirements later.</p>
    </div>
  );
}

export function CurriculumSectionPage({ section }: { section: CurriculumSection }) {
  if (section === "result_entry") return <ResultEntryPage mode="exams" />;
  if (section === "assessment_tests") return <ResultEntryPage mode="assessments" />;
  if (section === "blank_page") return <BlankDesignPage />;
  return <PerformanceStatsPage section={section} />;
}
