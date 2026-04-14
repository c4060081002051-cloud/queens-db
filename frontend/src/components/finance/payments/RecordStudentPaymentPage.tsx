import { useEffect, useState } from "react";
import { createFinancePayment } from "../../../api/financePayments";
import { fetchStudentStatement } from "../../../api/financeStatements";
import { fetchStudents, type StudentApiRow } from "../../../api/students";
import { StudentStatementPage } from "../statements/StudentStatementPage";
import { StudentReceiptPage } from "./StudentReceiptPage";
import type { StudentPaymentReceipt, StudentStatementPayload } from "../shared/financeTypes";

function studentLabel(student: StudentApiRow): string {
  return `${student.fullName} (${student.admissionNumber})`;
}

type ViewMode = "form" | "receipt" | "statement";

export function RecordStudentPaymentPage() {
  const [mode, setMode] = useState<ViewMode>("form");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentMatches, setStudentMatches] = useState<StudentApiRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentApiRow | null>(null);
  const [term, setTerm] = useState("Term 1");
  const [method, setMethod] = useState("Cash payment");
  const [paidBy, setPaidBy] = useState("");
  const [amount, setAmount] = useState("");
  const [termDue, setTermDue] = useState("");
  const [receipt, setReceipt] = useState<StudentPaymentReceipt | null>(null);
  const [statement, setStatement] = useState<StudentStatementPayload | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (studentSearch.trim().length < 2) {
      setStudentMatches([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    void fetchStudents({ q: studentSearch.trim(), sortBy: "name", sortDir: "asc", limit: 8 })
      .then((rows) => {
        if (!cancelled) setStudentMatches(rows);
      })
      .catch(() => {
        if (!cancelled) setStudentMatches([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentSearch]);

  const parsedAmount = Math.max(Number(amount) || 0, 0);
  const parsedDue = Math.max(Number(termDue) || 0, 0);

  const createReceipt = async (printAfterCreate = false) => {
    setFormError(null);
    if (!selectedStudent) {
      setFormError("Select a student from the search results.");
      return;
    }
    if (parsedAmount <= 0) {
      setFormError("Amount paid must be greater than zero.");
      return;
    }
    try {
      const saved = await createFinancePayment({
        studentId: selectedStudent.id,
        term,
        paymentMethod: method,
        paidBy: paidBy.trim() || selectedStudent.parentFullName || "Parent / Guardian",
        amountPaid: parsedAmount,
        amountDueUgx: parsedDue > 0 ? parsedDue : undefined,
      });
      setReceipt(saved);
      setMode("receipt");
      if (printAfterCreate) window.setTimeout(() => window.print(), 150);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save payment.");
    }
  };

  const openStatement = async () => {
    if (!selectedStudent) return;
    try {
      const data = await fetchStudentStatement(selectedStudent.id, term);
      setStatement(data);
      setMode("statement");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to load statement");
    }
  };

  if (mode === "receipt" && receipt) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setMode("form")}
            className="rounded-xl bg-[#eef2f7] px-4 py-2 text-sm font-semibold text-[#3f4f67]"
          >
            Back to Record Payment
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-gradient-to-r from-[#5758ea] to-[#4c46df] px-4 py-2 text-sm font-bold text-white"
          >
            Print Receipt
          </button>
          <button
            type="button"
            onClick={() => void openStatement()}
            className="rounded-xl bg-[#1f8f59] px-4 py-2 text-sm font-bold text-white"
          >
            View Term Statement
          </button>
        </div>
        <StudentReceiptPage receipt={receipt} />
      </div>
    );
  }

  if (mode === "statement" && statement) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setMode("form")}
            className="rounded-xl bg-[#eef2f7] px-4 py-2 text-sm font-semibold text-[#3f4f67]"
          >
            Back to Payment Form
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-gradient-to-r from-[#5758ea] to-[#4c46df] px-4 py-2 text-sm font-bold text-white"
          >
            Print Statement
          </button>
        </div>
        <StudentStatementPage statement={statement} />
      </div>
    );
  }

  return (
    <section className="neo-card mx-auto max-w-5xl p-6 sm:p-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-[2rem] font-bold tracking-tight text-[#243043]">Record Student Payment</h2>
        <p className="mt-2 text-[1.1rem] text-[#5f728b]">
          Create durable payment transactions, receipts, and term statements.
        </p>
      </div>
      <form className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#3e4b5f]">
            Student Search *
          </label>
          <input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Start typing name or admission number"
            className="neo-inset-field w-full rounded-xl px-4 py-3 text-sm text-[#2d3436]"
          />
          {searchLoading ? <p className="mt-1 text-xs text-[#8a99ad]">Searching students...</p> : null}
          {studentMatches.length > 0 ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-[#d9e1ec] bg-white">
              {studentMatches.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudent(student);
                    setStudentSearch(studentLabel(student));
                    setStudentMatches([]);
                    setPaidBy(student.parentFullName ?? "");
                  }}
                  className="block w-full border-b border-[#eef2f7] px-3 py-2 text-left text-xs text-[#2d3436] last:border-b-0 hover:bg-[#f7f9fd]"
                >
                  {studentLabel(student)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#3e4b5f]">Term *</label>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="neo-inset-field w-full rounded-xl px-4 py-3 text-sm text-[#2d3436]"
          >
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#3e4b5f]">
            Payment Method *
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="neo-inset-field w-full rounded-xl px-4 py-3 text-sm text-[#2d3436]"
          >
            <option>Cash payment</option>
            <option>Mobile money</option>
            <option>Bank transfer</option>
            <option>Cheque</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#3e4b5f]">
            Paid By (Depositor Name)
          </label>
          <input
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="neo-inset-field w-full rounded-xl px-4 py-3 text-sm text-[#2d3436]"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#3e4b5f]">
            Amount Paid (UGX) *
          </label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="neo-inset-field w-full rounded-xl px-4 py-3 text-sm text-[#2d3436]"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#3e4b5f]">
            Term Fees Due (optional)
          </label>
          <input
            type="number"
            min="0"
            value={termDue}
            onChange={(e) => setTermDue(e.target.value)}
            className="neo-inset-field w-full rounded-xl px-4 py-3 text-sm text-[#2d3436]"
          />
        </div>
        <div className="sm:col-span-2 grid gap-4 pt-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void createReceipt(false)}
            className="rounded-2xl bg-[#eef2f7] px-5 py-3 text-base font-semibold text-[#3f4f67]"
          >
            Save Record
          </button>
          <button
            type="button"
            onClick={() => void createReceipt(true)}
            className="rounded-2xl bg-gradient-to-r from-[#5758ea] to-[#4c46df] px-5 py-3 text-base font-bold text-white"
          >
            Save &amp; Print Receipt
          </button>
        </div>
        {formError ? <p className="sm:col-span-2 text-sm font-semibold text-[#b84040]">{formError}</p> : null}
      </form>
    </section>
  );
}
