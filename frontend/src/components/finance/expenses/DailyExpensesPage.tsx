import { useEffect, useState } from "react";
import { createDailyExpense, fetchFinanceLedger } from "../../../api/financeLedger";
import { fetchFinanceDashboard } from "../../../api/financeDashboard";
import { formatCurrencyUGX } from "../shared/financeFormat";
import type { FinanceLedgerItem } from "../shared/financeTypes";

function ymd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const EXPENSE_CATEGORIES = [
  { value: "Utilities", label: "Utilities (Water, Power)" },
  { value: "Supplies", label: "School Supplies / Stationery" },
  { value: "Food & Kitchen", label: "Food & Kitchen" },
  { value: "Maintenance", label: "Maintenance & Repairs" },
  { value: "Transport", label: "Transport / Fuel" },
  { value: "Miscellaneous", label: "Miscellaneous" },
];

type ReportStatus = {
  status: string;
  isReopened: boolean;
  isLocked: boolean;
};

export function DailyExpensesPage() {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountUgx, setAmountUgx] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null);
  const [todayExpenses, setTodayExpenses] = useState<FinanceLedgerItem[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);

  // Fetch today's report status
  useEffect(() => {
    void fetchFinanceDashboard()
      .then((dash) => {
        const st = dash.today.reportStatus;
        const isReopened = dash.today.isReopened;
        const isLocked =
          st === "submitted" || st === "admin_review" || st === "closed";
        setReportStatus({ status: st, isReopened, isLocked: isLocked && !isReopened });
      })
      .catch(() => setReportStatus(null));
  }, []);

  // Fetch today's existing expenses
  const refreshExpenses = () => {
    void fetchFinanceLedger(ymd())
      .then((data) => {
        const expenses = data.items.filter((i) => i.type === "expense");
        setTodayExpenses(expenses);
        setTodayTotal(expenses.reduce((acc, e) => acc + e.amountUgx, 0));
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshExpenses();
  }, []);

  const submit = async () => {
    setError(null);
    setStatus(null);
    if (!description.trim()) {
      setError("Please provide a description for the expense.");
      return;
    }
    const amt = Math.max(Number(amountUgx) || 0, 0);
    if (amt <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (reportStatus?.isReopened && !changeReason.trim()) {
      setError("Please provide a reason for this change since the report was previously submitted.");
      return;
    }
    setSubmitting(true);
    try {
      await createDailyExpense({
        expenseDate: ymd(),
        category,
        description: description.trim(),
        paymentMethod,
        amountUgx: amt,
        changeReason: reportStatus?.isReopened ? changeReason.trim() : null,
      });
      setStatus("Expense entry saved successfully.");
      setDescription("");
      setAmountUgx("");
      setChangeReason("");
      refreshExpenses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const isLocked = reportStatus?.isLocked === true;
  const isReopened = reportStatus?.isReopened === true;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Left Side: Expense Form + List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Status Banners */}
        {isLocked && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              borderLeft: "5px solid #ef4444",
              padding: "16px 24px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: 15,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                flexShrink: 0,
              }}
            >
              🔒
            </div>
            <div>
              <h4 style={{ margin: 0, color: "#7f1d1d", fontSize: "0.95rem", fontWeight: 800 }}>
                EXPENDITURE LOCKED
              </h4>
              <p style={{ margin: "3px 0 0", color: "#991b1b", fontSize: "0.8rem" }}>
                Expenditure logging is disabled. Today's report has been submitted.
              </p>
            </div>
          </div>
        )}

        {isReopened && (
          <div
            style={{
              background: "rgba(139,92,246,0.08)",
              borderLeft: "5px solid #8b5cf6",
              padding: "16px 24px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: 15,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                background: "#ede9fe",
                color: "#7c3aed",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                flexShrink: 0,
              }}
            >
              🔓
            </div>
            <div>
              <h4 style={{ margin: 0, color: "#5b21b6", fontSize: "0.95rem", fontWeight: 800 }}>
                DATA ENTRY REOPENED
              </h4>
              <p style={{ margin: "3px 0 0", color: "#6d28d9", fontSize: "0.8rem" }}>
                An Administrator has unlocked today's entries for corrections.
              </p>
            </div>
          </div>
        )}

        {/* Record Expenditure Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Locked Overlay */}
          {isLocked && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(3px)",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: 20,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  background: "#fee2e2",
                  color: "#dc2626",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  marginBottom: 12,
                }}
              >
                🔒
              </div>
              <h4 style={{ color: "#991b1b", fontWeight: 800, marginBottom: 4 }}>Locked</h4>
              <p
                style={{
                  color: "#b91c1c",
                  fontSize: "0.8rem",
                  maxWidth: 200,
                  fontWeight: 500,
                }}
              >
                Expenditure logging is disabled for today.
              </p>
            </div>
          )}

          <h3
            style={{
              margin: "0 0 20px",
              color: "#0c2340",
              fontSize: "1.15rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            ➕ Record Expenditure
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 15 }}>
            <div>
              <label
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#64748b",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Amount (UGX) *
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontWeight: 800,
                    color: "#94a3b8",
                    fontSize: "0.8rem",
                  }}
                >
                  UGX
                </span>
                <input
                  type="number"
                  min="0"
                  value={amountUgx}
                  onChange={(e) => setAmountUgx(e.target.value)}
                  placeholder="0"
                  style={{
                    height: 45,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    padding: "0 12px 0 46px",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "#dc2626",
                    width: "100%",
                    boxSizing: "border-box",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0c2340")}
                  onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
                />
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#64748b",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  height: 45,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  padding: "0 12px",
                  fontSize: "0.9rem",
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#fff",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#64748b",
                display: "block",
                marginBottom: 6,
              }}
            >
              Description *
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief details about the expense..."
              style={{
                height: 45,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                padding: "0 12px",
                fontSize: "0.9rem",
                width: "100%",
                boxSizing: "border-box",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0c2340")}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
            />
          </div>

          <div style={{ marginBottom: 15 }}>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#64748b",
                display: "block",
                marginBottom: 6,
              }}
            >
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{
                height: 45,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                padding: "0 12px",
                fontSize: "0.9rem",
                width: "100%",
                boxSizing: "border-box",
                background: "#fff",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="Cash">Cash</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          {/* Reason for Change (only when reopened) */}
          {isReopened && (
            <div style={{ marginBottom: 15 }}>
              <label
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 6,
                }}
              >
                💬 Reason for Change *
              </label>
              <textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Reason for adding this after reopening..."
                style={{
                  height: 60,
                  borderRadius: 8,
                  border: "1px solid #8b5cf6",
                  padding: 10,
                  fontSize: "0.85rem",
                  width: "100%",
                  boxSizing: "border-box",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 15,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚠️</span>
              <p style={{ margin: 0, color: "#991b1b", fontSize: "0.85rem", fontWeight: 600 }}>
                {error}
              </p>
            </div>
          )}
          {status && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 15,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>✅</span>
              <p style={{ margin: 0, color: "#166534", fontSize: "0.85rem", fontWeight: 600 }}>
                {status}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || isLocked}
            style={{
              width: "100%",
              height: 45,
              borderRadius: 10,
              fontWeight: 700,
              border: "none",
              background: isLocked ? "#94a3b8" : "linear-gradient(135deg, #0c2340, #1a3a5c)",
              color: "#fff",
              fontSize: "0.9rem",
              cursor: submitting || isLocked ? "not-allowed" : "pointer",
              opacity: submitting || isLocked ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            💾 {submitting ? "Saving..." : "Save Expenditure"}
          </button>
        </div>

        {/* Today's Expenses List */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          }}
        >
          <h3
            style={{
              margin: "0 0 20px",
              color: "#0c2340",
              fontSize: "1.15rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            📋 Today's Recorded Expenses
          </h3>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      padding: "10px 16px",
                      textAlign: "right",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {todayExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#fafbfc")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontWeight: 600,
                        color: "#0c2340",
                        fontSize: "0.9rem",
                      }}
                    >
                      {exp.category}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#64748b" }}>
                      {exp.entity || "N/A"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#dc2626",
                        fontSize: "0.9rem",
                      }}
                    >
                      {formatCurrencyUGX(exp.amountUgx)}
                    </td>
                  </tr>
                ))}
                {todayExpenses.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: "30px 20px",
                        fontSize: "0.85rem",
                      }}
                    >
                      No expenses recorded yet today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Side: Daily Summary */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          border: "1px solid rgba(12,35,64,0.1)",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          position: "sticky",
          top: 20,
        }}
      >
        <h3
          style={{
            margin: "0 0 20px",
            color: "#0c2340",
            textAlign: "center",
            fontSize: "1.1rem",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          📊 Daily Expense Summary
        </h3>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 15,
            marginBottom: 25,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingBottom: 10,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <span style={{ color: "#64748b", fontSize: "0.9rem" }}>Entries Today</span>
            <span style={{ fontWeight: 700, color: "#1e293b" }}>{todayExpenses.length}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingBottom: 10,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <span style={{ color: "#64748b", fontSize: "0.9rem" }}>Total Expenditure</span>
            <span style={{ fontWeight: 700, color: "#dc2626" }}>
              {formatCurrencyUGX(todayTotal)}
            </span>
          </div>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 10, marginTop: 0 }}>
            Report Status:{" "}
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: "0.75rem",
                fontWeight: 700,
                background:
                  reportStatus?.status === "submitted" || reportStatus?.status === "closed"
                    ? "#dcfce7"
                    : "#fee2e2",
                color:
                  reportStatus?.status === "submitted" || reportStatus?.status === "closed"
                    ? "#166534"
                    : "#991b1b",
              }}
            >
              {(reportStatus?.status ?? "not_submitted").replace(/_/g, " ").toUpperCase()}
            </span>
          </p>
          {isReopened && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#7c3aed",
                fontWeight: 600,
                margin: "8px 0 0",
              }}
            >
              ⚠️ Entries reopened for correction
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
