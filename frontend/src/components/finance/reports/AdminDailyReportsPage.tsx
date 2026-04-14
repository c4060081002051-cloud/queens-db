import { useEffect, useState } from "react";
import {
  closeDailyReport,
  fetchDailyFinanceReports,
  reopenDailyReport,
  submitDailyReport,
  takeReportForReview,
} from "../../../api/financeReports";
import { formatCurrencyUGX } from "../shared/financeFormat";
import type { FinanceReportRow } from "../shared/financeTypes";

function ymd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AdminDailyReportsPage() {
  const [rows, setRows] = useState<FinanceReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetchDailyFinanceReports(45)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load reports"));

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void submitDailyReport(ymd()).then(load)}
          className="rounded-lg bg-[#1f8f59] px-4 py-2 text-sm font-semibold text-white"
        >
          Submit Today
        </button>
      </div>
      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}
      <div className="neo-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f5f8f5] text-xs uppercase text-[#6a9570]">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Earnings</th>
              <th className="px-4 py-3">Expenditure</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#edf1f5]">
                <td className="px-4 py-3">{row.reportDate}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">{formatCurrencyUGX(row.totalEarnings)}</td>
                <td className="px-4 py-3">{formatCurrencyUGX(row.totalExpenditure)}</td>
                <td className="px-4 py-3">{formatCurrencyUGX(row.netTotal)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void takeReportForReview(row.id).then(load)}
                      className="rounded bg-[#4c46df] px-2 py-1 text-xs font-semibold text-white"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      onClick={() => void closeDailyReport(row.id, "Closed after review").then(load)}
                      className="rounded bg-[#1f8f59] px-2 py-1 text-xs font-semibold text-white"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => void reopenDailyReport(row.id, "Reopened for correction").then(load)}
                      className="rounded bg-[#b45309] px-2 py-1 text-xs font-semibold text-white"
                    >
                      Reopen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
