import { useEffect, useMemo, useState } from "react";
import {
  applyFeeStructure,
  fetchFeeStructure,
  type FeeStructureRow,
  type FeeStructureStatus,
} from "../../api/financeFeeStructure";
import { formatCurrencyUGX } from "../finance/shared/financeFormat";

type RowState = {
  status: FeeStructureStatus;
  label: string;
  amountDueUgx: string;
  notes: string;
};

const STATUS_META: Array<{ status: FeeStructureStatus; label: string }> = [
  { status: "boarding", label: "Boarding" },
  { status: "day_half", label: "Day Half Day" },
  { status: "day_full", label: "Day Full Day" },
  { status: "day_full_p7", label: "Day Full Day (P7)" },
];

function currentTermDefault() {
  return "Term 1";
}

function toRows(items: FeeStructureRow[]): RowState[] {
  const byStatus = new Map(items.map((x) => [x.status, x] as const));
  return STATUS_META.map((meta) => {
    const row = byStatus.get(meta.status);
    return {
      status: meta.status,
      label: meta.label,
      amountDueUgx: String(row?.amountDueUgx ?? 0),
      notes: row?.notes ?? "",
    };
  });
}

export function SettingsFeesStructurePanel() {
  const [term, setTerm] = useState(currentTermDefault);
  const [rows, setRows] = useState<RowState[]>(() => toRows([]));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSuccess(null);
    void fetchFeeStructure(term)
      .then((items) => {
        if (!cancelled) setRows(toRows(items));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load fee structure");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [term]);

  const previewTotal = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const n = Number(row.amountDueUgx);
        return Number.isFinite(n) && n > 0 ? sum + Math.round(n) : sum;
      }, 0),
    [rows],
  );

  function updateRow(status: FeeStructureStatus, patch: Partial<RowState>) {
    setRows((prev) => prev.map((row) => (row.status === status ? { ...row, ...patch } : row)));
  }

  async function onApply() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payloadItems = rows.map((row) => {
        const amount = Math.round(Number(row.amountDueUgx));
        if (!Number.isFinite(amount) || amount < 0) {
          throw new Error(`Enter a valid amount for ${row.label}`);
        }
        return {
          status: row.status,
          amountDueUgx: amount,
          notes: row.notes.trim() || null,
        };
      });
      const res = await applyFeeStructure({ term, items: payloadItems });
      setSuccess(`Applied. Updated ${res.updatedAssignments} student fee assignments for ${term}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply fee structure");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="neo-card p-5 sm:p-6">
      <header className="border-b border-[#ebe4d9]/80 pb-4">
        <h1 className="text-xl font-bold text-[#2d3436]">Fees Structure</h1>
        <p className="mt-2 text-sm text-[#636e72]">
          Set term fees by student status. Applying this updates fee assignments for all matching students.
        </p>
      </header>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="space-y-1 text-sm font-semibold text-[#2d3436]">
          Term
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Term 1"
            className="neo-inset-field w-full rounded-lg px-3 py-2 text-sm font-medium"
          />
        </label>
        <div className="neo-card-elevated rounded-xl p-4 md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-[#636e72]">Combined configured fees</p>
          <p className="mt-1 text-lg font-bold text-[#2d3436]">{formatCurrencyUGX(previewTotal)}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-left">
          <thead>
            <tr className="border-b border-[#ebe4d9]/80 text-xs uppercase text-[#636e72]">
              <th className="px-3 py-3">Student status</th>
              <th className="px-3 py-3">Amount due (UGX)</th>
              <th className="px-3 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ebe4d9]/70">
            {rows.map((row) => (
              <tr key={row.status}>
                <td className="px-3 py-3 text-sm font-semibold text-[#2d3436]">{row.label}</td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={row.amountDueUgx}
                    onChange={(e) => updateRow(row.status, { amountDueUgx: e.target.value })}
                    className="neo-inset-field w-full rounded-lg px-3 py-2 text-sm"
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    value={row.notes}
                    onChange={(e) => updateRow(row.status, { notes: e.target.value })}
                    placeholder="Optional note"
                    className="neo-inset-field w-full rounded-lg px-3 py-2 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? <p className="mt-4 text-sm text-[#636e72]">Loading structure...</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-[#b84040]">{error}</p> : null}
      {success ? <p className="mt-4 text-sm font-semibold text-[#4a6b4e]">{success}</p> : null}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => void onApply()}
          disabled={saving || loading}
          className="rounded-full bg-gradient-to-br from-[#b8d8ba] to-[#8fb892] px-5 py-2 text-sm font-bold text-[#2d3436] shadow-[3px_3px_8px_rgba(120,150,125,0.4),-2px_-2px_6px_rgba(255,255,255,0.8)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? "Applying..." : "Apply fees structure"}
        </button>
      </div>
    </section>
  );
}
