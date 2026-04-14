import { useEffect, useMemo, useState } from "react";
import { fetchDebtorsReport } from "../../api/financeDebtors";
import { formatCurrencyUGX } from "./shared/financeFormat";
import type { DebtorsPayload } from "./shared/financeTypes";

export function DebtorsReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<DebtorsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchDebtorsReport()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load report");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q),
    );
  }, [data, searchTerm]);

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5a8faf] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header Summary Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[#636e72] opacity-70">Accounting Period</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-[#2d3436]">{data?.term || "Current Term"}</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">ACTIVE</span>
          </div>
        </div>
        
        <div className="neo-card-elevated border-l-4 border-[#dc2626] bg-gradient-to-br from-[#fef2f2] to-[#fee2e2] px-6 py-4 text-right shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#991b1b]">Total Outstanding Debt</p>
          <p className="mt-1 text-2xl font-black text-[#dc2626]">
            {formatCurrencyUGX(data?.totalOutstanding ?? 0)}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 p-4 border border-red-100">
          <p className="text-sm font-semibold text-[#b84040]">{error}</p>
        </div>
      ) : null}

      <div className="neo-card overflow-hidden p-0 shadow-xl">
        {/* Search Bar Header */}
        <div className="flex flex-col gap-4 border-b border-[#ebe4d9]/80 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#2d3436]">Debtors List</h2>
          <div className="relative w-full sm:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Filter by name, admission no, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neo-inset-field w-full rounded-xl pl-10 pr-4 py-2 text-sm text-[#2d3436] focus:ring-2 focus:ring-[#5a8faf]/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#fcfbf9] text-[10px] font-bold uppercase tracking-wider text-[#636e72]">
              <tr>
                <th className="px-6 py-4">ADMISSION NO.</th>
                <th className="px-6 py-4">STUDENT NAME</th>
                <th className="px-6 py-3 text-center">CLASS</th>
                <th className="px-6 py-3 text-right">TOTAL FEES</th>
                <th className="px-6 py-3 text-right">AMOUNT PAID</th>
                <th className="px-6 py-3 text-right">BALANCE DUE</th>
                <th className="px-6 py-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]/50">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-[#f8fbff] transition-colors group">
                  <td className="px-6 py-4 text-xs font-bold text-[#5a8faf]">
                    {d.admissionNumber}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-[#2d3436] tracking-tight">{d.fullName}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="rounded-lg bg-gray-50 px-2 py-1 text-[11px] font-bold text-[#636e72] border border-gray-100">
                      {d.className}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-semibold text-[#636e72]">
                    {formatCurrencyUGX(d.totalFees)}
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-bold text-[#27ae60]">
                    {formatCurrencyUGX(d.totalPaid)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-black text-[#dc2626]">
                    {formatCurrencyUGX(d.balance)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="rounded-xl border border-[#ebe4d9] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#5a8faf] transition hover:bg-[#5a8faf] hover:text-white">
                      Profile
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f0fdf4] text-4xl shadow-sm mb-4">
                      ✅
                    </div>
                    <h3 className="text-lg font-black text-[#166534]">All Clear!</h3>
                    <p className="mt-1 text-sm text-[#3f4f67] opacity-70">No students have outstanding balances for this term.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
