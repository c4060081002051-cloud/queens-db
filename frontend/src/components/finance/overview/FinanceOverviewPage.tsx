import { useEffect, useState } from "react";
import { fetchFinanceDashboard } from "../../../api/financeDashboard";
import { formatCurrencyUGX } from "../shared/financeFormat";
import { formatShortAgo } from "../../../utils/formatShortAgo";
import type { FinanceDashboardPayload } from "../shared/financeTypes";

export function FinanceOverviewPage() {
  const [data, setData] = useState<FinanceDashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchFinanceDashboard()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5a8faf] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {error ? (
        <div className="rounded-xl bg-red-50 p-4 border border-red-100">
          <p className="text-sm font-semibold text-[#b84040]">{error}</p>
        </div>
      ) : null}

      {/* Primary Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Fees Received Today"
          value={formatCurrencyUGX(data?.today.feesReceived ?? 0)}
          icon="💰"
          trend="Positive"
          color="blue"
        />
        <MetricCard
          label="Today's Expenses"
          value={formatCurrencyUGX(data?.today.expenses ?? 0)}
          icon="💸"
          trend="Neutral"
          color="orange"
        />
        <MetricCard
          label="Daily Net Balance"
          value={formatCurrencyUGX(data?.today.net ?? 0)}
          icon="📊"
          trend={ (data?.today.net ?? 0) >= 0 ? "Positive" : "Negative" }
          color={(data?.today.net ?? 0) >= 0 ? "green" : "red"}
        />
        <MetricCard
          label="Report Status"
          value={data?.today.reportStatus.replace("_", " ") ?? "Not Submitted"}
          icon="📄"
          color="purple"
          isStatus
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Summary & Arrears */}
        <div className="lg:col-span-1 space-y-6">
          <section className="neo-card p-6 bg-gradient-to-br from-[#ffffff] to-[#f8fbff]">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#636e72] mb-4">Monthly Summary ({data?.month.key})</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#636e72]">Total Income</span>
                  <span className="font-bold text-[#2d3436]">{formatCurrencyUGX(data?.month.totalIncome ?? 0)}</span>
                </div>
                <div className="h-2 bg-[#ebe4d9]/50 rounded-full overflow-hidden">
                  <div className="h-full bg-[#5a8faf] rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#636e72]">Total Expenses</span>
                  <span className="font-bold text-[#2d3436]">{formatCurrencyUGX(data?.month.totalExpenses ?? 0)}</span>
                </div>
                <div className="h-2 bg-[#ebe4d9]/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#e67e22] rounded-full" 
                    style={{ width: `${Math.min(((data?.month.totalExpenses ?? 0) / (data?.month.totalIncome || 1)) * 100, 100)}%` }} 
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-[#ebe4d9]/80 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-[#2d3436]">Net Profit</span>
                  <span className={`text-lg font-black ${ (data?.month.net ?? 0) >= 0 ? "text-[#27ae60]" : "text-[#c0392b]" }`}>
                    {formatCurrencyUGX(data?.month.net ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="neo-card p-6 border-t-4 border-[#e67e22]">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#636e72] mb-4">Payroll & Arrears</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#636e72]">Monthly Payroll</span>
                <span className="text-sm font-bold">{formatCurrencyUGX(data?.payroll.totalPayroll ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#636e72]">Paid to Date</span>
                <span className="text-sm font-bold text-[#27ae60]">{formatCurrencyUGX(data?.payroll.paidToDate ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#ebe4d9]/50">
                <span className="text-sm font-bold text-[#2d3436]">Unpaid Arrears</span>
                <span className="text-lg font-black text-[#c0392b]">{formatCurrencyUGX(data?.payroll.arrears ?? 0)}</span>
              </div>
            </div>
          </section>

          <section className="neo-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#636e72] mb-4">Income by Method</h3>
            <div className="space-y-3">
              {(data?.month.methodBreakdown ?? []).map((mb) => (
                <div key={mb.method} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-[#636e72]">{mb.method}</span>
                      <span className="text-[#2d3436] font-bold">{formatCurrencyUGX(mb.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-[#ebe4d9]/30 rounded-full">
                      <div 
                        className="h-full bg-[#5a8faf]/70 rounded-full" 
                        style={{ width: `${(mb.amount / (data?.month.totalIncome || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!data?.month.methodBreakdown || data.month.methodBreakdown.length === 0) && (
                <p className="text-xs text-[#636e72] italic text-center py-2">No income recorded this month</p>
              )}
            </div>
          </section>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <section className="neo-card h-full flex flex-col overflow-hidden p-0">
            <header className="px-6 py-4 border-b border-[#ebe4d9]/80 bg-gradient-to-r from-[#faf7f0] to-white flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#2d3436]">Recent Financial Activities</h3>
              <span className="text-[10px] bg-[#5a8faf]/10 text-[#5a8faf] px-2 py-0.5 rounded-full font-bold uppercase">Live Sync</span>
            </header>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfbf9] text-[10px] font-bold uppercase tracking-wider text-[#636e72]">
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Reference/Entity</th>
                    <th className="px-6 py-3">Method</th>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebe4d9]/50">
                  {data?.recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#f8fbff] transition-colors group">
                      <td className="px-6 py-4">
                        <span className={`inline-flex h-2 w-2 rounded-full mr-2 ${tx.type === "income" ? "bg-[#27ae60]" : "bg-[#e67e22]"}`} />
                        <span className="text-[10px] font-bold uppercase text-[#636e72]">{tx.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-[#2d3436] truncate max-w-[180px]">{tx.label}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-[#636e72]">{tx.method}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#636e72]">
                        {formatShortAgo(tx.date)}
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-black ${tx.type === "income" ? "text-[#27ae60]" : "text-[#e67e22]"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrencyUGX(tx.amount)}
                      </td>
                    </tr>
                  ))}
                  {(!data?.recentTransactions || data.recentTransactions.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#636e72] italic">
                        No recent transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="px-6 py-3 bg-[#fcfbf9] border-t border-[#ebe4d9]/80 text-center">
              <button className="text-[10px] font-bold uppercase tracking-widest text-[#5a8faf] hover:underline transition">View Full Ledger</button>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  icon, 
  trend, 
  color,
  isStatus = false 
}: { 
  label: string; 
  value: string; 
  icon: string;
  trend?: "Positive" | "Negative" | "Neutral";
  color: "blue" | "orange" | "green" | "red" | "purple";
  isStatus?: boolean;
}) {
  const colorMap = {
    blue: "border-[#5a8faf] bg-blue-50/30",
    orange: "border-[#e67e22] bg-orange-50/30",
    green: "border-[#27ae60] bg-green-50/30",
    red: "border-[#c0392b] bg-red-50/30",
    purple: "border-[#8e44ad] bg-purple-50/30",
  };

  return (
    <div className={`neo-card border-t-4 ${colorMap[color]} p-5 relative overflow-hidden group hover:translate-y-[-2px] transition-all`}>
      <div className="absolute top-[-10px] right-[-10px] opacity-[0.05] text-6xl group-hover:scale-110 transition-transform grayscale">
        {icon}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg" role="img" aria-label={label}>{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#636e72]">{label}</p>
      </div>
      <p className={`text-xl font-black ${isStatus ? "text-[#2d3436]" : "text-[#2f4054]"}`}>{value}</p>
      
      {trend && (
        <div className="mt-2 flex items-center gap-1.5 overflow-hidden">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
            trend === "Positive" ? "bg-green-100 text-green-700" : 
            trend === "Negative" ? "bg-red-100 text-red-700" : 
            "bg-gray-100 text-gray-700"
          }`}>
            {trend}
          </span>
          <div className="flex-1 h-[1px] bg-[#ebe4d9]/50" />
        </div>
      )}
    </div>
  );
}
