import { useEffect, useState } from "react";
import { fetchFinanceDashboard } from "../../../api/financeDashboard";
import { formatCurrencyUGX } from "../shared/financeFormat";

export function PayrollSummaryPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [totals, setTotals] = useState({ totalPayroll: 0, paidToDate: 0, arrears: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchFinanceDashboard(month)
      .then((res) => {
        if (!cancelled) setTotals(res.payroll);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load payroll");
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <div className="space-y-4">
      <label className="text-xs font-bold uppercase text-[#6a7785]">
        Payroll Month
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="neo-inset-field mt-1 block rounded-lg px-3 py-2 text-sm" />
      </label>
      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Total Payroll" value={formatCurrencyUGX(totals.totalPayroll)} />
        <Card label="Paid To Date" value={formatCurrencyUGX(totals.paidToDate)} />
        <Card label="Arrears" value={formatCurrencyUGX(totals.arrears)} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="neo-card p-4">
      <p className="text-xs font-bold uppercase text-[#6a7785]">{label}</p>
      <p className="mt-2 text-xl font-black text-[#2f4054]">{value}</p>
    </div>
  );
}
