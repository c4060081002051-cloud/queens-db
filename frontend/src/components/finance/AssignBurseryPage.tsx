import { useEffect, useState } from "react";
import { fetchStudent, fetchStudents, type StudentApiRow } from "../../api/students";
import { assignBursery, revokeBursery } from "../../api/financeBursery";
import { fetchStudentStatement } from "../../api/financeStatements";
import { formatCurrencyUGX } from "./shared/financeFormat";
import { useI18n } from "../../i18n/I18nProvider";

function studentLabel(student: StudentApiRow): string {
  return `${student.fullName} (${student.admissionNumber})`;
}

function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AssignBurseryPage({
  initialStudentId,
  initialTerm,
  initialPercentage,
}: {
  initialStudentId?: number;
  initialTerm?: string;
  initialPercentage?: string;
}) {
  const { t } = useI18n();
  const [studentSearch, setStudentSearch] = useState("");
  const [studentMatches, setStudentMatches] = useState<StudentApiRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentApiRow | null>(null);
  const [term, setTerm] = useState(initialTerm ?? "Term 1");
  const [percentage, setPercentage] = useState(initialPercentage ?? "0");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [expectedBase, setExpectedBase] = useState<number | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setTerm(initialTerm ?? "Term 1");
  }, [initialTerm]);

  useEffect(() => {
    setPercentage(initialPercentage ?? "0");
  }, [initialPercentage]);

  useEffect(() => {
    if (!initialStudentId) return;
    let cancelled = false;
    setSearchLoading(true);
    void fetchStudent(initialStudentId)
      .then((student) => {
        if (cancelled) return;
        setSelectedStudent(student);
        setStudentSearch(studentLabel(student));
        setStartsAt(toDateTimeLocalValue(student.bursaryStartsAt));
        setEndsAt(toDateTimeLocalValue(student.bursaryEndsAt));
        setStudentMatches([]);
      })
      .catch(() => {
        if (!cancelled) {
          setStatusMsg({ type: "error", text: "Failed to load selected student." });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearchLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialStudentId]);

  // Student search effect
  useEffect(() => {
    if (studentSearch.trim().length < 2) {
      setStudentMatches([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    void fetchStudents({ q: studentSearch.trim(), sortBy: "name", sortDir: "asc", limit: 8 })
      .then((rows) => {
        if (!cancelled) setStudentMatches(rows);
      })
      .catch(() => {
        if (!cancelled) setStudentMatches([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentSearch]);

  // Fetch student current statement to see base amount when student/term changes
  useEffect(() => {
    if (selectedStudent) {
      void fetchStudentStatement(selectedStudent.id, term)
        .then((data) => {
           // We try to find the structure amount or just use assignedAmount
           setExpectedBase(data.assignedAmount);
        })
        .catch(() => setExpectedBase(null));
    } else {
      setExpectedBase(null);
    }
  }, [selectedStudent, term]);

  const handleApply = async () => {
    if (!selectedStudent) return;
    if (!Number.isFinite(Number(percentage)) || Number(percentage) <= 0) {
      setStatusMsg({ type: "error", text: "Bursary percentage must be greater than 0." });
      return;
    }
    if (!startsAt || !endsAt) {
      setStatusMsg({ type: "error", text: "Bursary start and end dates are required." });
      return;
    }
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setStatusMsg({ type: "error", text: "Bursary end time must be after start time." });
      return;
    }
    setStatusMsg(null);
    setSubmitting(true);
    try {
      await assignBursery({
        studentId: selectedStudent.id,
        percentage: Number(percentage),
        term,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      });
      setStatusMsg({
        type: "success",
        text: `${t("finance.bursery.status.success")} ${percentage}% for ${term}.`,
      });
      
      // Refresh base fee display
      const data = await fetchStudentStatement(selectedStudent.id, term);
      setExpectedBase(data.assignedAmount);
    } catch (e) {
      setStatusMsg({ type: "error", text: e instanceof Error ? e.message : "Failed to assign bursary" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedStudent) return;
    if (!window.confirm("Are you sure you want to revoke this student's bursary? Fees will return to standard rates.")) return;
    
    setStatusMsg(null);
    setSubmitting(true);
    try {
      await revokeBursery(selectedStudent.id, term);
      setPercentage("0");
      setStartsAt("");
      setEndsAt("");
      setStatusMsg({ type: "success", text: t("finance.bursery.status.revoked") });
      
      // Refresh base fee display
      const data = await fetchStudentStatement(selectedStudent.id, term);
      setExpectedBase(data.assignedAmount);
    } catch (e) {
      setStatusMsg({ type: "error", text: e instanceof Error ? e.message : "Failed to revoke bursary" });
    } finally {
      setSubmitting(false);
    }
  };

  const discountedPreview = expectedBase != null 
    ? Math.round(expectedBase * (1 - (Number(percentage) || 0) / 100))
    : null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: "#0c2340", fontWeight: 800, fontSize: "1.75rem", margin: 0 }}>
          {t("finance.bursery.assignTitle")}
        </h1>
        <p style={{ color: "#64748b", marginTop: 4 }}>
          {t("finance.bursery.assignDesc")}
        </p>
      </div>

      <div style={{ 
        background: "#fff", 
        borderRadius: 24, 
        padding: 32, 
        border: "1px solid #e2e8f0", 
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" 
      }}>
        
        {/* Search & Term Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <div style={{ position: "relative" }}>
            <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: 8 }}>
              {t("finance.bursery.field.search")}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  if (selectedStudent) setSelectedStudent(null);
                }}
                placeholder="Name or Admission #"
                style={{
                  width: "100%",
                  height: 48,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "2px solid #e2e8f0",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />
              {searchLoading && (
                <div style={{ position: "absolute", right: 12, top: 14 }}>
                  <div className="animate-spin h-5 w-5 border-2 border-[#0c2340] border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            {/* Suggestions list */}
            {studentMatches.length > 0 && !selectedStudent && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                marginTop: 4,
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                zIndex: 50,
                maxHeight: 240,
                overflowY: "auto"
              }}>
                {studentMatches.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStudent(s);
                      setStudentSearch(studentLabel(s));
                      setStartsAt(toDateTimeLocalValue(s.bursaryStartsAt));
                      setEndsAt(toDateTimeLocalValue(s.bursaryEndsAt));
                      setStudentMatches([]);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      textAlign: "left",
                      border: "none",
                      background: "none",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#1e293b" }}>{s.fullName}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{s.admissionNumber} • {s.className}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: 8 }}>
              {t("finance.bursery.field.term")}
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              style={{
                width: "100%",
                height: 48,
                padding: "0 16px",
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                fontSize: "1rem",
                background: "#fff",
                outline: "none"
              }}
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
        </div>

        {/* Selected Student Details */}
        {selectedStudent && (
          <div style={{ 
            background: "#f8fafc", 
            borderRadius: 16, 
            padding: 24, 
            marginBottom: 32,
            border: "1px solid #f1f5f9"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, color: "#0c2340", fontSize: "1.1rem" }}>{selectedStudent.fullName}</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                  {selectedStudent.className} • {selectedStudent.boardingStatus?.replace("_", " ")}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ 
                  display: "inline-block", 
                  padding: "4px 12px", 
                  background: "#e2e8f0", 
                  borderRadius: 20, 
                  fontSize: "0.75rem", 
                  fontWeight: 800, 
                  color: "#475569" 
                }}>
                  {selectedStudent.admissionNumber}
                </span>
              </div>
            </div>

            <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid #e2e8f0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div className="neo-card p-4 bg-white">
                <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Standard Term Fee</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0c2340", margin: "4px 0 0" }}>
                  {expectedBase != null ? formatCurrencyUGX(expectedBase) : "—"}
                </p>
              </div>
              <div className="neo-card p-4 bg-[#f1fcf8] border-[#10b981]/20">
                <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#059669", textTransform: "uppercase" }}>Current Bursary</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 900, color: "#059669", margin: "4px 0 0" }}>
                  {(selectedStudent as any).bursaryPercentage || 0}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Assignment Form */}
        {selectedStudent && (
          <div style={{ display: "grid", gap: 24 }}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: 12 }}>
                {t("finance.bursery.field.percentage")}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  style={{ flex: 1, accentColor: "#0c2340" }}
                />
                <div style={{ 
                  width: 80, 
                  height: 48, 
                  background: "#0c2340", 
                  color: "#fff", 
                  borderRadius: 12, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  fontWeight: 800
                }}>
                  {percentage}%
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  style={{
                    width: 120,
                    height: 48,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "2px solid #e2e8f0",
                    fontSize: "1rem",
                    fontWeight: 700,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: 8 }}>
                  Bursary starts at *
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    height: 48,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "2px solid #e2e8f0",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: 8 }}>
                  Bursary ends at *
                </label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    height: 48,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "2px solid #e2e8f0",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Preview Card */}
            <div style={{ 
              background: "linear-gradient(135deg, #0c2340, #1e3a8a)", 
              borderRadius: 16, 
              padding: 24, 
              color: "#fff",
              marginBottom: 32,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <p style={{ margin: 0, opacity: 0.8, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>
                  {t("finance.bursery.preview.title")}
                </p>
                <h3 style={{ margin: "4px 0 0", fontSize: "1.75rem", fontWeight: 900 }}>
                  {discountedPreview != null ? formatCurrencyUGX(discountedPreview) : "—"}
                </h3>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, opacity: 0.8, fontSize: "0.75rem" }}>
                  {t("finance.bursery.preview.savings")}
                </p>
                <p style={{ margin: 0, fontWeight: 800, color: "#10b981" }}>
                   -{expectedBase != null && discountedPreview != null ? formatCurrencyUGX(expectedBase - discountedPreview) : "—"}
                </p>
              </div>
            </div>

            {statusMsg && (
              <div style={{ 
                padding: 16, 
                borderRadius: 12, 
                backgroundColor: statusMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: statusMsg.type === "success" ? "#065f46" : "#991b1b",
                border: `1px solid ${statusMsg.type === "success" ? "#10b981" : "#ef4444"}33`,
                marginBottom: 24,
                fontSize: "0.9rem",
                fontWeight: 600
              }}>
                {statusMsg.text}
              </div>
            )}

            <div style={{ display: "flex", gap: 16 }}>
              <button
                disabled={submitting || !startsAt || !endsAt || !Number.isFinite(Number(percentage)) || Number(percentage) <= 0}
                onClick={handleApply}
                style={{
                  flex: 2,
                  height: 56,
                  background: "linear-gradient(135deg, #0c2340, #1a3a5c)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 16,
                  fontWeight: 800,
                  fontSize: "1rem",
                  cursor: (submitting || !startsAt || !endsAt || !Number.isFinite(Number(percentage)) || Number(percentage) <= 0) ? "not-allowed" : "pointer",
                  opacity: (submitting || !startsAt || !endsAt || !Number.isFinite(Number(percentage)) || Number(percentage) <= 0) ? 0.7 : 1,
                  boxShadow: "0 4px 12px rgba(12,35,64,0.2)"
                }}
              >
                {submitting ? "Processing..." : t("finance.bursery.btn.apply")}
              </button>
              <button
                disabled={submitting || Number((selectedStudent as any).bursaryPercentage || 0) === 0}
                onClick={handleRevoke}
                style={{
                  flex: 1,
                  height: 56,
                  background: "#fff",
                  color: "#ef4444",
                  border: "2px solid #ef4444",
                  borderRadius: 16,
                  fontWeight: 800,
                  fontSize: "1rem",
                  cursor: (submitting || Number((selectedStudent as any).bursaryPercentage || 0) === 0) ? "not-allowed" : "pointer",
                  opacity: (submitting || Number((selectedStudent as any).bursaryPercentage || 0) === 0) ? 0.5 : 1
                }}
              >
                {t("finance.bursery.btn.revoke")}
              </button>
            </div>
          </div>
        )}

        {!selectedStudent && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔎</div>
            <p style={{ fontWeight: 600 }}>Select a student to manage their bursary.</p>
          </div>
        )}

      </div>
    </div>
  );
}
