import { formatCurrencyUGX, formatReceiptDate } from "../shared/financeFormat";
import type { StudentPaymentReceipt } from "../shared/financeTypes";
import { useTheme } from "../../../theme/ThemeProvider";

export function StudentReceiptPage({ receipt }: { receipt: StudentPaymentReceipt }) {
  const { resolvedTheme } = useTheme();
  const isDarkUi = resolvedTheme === "dark" || resolvedTheme === "tinted-dark";

  return (
    <section className={`relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] border p-8 shadow-2xl transition-all sm:p-12 print:shadow-none print:border-slate-200 print:rounded-none ${isDarkUi ? "bg-slate-900 border-slate-700 shadow-slate-950/50" : "bg-white border-slate-100 shadow-slate-200/50"
      }`}>
      {/* Premium Watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] print:opacity-[0.05]">
        <div className="flex flex-col items-center">
          <span className="text-[10rem] font-black tracking-tighter [transform:rotate(-25deg)]">QUEENS</span>
          <span className="text-[4rem] font-black uppercase tracking-[2em] mt-[-2rem] [transform:rotate(-25deg)]">OFFICIAL</span>
        </div>
      </div>

      <div className="relative z-10">
        {/* Document Header */}
        <header className="flex flex-col sm:flex-row items-start justify-between gap-8 border-b pb-10 border-dashed border-slate-200">
          <div className="flex items-center gap-6">
            <div className={`h-24 w-24 shrink-0 overflow-hidden rounded-3xl border p-2 shadow-sm ${isDarkUi ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
              <img src="/school-badge-v2.png" alt="School Badge" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className={`text-2xl font-black tracking-tight leading-none ${isDarkUi ? "text-white" : "text-[#0c2340]"}`}>
                QUEENS NURSERY & PRIMARY SCHOOL
              </h1>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-teal-600">Official Payment Receipt</p>
              <div className="mt-4 space-y-1 text-[11px] font-medium text-slate-500">
                <p>Kitebi Star, After Trading Centre, Kampala</p>
                <p>P.O. BOX 9107 | queensprimaryschool13@gmail.com</p>
                <p>+256 782 333 908 · +256 750 775 572</p>
              </div>
            </div>
          </div>

          <div className="text-right sm:w-48">
            <div className={`inline-block rounded-2xl px-5 py-3 border-2 ${isDarkUi ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receipt No.</p>
              <p className={`text-xl font-black tabular-nums ${isDarkUi ? "text-teal-400" : "text-teal-700"}`}>#{receipt.receiptNo}</p>
            </div>
            <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Issued: {formatReceiptDate(receipt.issuedAt)}
            </p>
          </div>
        </header>

        {/* Info Grid */}
        <div className="mt-10 grid gap-10 sm:grid-cols-2">
          {/* Student Info */}
          <div className={`rounded-3xl p-6 border ${isDarkUi ? "bg-slate-800/30 border-slate-700" : "bg-slate-50/50 border-slate-100"}`}>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Student Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Full Name</span>
                <span className={`text-sm font-black ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>{receipt.student.fullName}</span>
              </div>
              <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Admission No.</span>
                <span className={`text-sm font-black ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>{receipt.student.admissionNumber}</span>
              </div>
              <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Class / Stream</span>
                <span className={`text-sm font-black ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>
                  {receipt.student.className ?? "—"} · {receipt.student.sectionName ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Context */}
          <div className={`rounded-3xl p-6 border ${isDarkUi ? "bg-slate-800/30 border-slate-700" : "bg-slate-50/50 border-slate-100"}`}>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              Payment Context
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Academic Term</span>
                <span className={`text-sm font-black ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>{receipt.term}</span>
              </div>
              <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Method</span>
                <span className={`text-sm font-black ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>{receipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Payee Name</span>
                <span className={`text-sm font-black ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>{receipt.paidBy}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="mt-12 overflow-hidden rounded-[2rem] border border-slate-200">
          <div className={`grid grid-cols-[1fr_auto] px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${isDarkUi ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
            }`}>
            <span>Transaction Description</span>
            <span className="text-right">Amount</span>
          </div>

          {/* Main Payment Row */}
          <div className={`grid grid-cols-[1fr_auto] items-center px-8 py-8 border-b border-dashed border-slate-200 ${isDarkUi ? "bg-emerald-500/5" : "bg-emerald-50/30"
            }`}>
            <div>
              <h4 className="text-lg font-black text-emerald-600">Amount Paid</h4>
              <p className="text-xs font-medium text-slate-400">Payment successfully recorded and allocated.</p>
            </div>
            <span className="text-2xl font-black text-emerald-600 tabular-nums">
              {formatCurrencyUGX(receipt.amountPaid)}
            </span>
          </div>

          {/* Balance Row */}
          <div className={`grid grid-cols-[1fr_auto] items-center px-8 py-6 border-b border-dashed border-slate-200 ${isDarkUi ? "bg-slate-800/20" : "bg-white"
            }`}>
            <div>
              <h4 className={`text-base font-black ${isDarkUi ? "text-white" : "text-[#0c2340]"}`}>Outstanding Balance</h4>
              <p className="text-xs font-medium text-slate-400">Remaining fees for the current term.</p>
            </div>
            <span className={`text-xl font-black tabular-nums ${isDarkUi ? "text-slate-200" : "text-[#0c2340]"}`}>
              {receipt.outstandingAfter === 0 ? "CLEAR" : formatCurrencyUGX(receipt.outstandingAfter)}
            </span>
          </div>

          {/* Credit Row (Optional) */}
          {receipt.creditAmount > 0 && (
            <div className={`grid grid-cols-[1fr_auto] items-center px-8 py-4 ${isDarkUi ? "bg-amber-500/5" : "bg-amber-50/40"
              }`}>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-700">Credit Balance</h4>
                <p className="text-[10px] font-medium text-amber-600/70">Carried forward to next period.</p>
              </div>
              <span className="text-sm font-black text-amber-700 tabular-nums">
                {formatCurrencyUGX(receipt.creditAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Formal Footer */}
        <footer className="mt-16 pt-10 border-t border-slate-200">
          <div className="grid gap-8 sm:grid-cols-3">
            <SignatureBlock label="School Stamp & Seal" isDarkUi={isDarkUi} />
            <SignatureBlock label="Bursar's Signature" isDarkUi={isDarkUi} />
            <SignatureBlock label="Parent's Acknowledgement" isDarkUi={isDarkUi} />
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm font-black tracking-tight text-slate-400 italic">
              "Build For The Future"
            </p>
            <p className="mt-2 text-[10px] font-medium text-slate-400 uppercase tracking-[0.3em]">
              All rights reserved &copy;queensnursery&primaryschool.
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
}

function SignatureBlock({ label, isDarkUi }: { label: string; isDarkUi: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-full h-20 rounded-2xl border-2 border-dashed flex items-center justify-center ${isDarkUi ? "bg-slate-800/20 border-slate-700" : "bg-slate-50/30 border-slate-100"
        }`}>
        {/* Placeholder for actual stamp/sig */}
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>
    </div>
  );
}
