import { useEffect, useState } from "react";
import { fetchFinanceLedger, submitDailyReport } from "../../../api/financeLedger";
import {
  fetchAuthorizedReportUsers,
  requestDailyReportSubmission,
  type AuthorizedReportUser,
} from "../../../api/financeReports";
import { formatCurrencyUGX } from "../shared/financeFormat";
import type { FinanceLedgerPayload } from "../shared/financeTypes";

function ymd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function adjustDay(dateStr: string, offset: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offset);
  return ymd(d);
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "--:--";
  }
}

export function DailyLedgerPage({
  initialDate,
  canViewPastRecords = true,
  isAdmin = false,
}: {
  initialDate?: string;
  canViewPastRecords?: boolean;
  isAdmin?: boolean;
}) {
  const today = ymd();
  const [date, setDate] = useState(initialDate || today);

  const [data, setData] = useState<FinanceLedgerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedReportUser[]>([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requestForUserId, setRequestForUserId] = useState<number | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const loadData = (targetDate: string) => {
    setLoading(true);
    setError(null);
    void fetchFinanceLedger(targetDate)
      .then((next) => {
        setData(next);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!canViewPastRecords && date < today) {
      setDate(today);
    }
  }, [canViewPastRecords, date, today]);

  useEffect(() => {
    loadData(date);
  }, [date]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    void fetchAuthorizedReportUsers()
      .then((rows) => {
        if (!cancelled) {
          setAuthorizedUsers(rows);
          setRequestForUserId((prev) => prev ?? rows[0]?.id ?? null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setRequestError(e instanceof Error ? e.message : "Failed to load authorized users");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const onHandIn = async () => {
    if (
      !confirm(
        "Warning: Handing in this daily ledger will lock today's transactions and send it to admin review. Continue?",
      )
    )
      return;
    try {
      setActionLoading(true);
      await submitDailyReport(date);
      loadData(date);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to submit report");
    } finally {
      setActionLoading(false);
    }
  };

  const openRequestModal = () => {
    setRequestError(null);
    setRequestReason("");
    setRequestForUserId(authorizedUsers[0]?.id ?? null);
    setRequestModalOpen(true);
  };

  const onRequestReport = async () => {
    if (!requestForUserId) {
      setRequestError("Select an authorized user.");
      return;
    }
    if (!requestReason.trim()) {
      setRequestError("Provide a reason for requesting this report.");
      return;
    }
    try {
      setActionLoading(true);
      setRequestError(null);
      await requestDailyReportSubmission(date, requestReason.trim(), requestForUserId);
      setRequestModalOpen(false);
      loadData(date);
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : "Failed to request report");
    } finally {
      setActionLoading(false);
    }
  };

  const incomeItems = (data?.items ?? []).filter((x) => x.type === "income");
  const expenseItems = (data?.items ?? []).filter((x) => x.type === "expense");

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5a8faf] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header & Date Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDate(adjustDay(date, -1))}
            disabled={!canViewPastRecords}
            className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-[#ebe4d9] transition hover:bg-[#f8fbff]"
            title="Previous Day"
          >
            <svg className="h-5 w-5 text-[#636e72]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="relative group">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (!canViewPastRecords && e.target.value < today) {
                  setDate(today);
                  return;
                }
                setDate(e.target.value);
              }}
              className="neo-inset-field min-w-[180px] rounded-xl px-4 py-2.5 text-center text-sm font-bold text-[#2d3436] focus:ring-2 focus:ring-[#5a8faf]/50"
              max={today}
              min={canViewPastRecords ? undefined : today}
            />
          </div>
          <button
            onClick={() => setDate(adjustDay(date, 1))}
            disabled={date >= today}
            className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-[#ebe4d9] transition enabled:hover:bg-[#f8fbff] disabled:opacity-30"
            title="Next Day"
          >
            <svg className="h-5 w-5 text-[#636e72]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
           <span className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${
             date === today ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-gray-50 text-gray-600 ring-1 ring-gray-200"
           }`}>
             {date === today ? "Today" : "Historical"}
           </span>
        </div>
      </div>

      {/* Status Banner */}
      <StatusBanner 
        report={data?.report ?? null} 
        onHandIn={onHandIn} 
        isActionLoading={actionLoading}
        isAdmin={isAdmin}
        onRequestReport={openRequestModal}
      />
      {!data?.report || data.report.status === "not_submitted" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">
            Warning: Once handed in, this report is locked for edits and forwarded to admin.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-red-50 p-4 border border-red-100">
          <p className="text-sm font-semibold text-[#b84040]">{error}</p>
        </div>
      ) : null}
      {!canViewPastRecords ? (
        <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
          <p className="text-xs font-semibold text-amber-800">
            You can view only today's ledger records.
          </p>
        </div>
      ) : null}

      {/* Summary Metrics */}
      <div className="grid gap-6 sm:grid-cols-3">
        <SummaryCard 
          label="Cash Inflows (Fees)" 
          value={data?.summary.totalIncome ?? 0} 
          icon="💰" 
          color="green" 
          count={incomeItems.length}
        />
        <SummaryCard 
          label="Cash Outflows (Expenses)" 
          value={data?.summary.totalExpenses ?? 0} 
          icon="🛒" 
          color="red" 
          count={expenseItems.length}
        />
        <SummaryCard 
          label="Net Cash Balance" 
          value={data?.summary.netBalance ?? 0} 
          icon="⚖️" 
          color="blue" 
        />
      </div>

      {/* Ledger Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Panel */}
        <section className="neo-card flex flex-col overflow-hidden p-0 border-t-4 border-[#27ae60]">
          <header className="px-6 py-4 border-b border-[#ebe4d9]/80 flex justify-between items-center bg-white">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#059669]">Payment Receipts</h3>
            <span className="text-xs bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded-full font-bold">{incomeItems.length}</span>
          </header>
          <div className="flex-1 overflow-auto max-h-[500px]">
            {incomeItems.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#fcfbf9] text-[10px] font-bold uppercase tracking-wider text-[#636e72] sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Term / Method</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebe4d9]/50">
                  {incomeItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#f8fbff] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-[#2d3436]">{item.entity}</div>
                        <div className="text-[10px] text-[#636e72]">{item.receiptNo || "NO RECEIPT"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-[#2d3436] font-semibold">{item.term || "T-N/A"}</div>
                        <div className="text-[10px] text-[#94a3b8]">{item.method}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-black text-[#27ae60]">
                        {formatCurrencyUGX(item.amountUgx)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState icon="🧾" message="No fee payments collected on this date" />
            )}
          </div>
        </section>

        {/* Expense Panel */}
        <section className="neo-card flex flex-col overflow-hidden p-0 border-t-4 border-[#c0392b]">
          <header className="px-6 py-4 border-b border-[#ebe4d9]/80 flex justify-between items-center bg-white">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#dc2626]">Expenditures</h3>
            <span className="text-xs bg-[#fef2f2] text-[#dc2626] px-2 py-0.5 rounded-full font-bold">{expenseItems.length}</span>
          </header>
          <div className="flex-1 overflow-auto max-h-[500px]">
            {expenseItems.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#fcfbf9] text-[10px] font-bold uppercase tracking-wider text-[#636e72] sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3">Category / Desc</th>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebe4d9]/50">
                  {expenseItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#f8fbff] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-[#2d3436]">{item.category}</div>
                        <div className="text-[10px] text-[#636e72] truncate max-w-[150px]">{item.entity}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#636e72]">
                        {formatTime(item.at)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-black text-[#dc2626]">
                        {formatCurrencyUGX(item.amountUgx)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState icon="🛒" message="No expenditures recorded on this date" />
            )}
          </div>
        </section>
      </div>
      {requestModalOpen ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#2d3436]/40 backdrop-blur-[2px]"
            onClick={() => setRequestModalOpen(false)}
            aria-label="Close request report dialog"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[#e8e2d8] bg-[#fffcf7] p-5 shadow-[8px_12px_40px_rgba(45,52,54,0.2)]">
            <h3 className="text-base font-bold text-[#2d3436]">Request Daily Report</h3>
            <p className="mt-1 text-xs text-[#636e72]">
              Admin users cannot hand in reports directly. Assign an authorized user to submit this report.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#636e72]">
                  Authorized User
                </label>
                <select
                  value={requestForUserId ?? ""}
                  onChange={(e) => setRequestForUserId(Number(e.target.value) || null)}
                  className="neo-inset-field w-full rounded-xl px-3 py-2 text-sm text-[#2d3436]"
                >
                  <option value="">Select user</option>
                  {authorizedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#636e72]">
                  Reason
                </label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  rows={4}
                  placeholder="Explain why this report is being requested."
                  className="neo-inset-field w-full rounded-xl px-3 py-2 text-sm text-[#2d3436]"
                />
              </div>
              {requestError ? (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-[#b84040]">
                  {requestError}
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="rounded-full bg-[#faf7f0] px-4 py-1.5 text-xs font-semibold text-[#636e72] ring-1 ring-[#ebe4d9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onRequestReport()}
                disabled={actionLoading}
                className="rounded-full bg-[#2d3436] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {actionLoading ? "Requesting..." : "Request Report"}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, icon, color, count }: { label: string; value: number; icon: string; color: "green" | "red" | "blue"; count?: number }) {
  const colors = {
    green: "border-[#059669] bg-green-50/20 text-[#059669]",
    red: "border-[#dc2626] bg-red-50/20 text-[#dc2626]",
    blue: "border-[#5a8faf] bg-blue-50/20 text-[#2f4054]",
  };

  return (
    <div className={`neo-card border-b-4 ${colors[color]} p-6 relative overflow-hidden group hover:translate-y-[-2px] transition-all`}>
      <div className="absolute top-[-10px] right-[-10px] opacity-[0.05] text-6xl rotate-12">{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#636e72] mb-3 flex items-center gap-2">
        <span className="text-base" role="img" aria-label={label}>{icon}</span>
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black">{formatCurrencyUGX(value)}</span>
      </div>
      {typeof count === "number" && (
        <p className="mt-4 text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide">
          {count} Transactions
        </p>
      )}
    </div>
  );
}

function StatusBanner({ 
  report, 
  onHandIn, 
  isActionLoading,
  isAdmin,
  onRequestReport,
}: { 
  report: FinanceLedgerPayload["report"];
  onHandIn: () => void;
  isActionLoading: boolean;
  isAdmin: boolean;
  onRequestReport: () => void;
}) {
  if (!report || report.status === "not_submitted") {
    return (
      <div className="status-banner bg-[#fef3c7] text-[#92400e] border border-[#f59e0b]/30 rounded-2xl p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/50 shadow-sm">
          <span className="text-xl">⏳</span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider">Report Status: PENDING</p>
          <p className="text-[11px] opacity-80">
            {isAdmin
              ? "Admin users cannot hand in reports. Request submission from an authorized user."
              : report?.isReopened
              ? "This report was reopened by admin. You can now edit entries and hand it in again."
              : "No report submitted for this date yet. Ledger is currently open for entries."}
          </p>
        </div>
        <button 
          onClick={isAdmin ? onRequestReport : onHandIn}
          disabled={isActionLoading}
          className="bg-[#92400e] text-white px-4 py-1.5 rounded-xl text-xs font-bold transition hover:brightness-110 disabled:opacity-50"
        >
          {isActionLoading ? "..." : isAdmin ? "Request Report" : "Hand in Report"}
        </button>
      </div>
    );
  }

  const configs = {
    not_submitted: { icon: "⏳", color: "bg-[#fef3c7] text-[#92400e] border-[#f59e0b]/30", label: "PENDING" },
    submitted: { icon: "🔒", color: "bg-[#fffbeb] text-[#d97706] border-[#fbbf24]/30", label: "SUBMITTED" },
    admin_review: { icon: "🔍", color: "bg-[#eff6ff] text-[#1e40af] border-[#3b82f6]/30", label: "ADMIN REVIEW" },
    closed: { icon: "✅", color: "bg-[#f0fdf4] text-[#166534] border-[#22c55e]/30", label: "CLOSED & SEALED" },
  };

  const config = configs[report.status as keyof typeof configs] || configs.not_submitted;

  return (
    <div className={`status-banner ${config.color} border rounded-2xl p-4 flex items-center gap-3`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/50 shadow-sm">
        <span className="text-xl">{config.icon}</span>
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wider">Report Status: {config.label}</p>
        <p className="text-[11px] opacity-80">
          {report.status === "closed" ? "Report permanently sealed. No further edits possible." : "Report data is locked or under review."}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <span className="text-4xl mb-4 opacity-30">{icon}</span>
      <p className="text-sm text-[#94a3b8] font-medium">{message}</p>
    </div>
  );
}
