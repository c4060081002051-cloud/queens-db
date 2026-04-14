import { useEffect, useState } from "react";
import { fetchFinanceDashboard } from "../../../api/financeDashboard";
import { formatCurrencyUGX } from "../shared/financeFormat";

export function PayrollSummaryPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [totals, setTotals] = useState({ totalPayroll: 0, paidToDate: 0, arrears: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchFinanceDashboard(month)
      .then((res) => {
        if (!cancelled) setTotals(res.payroll);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load payroll");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const paidPercent =
    totals.totalPayroll > 0
      ? Math.round((totals.paidToDate / totals.totalPayroll) * 100)
      : 0;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Month Selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 15,
          marginBottom: 28,
          background: "#fff",
          padding: "14px 20px",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <span style={{ fontWeight: 600, color: "#64748b", fontSize: "0.9rem" }}>
          📅 Payroll Month:
        </span>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            height: 42,
            borderRadius: 8,
            border: "2px solid #e2e8f0",
            padding: "0 14px",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "#1e293b",
            outline: "none",
            cursor: "pointer",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#0c2340")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        />
        <span
          style={{
            marginLeft: "auto",
            background: "rgba(12,35,64,0.06)",
            color: "#0c2340",
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: "0.8rem",
            fontWeight: 700,
          }}
        >
          Viewing: {month}
        </span>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>⚠️</span>
          <p style={{ margin: 0, color: "#991b1b", fontSize: "0.85rem", fontWeight: 600 }}>
            {error}
          </p>
        </div>
      )}

      {/* Payroll Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 30 }}>
        {/* Total Payroll */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            borderLeft: "5px solid #64748b",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#7f8c8d",
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              TOTAL PAYROLL (MONTHLY)
            </p>
            <h2
              style={{
                margin: "5px 0 0",
                fontSize: "1.8rem",
                fontWeight: 800,
                color: "#1e293b",
              }}
            >
              {loading ? "—" : formatCurrencyUGX(totals.totalPayroll)}
            </h2>
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              background: "rgba(100,116,139,0.1)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
            }}
          >
            🧮
          </div>
        </div>

        {/* Paid To Date */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            borderLeft: "5px solid #22c55e",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#7f8c8d",
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              PAID TO DATE
            </p>
            <h2
              style={{
                margin: "5px 0 0",
                fontSize: "1.8rem",
                fontWeight: 800,
                color: "#166534",
              }}
            >
              {loading ? "—" : formatCurrencyUGX(totals.paidToDate)}
            </h2>
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              background: "rgba(34,197,94,0.1)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
            }}
          >
            💸
          </div>
        </div>

        {/* Outstanding Arrears */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            borderLeft: "5px solid #f59e0b",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#7f8c8d",
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              OUTSTANDING ARREARS
            </p>
            <h2
              style={{
                margin: "5px 0 0",
                fontSize: "1.8rem",
                fontWeight: 800,
                color: "#92400e",
              }}
            >
              {loading ? "—" : formatCurrencyUGX(totals.arrears)}
            </h2>
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              background: "rgba(245,158,11,0.1)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
            }}
          >
            ⚠️
          </div>
        </div>
      </div>

      {/* Payment Progress */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 28,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3
            style={{
              margin: 0,
              color: "#0c2340",
              fontSize: "1.1rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            📊 Payment Progress
          </h3>
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: paidPercent >= 100 ? "#059669" : paidPercent >= 50 ? "#d97706" : "#dc2626",
            }}
          >
            {loading ? "—" : `${paidPercent}%`} Disbursed
          </span>
        </div>

        <div
          style={{
            height: 16,
            background: "#f1f5f9",
            borderRadius: 100,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              height: "100%",
              width: loading ? "0%" : `${Math.min(paidPercent, 100)}%`,
              background:
                paidPercent >= 100
                  ? "linear-gradient(135deg, #059669, #10b981)"
                  : paidPercent >= 50
                    ? "linear-gradient(135deg, #d97706, #f59e0b)"
                    : "linear-gradient(135deg, #dc2626, #ef4444)",
              borderRadius: 100,
              transition: "width 0.8s ease-out",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          <div
            style={{
              padding: "14px 16px",
              background: "#f8fafc",
              borderRadius: 12,
              borderLeft: "3px solid #64748b",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Budget Liability
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>
              {loading ? "—" : formatCurrencyUGX(totals.totalPayroll)}
            </p>
          </div>
          <div
            style={{
              padding: "14px 16px",
              background: "#f0fdf4",
              borderRadius: 12,
              borderLeft: "3px solid #22c55e",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#166534",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Amount Disbursed
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "1.1rem", fontWeight: 800, color: "#059669" }}>
              {loading ? "—" : formatCurrencyUGX(totals.paidToDate)}
            </p>
          </div>
          <div
            style={{
              padding: "14px 16px",
              background: "#fffbeb",
              borderRadius: 12,
              borderLeft: "3px solid #f59e0b",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#92400e",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Remaining Balance
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "1.1rem", fontWeight: 800, color: "#d97706" }}>
              {loading ? "—" : formatCurrencyUGX(totals.arrears)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
