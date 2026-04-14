import { useEffect, useState } from "react";
import { fetchFinanceDashboard } from "../../../api/financeDashboard";
import { formatCurrencyUGX } from "../shared/financeFormat";
import type { FinanceDashboardPayload } from "../shared/financeTypes";

export function FinanceOverviewPage() {
  const [data, setData] = useState<FinanceDashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchFinanceDashboard()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Today Fees Received" value={formatCurrencyUGX(data?.today.feesReceived ?? 0)} />
        <Card label="Today Expenses" value={formatCurrencyUGX(data?.today.expenses ?? 0)} />
        <Card label="Today Net" value={formatCurrencyUGX(data?.today.net ?? 0)} />
        <Card label="Daily Report Status" value={data?.today.reportStatus ?? "Loading..."} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card label={`Income (${data?.month.key ?? "month"})`} value={formatCurrencyUGX(data?.month.totalIncome ?? 0)} />
        <Card label="Payroll Total" value={formatCurrencyUGX(data?.payroll.totalPayroll ?? 0)} />
        <Card label="Payroll Arrears" value={formatCurrencyUGX(data?.payroll.arrears ?? 0)} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="neo-card border-l-4 border-[#5a8faf] p-4">
      <p className="text-xs font-bold uppercase text-[#6a7785]">{label}</p>
      <p className="mt-2 text-xl font-black text-[#2f4054]">{value}</p>
    </div>
  );
}
