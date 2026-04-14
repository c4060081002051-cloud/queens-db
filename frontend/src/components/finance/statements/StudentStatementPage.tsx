import { formatCurrencyUGX, formatYmdToLabel } from "../shared/financeFormat";
import type { StudentStatementPayload } from "../shared/financeTypes";

export function StudentStatementPage({ statement }: { statement: StudentStatementPayload }) {
  return (
    <section className="neo-card relative mx-auto max-w-5xl overflow-hidden border border-[#d8e0e7] bg-white p-6 sm:p-8 print:shadow-none">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <p className="select-none text-[6rem] font-bold tracking-widest text-[#2d3436]/5 [transform:rotate(-35deg)]">
          STUDENT STATEMENT
        </p>
      </div>
      <header className="relative z-10 border-b border-[#e5eaef] pb-4">
        <h2 className="text-2xl font-bold text-[#2f4054]">Student Account Statement</h2>
        <p className="mt-1 text-sm text-[#3f4f67]">
          {statement.student.fullName} ({statement.student.admissionNumber}) - {statement.term}
        </p>
      </header>

      <div className="relative z-10 mt-5 grid gap-4 sm:grid-cols-4">
        <SummaryCard label="Assigned Fees" value={formatCurrencyUGX(statement.assignedAmount)} />
        <SummaryCard label="Total Paid" value={formatCurrencyUGX(statement.totalPaid)} />
        <SummaryCard label="Outstanding" value={formatCurrencyUGX(statement.outstandingAmount)} />
        <SummaryCard label="Credit" value={formatCurrencyUGX(statement.creditAmount)} />
      </div>

      <div className="relative z-10 mt-6 overflow-hidden rounded-xl border border-[#dde5ef]">
        <table className="w-full text-left text-sm text-[#3f4f67]">
          <thead className="bg-[#f3f7fc] text-xs uppercase tracking-wide text-[#62758b]">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Paid By</th>
              <th className="px-4 py-3 text-right">Amount Paid</th>
              <th className="px-4 py-3 text-right">Running Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf1f5]">
            {statement.transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="px-4 py-3">{formatYmdToLabel(String(tx.date).slice(0, 10))}</td>
                <td className="px-4 py-3">{tx.receiptNo}</td>
                <td className="px-4 py-3">{tx.method}</td>
                <td className="px-4 py-3">{tx.paidBy}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#1f8f59]">
                  {formatCurrencyUGX(tx.amountPaid)}
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrencyUGX(tx.runningBalance)}</td>
              </tr>
            ))}
            {statement.transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#6a7785]">
                  No transactions for this term.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dbe4ee] bg-[#f8fbff] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#6a7785]">{label}</p>
      <p className="mt-2 text-lg font-black text-[#2f4054]">{value}</p>
    </div>
  );
}
