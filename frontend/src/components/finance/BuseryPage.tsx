import { useMemo, useState } from "react";
import { revokeBursery } from "../../api/financeBursery";
import { formatCurrencyUGX } from "./shared/financeFormat";

export type BuseryRecord = {
  id: number;
  studentName: string;
  awardType: string;
  coverageLabel: string;
  amountCovered: number;
  term: string;
  status: "Approved" | "Pending";
};
const MOCK_RECORDS: BuseryRecord[] = [];

export function BuseryPage({
  isAdmin,
  onAssignClick,
  onEditRow,
}: {
  isAdmin?: boolean;
  onAssignClick?: () => void;
  onEditRow?: (row: BuseryRecord) => void;
}) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [rows, setRows] = useState(MOCK_RECORDS);
  const [selectedRow, setSelectedRow] = useState<BuseryRecord | null>(null);
  const [actionRowId, setActionRowId] = useState<number | null>(null);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter(
      (row) =>
        row.studentName.toLowerCase().includes(search) ||
        row.awardType.toLowerCase().includes(search),
    );
  }, [query, rows]);

  const approvedTotal = useMemo(
    () =>
      filteredRows
        .filter((row) => row.status === "Approved")
        .reduce((sum, row) => sum + row.amountCovered, 0),
    [filteredRows],
  );

  const handleEdit = (row: BuseryRecord) => {
    onEditRow?.(row);
  };

  const handleView = (row: BuseryRecord) => {
    setSelectedRow(row);
    setNotice(`Viewing bursary details for ${row.studentName}.`);
  };

  const handleRevoke = async (row: BuseryRecord) => {
    if (row.status !== "Approved") {
      setNotice(`${row.studentName} does not have an active bursary to revoke.`);
      return;
    }
    if (!window.confirm(`Revoke bursary for ${row.studentName}?`)) return;
    setActionRowId(row.id);
    try {
      await revokeBursery(row.id, row.term);
      setRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? {
                ...item,
                status: "Pending",
                coverageLabel: "0%",
                amountCovered: 0,
                awardType: `${item.awardType} (revoked)`,
              }
            : item,
        ),
      );
      if (selectedRow?.id === row.id) {
        setSelectedRow({
          ...row,
          status: "Pending",
          coverageLabel: "0%",
          amountCovered: 0,
          awardType: `${row.awardType} (revoked)`,
        });
      }
      setNotice(`Bursary revoked for ${row.studentName}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to revoke bursary.");
    } finally {
      setActionRowId(null);
    }
  };

  return (
    <div className="space-y-6">
      {notice ? (
        <div className="neo-card flex items-center justify-between gap-3 border border-[#d8e8d8] bg-[#f8fff8] px-4 py-3 text-sm text-[#2d3436]">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#5a8faf] ring-1 ring-[#d9e4ea] transition hover:bg-[#f8fbff]"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="neo-card border-t-4 border-[#10b981] p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#636e72]">
            Total Approved Support
          </h2>
          <p className="mt-2 text-2xl font-black text-[#2d3436]">
            {formatCurrencyUGX(approvedTotal)}
          </p>
          <p className="mt-1 text-xs text-[#636e72]">
            Total amount covered by active busery awards.
          </p>
        </section>
        <section className="neo-card border-t-4 border-[#5a8faf] p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#636e72]">
            Active Recipients
          </h2>
          <p className="mt-2 text-2xl font-black text-[#2d3436]">
            {filteredRows.filter((row) => row.status === "Approved").length}
          </p>
          <p className="mt-1 text-xs text-[#636e72]">
            Students currently receiving approved support.
          </p>
        </section>
      </div>

      <section className="neo-card overflow-hidden p-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe4d9]/80 bg-[#faf7f0]/40 px-5 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#2d3436]">
              Busery Awards
            </h2>
            {isAdmin && (
              <button
                type="button"
                onClick={onAssignClick}
                className="rounded-lg bg-[#0c2340] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#ea9f3e] shadow-sm transition hover:bg-[#1a3a5c] active:translate-y-px"
              >
                + Assign Bursary
              </button>
            )}
          </div>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by student or award type"
            className="neo-inset-field w-full max-w-xs rounded-lg px-3 py-2 text-sm text-[#2d3436] placeholder:text-[#636e72]/75"
          />
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#2d3436]">
            <thead className="bg-[#f8fbff] text-xs uppercase tracking-wide text-[#636e72]">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Award Type</th>
                <th className="px-5 py-3 text-center">Coverage</th>
                <th className="px-5 py-3">Term</th>
                <th className="px-5 py-3 text-right">Amount Covered</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe4d9]/70">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-[#fafcff]">
                  <td className="px-5 py-3 font-semibold">{row.studentName}</td>
                  <td className="px-5 py-3">{row.awardType}</td>
                  <td className="px-5 py-3 text-center">{row.coverageLabel}</td>
                  <td className="px-5 py-3">{row.term}</td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {formatCurrencyUGX(row.amountCovered)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                        row.status === "Approved"
                          ? "bg-[#d7f3e2] text-[#0e7a4b]"
                          : "bg-[#fff0d8] text-[#a35f0a]"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleView(row)}
                        className="rounded-full bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#2d3436] shadow-[2px_2px_4px_rgba(200,188,170,0.3),-1px_-1px_3px_rgba(255,255,255,0.9)] transition hover:text-[#5a8faf]"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="rounded-full bg-gradient-to-br from-[#e8f2fa] to-[#d4e8f5] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#2d3436] shadow-[2px_2px_4px_rgba(185,217,235,0.35),-1px_-1px_3px_rgba(255,255,255,0.9)] transition hover:text-[#5a8faf]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRevoke(row)}
                        disabled={actionRowId === row.id || row.status !== "Approved"}
                        className="rounded-full bg-gradient-to-br from-[#fff1f0] to-[#ffd9d5] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#a9332a] shadow-[2px_2px_4px_rgba(236,180,175,0.35),-1px_-1px_3px_rgba(255,255,255,0.9)] transition hover:brightness-105"
                      >
                        {actionRowId === row.id ? "Working..." : "Revoke"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-[#636e72]">
                    No busery records match your search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      
      {selectedRow ? (
        <section className="neo-card border-t-4 border-[#5a8faf] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#2d3436]">
                Bursary Details
              </h2>
              <p className="mt-1 text-lg font-semibold text-[#2d3436]">
                {selectedRow.studentName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRow(null)}
              className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#5a8faf] ring-1 ring-[#d9e4ea] transition hover:bg-[#f8fbff]"
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailCard label="Award Type" value={selectedRow.awardType} />
            <DetailCard label="Coverage" value={selectedRow.coverageLabel} />
            <DetailCard label="Term" value={selectedRow.term} />
            <DetailCard
              label="Amount Covered"
              value={formatCurrencyUGX(selectedRow.amountCovered)}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ebe4d9]/80 bg-white/40 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wider text-[#636e72]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#2d3436]">{value}</p>
    </div>
  );
}
