import { useState } from "react";
import { createDailyExpense } from "../../../api/financeLedger";

function ymd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DailyExpensesPage() {
  const [expenseDate, setExpenseDate] = useState(ymd());
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountUgx, setAmountUgx] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setStatus(null);
    try {
      await createDailyExpense({
        expenseDate,
        category,
        description,
        paymentMethod,
        amountUgx: Math.max(Number(amountUgx) || 0, 0),
      });
      setStatus("Expense entry saved.");
      setCategory("");
      setDescription("");
      setAmountUgx("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  return (
    <section className="neo-card max-w-3xl space-y-4 p-6">
      <h2 className="text-lg font-bold text-[#2f4054]">Daily Expense Entry</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="neo-inset-field rounded-xl px-3 py-2 text-sm" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="neo-inset-field rounded-xl px-3 py-2 text-sm" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="neo-inset-field rounded-xl px-3 py-2 text-sm sm:col-span-2" />
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="neo-inset-field rounded-xl px-3 py-2 text-sm">
          <option>Cash</option>
          <option>Mobile money</option>
          <option>Bank transfer</option>
        </select>
        <input type="number" min="0" value={amountUgx} onChange={(e) => setAmountUgx(e.target.value)} placeholder="Amount UGX" className="neo-inset-field rounded-xl px-3 py-2 text-sm" />
      </div>
      <button type="button" onClick={() => void submit()} className="rounded-xl bg-[#4c46df] px-4 py-2 text-sm font-semibold text-white">
        Save Expense
      </button>
      {status ? <p className="text-sm font-semibold text-[#1f8f59]">{status}</p> : null}
      {error ? <p className="text-sm font-semibold text-[#b84040]">{error}</p> : null}
    </section>
  );
}
