import { formatCurrencyUGX, formatReceiptDate } from "../shared/financeFormat";
import type { StudentPaymentReceipt } from "../shared/financeTypes";

export function StudentReceiptPage({ receipt }: { receipt: StudentPaymentReceipt }) {
  return (
    <section className="neo-card relative mx-auto max-w-5xl overflow-hidden border border-[#d8e0e7] bg-[#fcfdff] p-6 sm:p-8 print:shadow-none">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <p className="select-none text-[6.5rem] font-bold tracking-widest text-[#2d3436]/5 [transform:rotate(-35deg)]">
          {`STUDENT RECEIPT NO: ${receipt.receiptNo}`}
        </p>
      </div>

      <header className="relative z-10 border-b border-[#e5eaef] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#dce6f2] bg-white p-1">
              <img src="/school-badge-v2.png" alt="School badge" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-[#2f4054]">QUEENS NURSERY &amp; PRIMARY SCHOOL</h2>
              <p className="mt-1 text-sm text-[#3f4f67]">Kitebi star just after the trading Centre</p>
              <p className="text-sm text-[#3f4f67]">P.O. BOX 9107, Kampala | queensprimaryschool13@gmail.com</p>
              <p className="text-sm text-[#3f4f67]">+256 782 333 908 / +256 750 775 572</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mt-6 grid gap-4 rounded-2xl border border-[#d9e1ea] bg-[#f8fbff] p-5 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1e73be]">Student Brief</h3>
          <dl className="mt-3 space-y-1 text-sm">
            <div><dt className="inline font-bold text-[#2f4054]">Name:</dt> <dd className="inline text-[#3f4f67]">{receipt.student.fullName}</dd></div>
            <div><dt className="inline font-bold text-[#2f4054]">Admission No:</dt> <dd className="inline text-[#3f4f67]">{receipt.student.admissionNumber}</dd></div>
            <div><dt className="inline font-bold text-[#2f4054]">Class:</dt> <dd className="inline text-[#3f4f67]">{receipt.student.className ?? "—"}</dd></div>
            <div><dt className="inline font-bold text-[#2f4054]">Section:</dt> <dd className="inline text-[#3f4f67]">{receipt.student.sectionName ?? "—"}</dd></div>
          </dl>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1e73be]">Receipt Details</h3>
          <dl className="mt-3 space-y-1 text-sm">
            <div><dt className="inline font-bold text-[#2f4054]">Date Issued:</dt> <dd className="inline text-[#3f4f67]">{formatReceiptDate(receipt.issuedAt)}</dd></div>
            <div><dt className="inline font-bold text-[#2f4054]">Term:</dt> <dd className="inline text-[#3f4f67]">{receipt.term}</dd></div>
            <div><dt className="inline font-bold text-[#2f4054]">Payment Method:</dt> <dd className="inline text-[#3f4f67]">{receipt.paymentMethod}</dd></div>
            <div><dt className="inline font-bold text-[#2f4054]">Paid By:</dt> <dd className="inline text-[#3f4f67]">{receipt.paidBy}</dd></div>
          </dl>
        </div>
      </div>

      <div className="relative z-10 mt-6 overflow-hidden rounded-2xl border border-[#d9e1ea]">
        <div className="grid grid-cols-[1fr_auto] bg-[#dbe2eb] px-4 py-3 text-sm font-bold uppercase tracking-wide text-[#2f4054]">
          <span>Description</span>
          <span>Amount</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] bg-[#eef9f1] px-4 py-4 text-lg font-bold text-[#21a35a]">
          <span>Amount Paid</span>
          <span>{formatCurrencyUGX(receipt.amountPaid)}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] bg-[#f5f8ff] px-4 py-4 text-lg font-bold text-[#2f4054]">
          <span>Fees Balance After Payment</span>
          <span>{receipt.outstandingAfter === 0 ? "0 UGX" : formatCurrencyUGX(receipt.outstandingAfter)}</span>
        </div>
        {receipt.creditAmount > 0 ? (
          <div className="grid grid-cols-[1fr_auto] bg-[#fff7e6] px-4 py-3 text-base font-semibold text-[#9a6700]">
            <span>Credit Carried Forward</span>
            <span>{formatCurrencyUGX(receipt.creditAmount)}</span>
          </div>
        ) : null}
      </div>

      <footer className="relative z-10 mt-8 border-t border-[#e5eaef] pt-7">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-xl border border-dashed border-[#c6d3e3] bg-white px-3 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f7f8f]">School Stamp</p>
            <div className="mt-3 h-14 rounded-lg border border-[#e6edf5] bg-[#fafcff]" />
          </div>
          <div className="rounded-xl border border-dashed border-[#c6d3e3] bg-white px-3 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f7f8f]">Authorized Signature</p>
            <div className="mt-3 h-14 rounded-lg border border-[#e6edf5] bg-[#fafcff]" />
          </div>
          <div className="rounded-xl border border-dashed border-[#c6d3e3] bg-white px-3 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f7f8f]">Parent Signature</p>
            <div className="mt-3 h-14 rounded-lg border border-[#e6edf5] bg-[#fafcff]" />
          </div>
        </div>
        <p className="mt-6 text-center text-base text-[#7d8d9d]">
          Thank you for your payment. We appreciate your continued support.
        </p>
      </footer>
    </section>
  );
}
