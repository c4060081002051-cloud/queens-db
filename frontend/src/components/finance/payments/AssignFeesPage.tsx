import { useEffect, useMemo, useState } from "react";
import { fetchStudents, type StudentApiRow } from "../../../api/students";
import { assignStudentFee, fetchStudentStatement } from "../../../api/financeStatements";
import { fetchFeeStructure, type FeeStructureRow } from "../../../api/financeFeeStructure";
import { formatCurrencyUGX } from "../shared/financeFormat";

type AssignmentPreview = {
  assignedAmount: number;
  totalPaid: number;
  outstandingAmount: number;
  creditAmount: number;
};

function hasP7Class(className: string | null): boolean {
  if (!className) return false;
  return /\bP7\b/i.test(className);
}

function suggestFeeStatus(
  student: StudentApiRow | null,
  rows: FeeStructureRow[],
): { status: string; reason: string } | null {
  if (!student || rows.length === 0) return null;
  const normalized = (student.boardingStatus ?? "").toLowerCase();
  const candidates: string[] = [];

  if (normalized === "boarding") {
    candidates.push("boarding");
  } else if (normalized === "day_full") {
    if (hasP7Class(student.className)) candidates.push("day_full_p7");
    candidates.push("day_full");
  } else if (normalized === "day_half") {
    candidates.push("day_half");
  }

  const matchByStatus = candidates
    .map((key) => rows.find((row) => row.status === key))
    .find((row): row is FeeStructureRow => Boolean(row));
  if (matchByStatus) {
    return {
      status: matchByStatus.status,
      reason: `Suggested from status "${student.boardingStatus ?? "unknown"}"${
        hasP7Class(student.className) ? " + class P7" : ""
      }.`,
    };
  }

  const labelHint =
    normalized === "boarding"
      ? "boarding"
      : normalized === "day_half"
        ? "half"
        : normalized === "day_full"
          ? "full"
          : "";
  if (labelHint) {
    const matchByLabel = rows.find((row) => row.label.toLowerCase().includes(labelHint));
    if (matchByLabel) {
      return {
        status: matchByLabel.status,
        reason: `Suggested from status "${student.boardingStatus ?? "unknown"}".`,
      };
    }
  }

  return {
    status: rows[0].status,
    reason: "No exact status match found, showing first available fee structure option.",
  };
}

function studentLabel(student: StudentApiRow): string {
  return `${student.fullName} (${student.admissionNumber})`;
}

export function AssignFeesPage() {
  const [studentSearch, setStudentSearch] = useState("");
  const [studentMatches, setStudentMatches] = useState<StudentApiRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentApiRow | null>(null);
  const [term, setTerm] = useState("Term 1");
  const [feeRows, setFeeRows] = useState<FeeStructureRow[]>([]);
  const [feeTypeStatus, setFeeTypeStatus] = useState("");
  const [feeStructureLoading, setFeeStructureLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [suggestionNote, setSuggestionNote] = useState<string | null>(null);

  const selectedFeeRow = useMemo(
    () => feeRows.find((row) => row.status === feeTypeStatus) ?? null,
    [feeRows, feeTypeStatus],
  );
  const parsedAmount = useMemo(
    () => Math.max(Number(selectedFeeRow?.amountDueUgx ?? 0) || 0, 0),
    [selectedFeeRow],
  );

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

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadStructure = async () => {
      setFeeStructureLoading(true);
      try {
        const rows = await fetchFeeStructure(term);
        if (cancelled) return;
        setFormError(null);
        setFeeRows(rows);
        setFeeTypeStatus((prev) => {
          if (prev && rows.some((row) => row.status === prev)) return prev;
          return rows[0]?.status ?? "";
        });
      } catch (e) {
        if (!cancelled) {
          setFeeRows([]);
          setFeeTypeStatus("");
          setFormError(e instanceof Error ? e.message : "Failed to load fee structure.");
        }
      } finally {
        if (!cancelled) setFeeStructureLoading(false);
      }
    };

    void loadStructure();
    // Keep options in sync when admin updates fee structure.
    timer = setInterval(() => {
      void loadStructure();
    }, 30000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [term]);

  useEffect(() => {
    const suggestion = suggestFeeStatus(selectedStudent, feeRows);
    if (!suggestion) {
      setSuggestionNote(null);
      return;
    }
    setFeeTypeStatus(suggestion.status);
    setSuggestionNote(suggestion.reason);
  }, [selectedStudent, feeRows]);

  useEffect(() => {
    if (!selectedStudent) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    void fetchStudentStatement(selectedStudent.id, term)
      .then((payload) => {
        if (cancelled) return;
        setPreview({
          assignedAmount: payload.assignedAmount,
          totalPaid: payload.totalPaid,
          outstandingAmount: payload.outstandingAmount,
          creditAmount: payload.creditAmount,
        });
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStudent, term]);

  const handleAssign = async () => {
    setSuccessMsg(null);
    setFormError(null);
    if (!selectedStudent) {
      setFormError("Select a student from search results before assigning fees.");
      return;
    }
    if (parsedAmount <= 0) {
      setFormError("Selected fee type has no valid amount in fee structure.");
      return;
    }
    if (!selectedFeeRow) {
      setFormError("Select a fee type from fee structure before assigning.");
      return;
    }

    setSubmitting(true);
    try {
      const notesPayload = [
        `Fee type: ${selectedFeeRow.label}`,
        selectedFeeRow.notes ? `Structure note: ${selectedFeeRow.notes}` : "",
        notes.trim(),
      ]
        .filter(Boolean)
        .join(" | ");
      await assignStudentFee({
        studentId: selectedStudent.id,
        term,
        amountDueUgx: parsedAmount,
        notes: notesPayload || undefined,
      });

      const payload = await fetchStudentStatement(selectedStudent.id, term);
      setPreview({
        assignedAmount: payload.assignedAmount,
        totalPaid: payload.totalPaid,
        outstandingAmount: payload.outstandingAmount,
        creditAmount: payload.creditAmount,
      });
      setSuccessMsg(
        `Assigned ${formatCurrencyUGX(parsedAmount)} to ${selectedStudent.fullName} for ${term}.`,
      );
      setNotes("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to assign fees.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 28,
          padding: "40px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <div
            style={{
              width: 70,
              height: 70,
              background: "linear-gradient(135deg, rgba(12,35,64,0.08), rgba(234,160,62,0.15))",
              color: "#0c2340",
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 15px",
              fontSize: "1.8rem",
              boxShadow: "inset 0 2px 4px 0 rgba(0,0,0,0.06)",
            }}
          >
            🧮
          </div>
          <h2
            style={{
              color: "#0c2340",
              margin: 0,
              fontWeight: 800,
              fontSize: "1.75rem",
              letterSpacing: "-0.02em",
            }}
          >
            Assign Student Fees
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem", marginTop: 8 }}>
            Search learners, assign fee amounts, and make them available for accountant payment
            capture.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          <div style={{ position: "relative" }}>
            <label
              style={{
                fontWeight: 700,
                color: "#334155",
                marginBottom: 10,
                display: "block",
                fontSize: "0.9rem",
                letterSpacing: "0.03em",
              }}
            >
              STUDENT SEARCH *
            </label>
            <input
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setSuccessMsg(null);
                if (selectedStudent) setSelectedStudent(null);
              }}
              placeholder="Start typing student name or admission number"
              style={{
                height: 56,
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                padding: "0 16px",
                fontSize: "1rem",
                width: "100%",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            {searchLoading ? (
              <p style={{ marginTop: 4, fontSize: "0.75rem", color: "#94a3b8" }}>Searching students...</p>
            ) : null}
            {studentMatches.length > 0 && !selectedStudent ? (
              <div
                style={{
                  marginTop: 4,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  maxHeight: 250,
                  overflowY: "auto",
                  zIndex: 30,
                  position: "relative",
                }}
              >
                {studentMatches.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(student);
                      setStudentSearch(studentLabel(student));
                      setStudentMatches([]);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      borderBottom: "1px solid #f1f5f9",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <strong style={{ color: "#1e293b" }}>{student.fullName}</strong>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        marginTop: 2,
                      }}
                    >
                      {student.admissionNumber} {student.className ? `• ${student.className}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label
              style={{
                fontWeight: 700,
                color: "#334155",
                marginBottom: 10,
                display: "block",
                fontSize: "0.9rem",
                letterSpacing: "0.03em",
              }}
            >
              ACADEMIC TERM *
            </label>
            <select
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setSuccessMsg(null);
              }}
              style={{
                height: 56,
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                padding: "0 14px",
                fontSize: "1rem",
                width: "100%",
                boxSizing: "border-box",
                background: "#fff",
              }}
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          <div>
            <label
              style={{
                fontWeight: 700,
                color: "#334155",
                marginBottom: 10,
                display: "block",
                fontSize: "0.9rem",
                letterSpacing: "0.03em",
              }}
            >
              FEE TYPE *
            </label>
            <select
              value={feeTypeStatus}
              onChange={(e) => {
                setFeeTypeStatus(e.target.value);
                setSuccessMsg(null);
                setFormError(null);
              }}
              disabled={feeStructureLoading || feeRows.length === 0}
              style={{
                height: 56,
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                padding: "0 14px",
                fontSize: "1rem",
                width: "100%",
                boxSizing: "border-box",
                background: "#fff",
              }}
            >
              {feeRows.length === 0 ? (
                <option value="">
                  {feeStructureLoading ? "Loading fee structure..." : "No fee structure found"}
                </option>
              ) : (
                feeRows.map((item) => (
                  <option key={item.status} value={item.status}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
            <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              Fee options update automatically from the current term fee structure.
            </p>
            {suggestionNote ? (
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#2563eb", fontWeight: 600 }}>
                {suggestionNote}
              </p>
            ) : null}
          </div>

          <div>
            <label
              style={{
                fontWeight: 700,
                color: "#334155",
                marginBottom: 10,
                display: "block",
                fontSize: "0.9rem",
                letterSpacing: "0.03em",
              }}
            >
              AMOUNT TO ASSIGN (UGX) *
            </label>
            <input
              type="text"
              readOnly
              value={selectedFeeRow ? formatCurrencyUGX(selectedFeeRow.amountDueUgx) : ""}
              placeholder="Auto from fee structure"
              style={{
                height: 56,
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                padding: "0 14px",
                fontSize: "1.1rem",
                fontWeight: 700,
                width: "100%",
                boxSizing: "border-box",
                background: "#f8fafc",
                color: "#0f172a",
                cursor: "not-allowed",
              }}
            />
            <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              This value is read-only and pulled from fee structure.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              fontWeight: 700,
              color: "#334155",
              marginBottom: 10,
              display: "block",
              fontSize: "0.9rem",
              letterSpacing: "0.03em",
            }}
          >
            ADMIN NOTES
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional context for this assignment"
            style={{
              width: "100%",
              minHeight: 76,
              borderRadius: 12,
              border: "2px solid #e2e8f0",
              padding: "12px 14px",
              fontSize: "0.95rem",
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "16px 18px",
            background: "#f8fafc",
            marginBottom: 20,
          }}
        >
          <h4 style={{ margin: 0, color: "#0f172a", fontSize: "0.9rem", fontWeight: 800 }}>
            Current term snapshot
          </h4>
          {!selectedStudent ? (
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
              Select a student to preview currently assigned and outstanding term figures.
            </p>
          ) : loadingPreview ? (
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
              Loading fee balances...
            </p>
          ) : preview ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginTop: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>Assigned</p>
                <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>
                  {formatCurrencyUGX(preview.assignedAmount)}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>Paid</p>
                <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>
                  {formatCurrencyUGX(preview.totalPaid)}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>Outstanding</p>
                <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: "0.9rem", color: "#b91c1c" }}>
                  {formatCurrencyUGX(preview.outstandingAmount)}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>Credit</p>
                <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: "0.9rem", color: "#0369a1" }}>
                  {formatCurrencyUGX(preview.creditAmount)}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ margin: "8px 0 0", color: "#b91c1c", fontSize: "0.85rem" }}>
              Could not load statement snapshot for this student.
            </p>
          )}
        </div>

        {formError ? (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 14,
              color: "#991b1b",
              fontSize: "0.86rem",
              fontWeight: 600,
            }}
          >
            {formError}
          </div>
        ) : null}
        {successMsg ? (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 14,
              color: "#065f46",
              fontSize: "0.86rem",
              fontWeight: 600,
            }}
          >
            {successMsg}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleAssign()}
          disabled={submitting || feeStructureLoading || !selectedFeeRow}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 14,
            fontWeight: 700,
            border: "none",
            background: "linear-gradient(135deg, #0c2340, #1a3a5c)",
            color: "#fff",
            fontSize: "0.95rem",
            cursor: submitting || feeStructureLoading || !selectedFeeRow ? "not-allowed" : "pointer",
            opacity: submitting || feeStructureLoading || !selectedFeeRow ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 4px 6px -1px rgba(12,35,64,0.3)",
          }}
        >
          {submitting ? "Saving assignment..." : "Assign Fees"}
        </button>
      </div>
    </div>
  );
}
