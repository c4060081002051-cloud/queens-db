import { useEffect, useState } from "react";
import { fetchFinanceLedger } from "../../../api/financeLedger";
import { formatCurrencyUGX } from "../shared/financeFormat";
import type { FinanceLedgerPayload } from "../shared/financeTypes";

function ymd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DailyLedgerPage() {
  const [date, setDate] = useState(ymd());
  const [data, setData] = useState<FinanceLedgerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void fetchFinanceLedger(date)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <label className="text-xs font-bold uppercase text-[#6a7785]">
          Ledger Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="neo-inset-field mt-1 block rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <div className="rounded-lg bg-[#f3f7fc] px-3 py-2 text-xs text-[#5f728b]">
          Status: {data?.report?.status ?? "not_submitted"}
        </div>
      </div>
      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Income" value={formatCurrencyUGX(data?.summary.totalIncome ?? 0)} />
        <Metric label="Expenses" value={formatCurrencyUGX(data?.summary.totalExpenses ?? 0)} />
        <Metric label="Net" value={formatCurrencyUGX(data?.summary.netBalance ?? 0)} />
      </div>
      <div className="neo-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f5f8f5] text-xs uppercase text-[#6a9570]">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((item) => (
              <tr key={item.id} className="border-t border-[#edf1f5]">
                <td className="px-4 py-3">{item.type}</td>
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3">{item.entity}</td>
                <td className="px-4 py-3">{item.method}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrencyUGX(item.amountUgx)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="neo-card p-4">
      <p className="text-xs font-bold uppercase text-[#6a7785]">{label}</p>
      <p className="mt-2 text-xl font-black text-[#2f4054]">{value}</p>
    </div>
  );
}
