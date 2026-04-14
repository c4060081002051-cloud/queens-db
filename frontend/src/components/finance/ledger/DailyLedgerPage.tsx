import { useEffect, useState } from "react";
import { fetchFinanceLedger, submitDailyReport } from "../../../api/financeLedger";
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

export function DailyLedgerPage({ initialDate }: { initialDate?: string }) {
  const today = ymd();
  const [date, setDate] = useState(initialDate || today);

  const [data, setData] = useState<FinanceLedgerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
    loadData(date);
  }, [date]);

  const onHandIn = async () => {
    if (!confirm("Hand in today's report? This will lock today's transactions.")) return;
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
              onChange={(e) => setDate(e.target.value)}
              className="neo-inset-field min-w-[180px] rounded-xl px-4 py-2.5 text-center text-sm font-bold text-[#2d3436] focus:ring-2 focus:ring-[#5a8faf]/50"
              max={today}
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
      />

      {error ? (
        <div className="rounded-xl bg-red-50 p-4 border border-red-100">
          <p className="text-sm font-semibold text-[#b84040]">{error}</p>
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
  isActionLoading 
}: { 
  report: FinanceLedgerPayload["report"];
  onHandIn: () => void;
  isActionLoading: boolean;
}) {
  if (!report) {
    return (
      <div className="status-banner bg-[#fef3c7] text-[#92400e] border border-[#f59e0b]/30 rounded-2xl p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/50 shadow-sm">
          <span className="text-xl">⏳</span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider">Report Status: PENDING</p>
          <p className="text-[11px] opacity-80">No report submitted for this date yet. Ledger is currently open for entries.</p>
        </div>
        <button 
          onClick={onHandIn}
          disabled={isActionLoading}
          className="bg-[#92400e] text-white px-4 py-1.5 rounded-xl text-xs font-bold transition hover:brightness-110 disabled:opacity-50"
        >
          {isActionLoading ? "..." : "Hand in Report"}
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
