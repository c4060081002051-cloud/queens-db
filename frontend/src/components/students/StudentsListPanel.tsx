import { useEffect, useRef, useState } from "react";
import {
  deleteStudent,
  fetchStudent,
  fetchStudents,
  type StudentApiRow,
  type StudentSortBy,
  type StudentSortDir,
} from "../../api/students";
import { useI18n } from "../../i18n/I18nProvider";
import { exportStudentsToXlsx } from "../../utils/exportStudentsXlsx";
import { AuthenticatedStudentPhoto } from "./AuthenticatedStudentPhoto";
import { StudentDetailModal } from "./StudentDetailModal";

const selectClass =
  "rounded-lg border border-[#e0d8cc] bg-[#faf9f7] px-2.5 py-2 text-sm text-[#2d3436] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]";

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e2d8] bg-gradient-to-br from-[#fffcf9] to-[#f2ebe4] text-[#5a8faf] shadow-[2px_2px_5px_rgba(200,188,170,0.25)] transition hover:border-[#b9d9eb] hover:text-[#2d3436] active:translate-y-px";

type StudentsListPanelProps = {
  limit: number;
  title: string;
  refreshKey?: number;
  classNameFilter?: string | null;
  /** Directory pages: export + row actions */
  showDirectoryTools?: boolean;
};

type StudentSortOption = StudentSortBy | "custom";
type CustomSortColumn =
  | "admissionNumber"
  | "fullName"
  | "className"
  | "sectionName"
  | "boardingStatus"
  | "admittedAt";

function formatStudentStatus(status: string | null): string {
  if (!status) return "—";
  const normalized = status.trim().toLowerCase();
  if (!normalized) return "—";
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function customColumnValue(row: StudentApiRow, column: CustomSortColumn): string {
  switch (column) {
    case "admissionNumber":
      return row.admissionNumber ?? "";
    case "fullName":
      return row.fullName ?? "";
    case "className":
      return row.className ?? "";
    case "sectionName":
      return row.sectionName ?? "";
    case "boardingStatus":
      return formatStudentStatus(row.boardingStatus);
    case "admittedAt":
      return row.admittedAt ?? "";
    default:
      return "";
  }
}

function applyCustomSort(
  rows: StudentApiRow[],
  dir: StudentSortDir,
  column: CustomSortColumn,
  query: string,
): StudentApiRow[] {
  const normalizedQuery = query.trim().toLowerCase();
  return [...rows].sort((a, b) => {
    const aValue = customColumnValue(a, column);
    const bValue = customColumnValue(b, column);
    if (normalizedQuery) {
      const aMatch = aValue.toLowerCase().includes(normalizedQuery) ? 0 : 1;
      const bMatch = bValue.toLowerCase().includes(normalizedQuery) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    const columnCmp = aValue.localeCompare(bValue);
    if (columnCmp !== 0) return dir === "asc" ? columnCmp : -columnCmp;
    const fallback = a.fullName.localeCompare(b.fullName);
    return dir === "asc" ? fallback : -fallback;
  });
}

function IconView({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconEdit({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4L16.5 3.5z"
      />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"
      />
    </svg>
  );
}

export function StudentsListPanel({
  limit,
  title,
  refreshKey = 0,
  classNameFilter = null,
  showDirectoryTools = false,
}: StudentsListPanelProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [applied, setApplied] = useState("");
  const [sortBy, setSortBy] = useState<StudentSortOption>("date");
  const [sortDir, setSortDir] = useState<StudentSortDir>("desc");
  const [customSortColumn, setCustomSortColumn] = useState<CustomSortColumn>("fullName");
  const [customSortValue, setCustomSortValue] = useState("");
  const [items, setItems] = useState<StudentApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalId, setModalId] = useState<number | null>(null);
  const [modalInitialEdit, setModalInitialEdit] = useState(false);
  const [profileCard, setProfileCard] = useState<StudentApiRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudentApiRow | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<StudentApiRow | null>(null);
  const [updatedStudentNotice, setUpdatedStudentNotice] = useState<string | null>(null);
  const deleteTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setApplied(draft.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const q = classNameFilter ? `${classNameFilter} ${applied}`.trim() : applied;
    const apiSortBy: StudentSortBy = sortBy === "custom" ? "date" : sortBy;
    void fetchStudents({ q, sortBy: apiSortBy, sortDir, limit })
      .then((rows) => {
        if (!cancelled) {
          const filtered = classNameFilter
            ? rows.filter(
                (r) => (r.className ?? "").trim().toLowerCase() === classNameFilter.trim().toLowerCase(),
              )
            : rows;
          setItems(filtered);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied, sortBy, sortDir, limit, refreshKey, classNameFilter]);

  const runSearch = () => {
    setApplied(draft.trim());
  };

  const openView = (id: number) => {
    setModalInitialEdit(false);
    setModalId(null);
    void fetchStudent(id)
      .then((row) => setProfileCard(row))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"));
  };

  const openEdit = (id: number) => {
    setModalInitialEdit(true);
    setModalId(id);
  };

  const reloadList = async () => {
    const q = classNameFilter ? `${classNameFilter} ${applied}`.trim() : applied;
    try {
      const apiSortBy: StudentSortBy = sortBy === "custom" ? "date" : sortBy;
      const rows = await fetchStudents({ q, sortBy: apiSortBy, sortDir, limit });
      const filtered = classNameFilter
          ? rows.filter(
              (r) => (r.className ?? "").trim().toLowerCase() === classNameFilter.trim().toLowerCase(),
            )
          : rows;
      setItems(filtered);
    } catch {
      /* keep existing list on failure */
    }
  };

  const displayedItems =
    sortBy === "custom"
      ? applyCustomSort(items, sortDir, customSortColumn, customSortValue)
      : items;

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    exportStudentsToXlsx(items, `students-${stamp}`, {
      admission: t("students.col.admission"),
      name: t("students.col.name"),
      class: t("students.col.class"),
      section: t("students.col.section"),
      dob: t("students.col.dob"),
      admitted: t("students.col.admitted"),
      nationality: t("students.col.nationality"),
      country: t("students.col.country"),
      district: t("students.col.district"),
      registrationType: t("students.col.registrationType"),
    });
  };

  const queueDelete = (row: StudentApiRow) => {
    if (deleteTimerRef.current != null) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setPendingDelete(row);
    setItems((prev) => prev.filter((x) => x.id !== row.id));
    if (modalId === row.id) setModalId(null);
    if (profileCard?.id === row.id) setProfileCard(null);
    deleteTimerRef.current = window.setTimeout(() => {
      void deleteStudent(row.id).catch((e) =>
        setError(e instanceof Error ? e.message : t("students.modal.deleteFailed")),
      );
      setPendingDelete(null);
      deleteTimerRef.current = null;
    }, 10000);
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    if (deleteTimerRef.current != null) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setItems((prev) => [pendingDelete, ...prev]);
    setPendingDelete(null);
  };

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current != null) {
        window.clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!updatedStudentNotice) return;
    const timer = window.setTimeout(() => setUpdatedStudentNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [updatedStudentNotice]);

  return (
    <>
      {updatedStudentNotice ? (
        <div className="fixed right-4 top-4 z-[80] max-w-md rounded-2xl border border-[#cde8cf] bg-[#fffcf7] px-4 py-3 text-sm text-[#2d3436] shadow-[8px_12px_30px_rgba(45,52,54,0.18)]">
          <p>
            <span className="font-semibold">{updatedStudentNotice}</span>, Information has been updated.
          </p>
        </div>
      ) : null}
      {confirmDeleteRow ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#2d3436]/40 backdrop-blur-[2px]"
            onClick={() => setConfirmDeleteRow(null)}
            aria-label="Close warning dialog"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#f7d1cd] bg-[#fffcf7] p-5 shadow-[8px_12px_40px_rgba(45,52,54,0.2)]">
            <h3 className="text-base font-bold text-[#a9332a]">Warning</h3>
            <p className="mt-2 text-sm text-[#2d3436]">
              {t("students.deleteRowConfirm")} You will have 10 seconds to undo.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteRow(null)}
                className="rounded-full bg-[#faf7f0] px-4 py-1.5 text-xs font-semibold text-[#636e72] ring-1 ring-[#ebe4d9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  queueDelete(confirmDeleteRow);
                  setConfirmDeleteRow(null);
                }}
                className="rounded-full bg-[#fce8e5] px-4 py-1.5 text-xs font-bold text-[#a9332a]"
              >
                Delete
              </button>
            </div>
          </div>
        </section>
      ) : null}
      {pendingDelete ? (
        <section className="neo-card flex items-center justify-between gap-3 border border-[#f7d1cd] bg-[#fff7f5] px-4 py-3">
          <p className="text-sm text-[#2d3436]">Student deleted. Undo available for 10 seconds.</p>
          <button
            type="button"
            onClick={undoDelete}
            className="rounded-full bg-[#2d3436] px-4 py-1.5 text-xs font-bold text-white"
          >
            Undo
          </button>
        </section>
      ) : null}
      {profileCard ? null : (
      <section className="overflow-hidden rounded-2xl border border-[#ebe4d9] bg-[#fffcf7] shadow-[6px_8px_24px_rgba(45,52,54,0.08)]">
        {error ? (
          <div className="border-b border-[#f7d1cd] bg-[#fff7f5] px-5 py-3 text-sm text-[#a9332a]" role="alert">
            {error}
          </div>
        ) : null}
        <div className="flex flex-col gap-4 border-b border-[#ebe4d9] bg-gradient-to-r from-[#f4faf5] via-[#f8f9f6] to-[#eef6f9] px-5 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0 shrink-0">
            {title.trim() ? (
              <h2 className="text-base font-bold tracking-tight text-[#2d3436]">{title}</h2>
            ) : null}
          </div>
          <div className="flex min-w-0 w-full flex-col gap-3 sm:max-w-none sm:flex-1 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-md">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#636e72]">
                {t("toolbar.filter")}
              </span>
              <label className="sr-only" htmlFor="student-search">
                {t("students.searchLabel")}
              </label>
              <input
                id="student-search"
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("students.searchPlaceholder")}
                className="min-w-0 w-full rounded-xl border border-[#e0d8cc] bg-[#faf9f7] px-3 py-2 text-sm text-[#2d3436] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.06)] placeholder:text-[#636e72]/60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#636e72]">
                {t("toolbar.sort")}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="student-sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as StudentSortOption)}
                  className={selectClass}
                  aria-label={t("students.sortBy")}
                >
                  <option value="date">{t("students.sort.admitted")}</option>
                  <option value="id">{t("students.sort.id")}</option>
                  <option value="name">{t("students.sort.name")}</option>
                  <option value="class">{t("students.sort.class")}</option>
                  <option value="custom">Custom</option>
                </select>
                {sortBy === "custom" ? (
                  <>
                    <select
                      value={customSortColumn}
                      onChange={(e) => setCustomSortColumn(e.target.value as CustomSortColumn)}
                      className={selectClass}
                      aria-label="Custom sort column"
                    >
                      <option value="fullName">{t("students.col.name")}</option>
                      <option value="admissionNumber">{t("students.col.admission")}</option>
                      <option value="className">{t("students.col.class")}</option>
                      <option value="sectionName">{t("students.col.section")}</option>
                      <option value="boardingStatus">{t("students.col.status")}</option>
                      <option value="admittedAt">{t("students.col.admitted")}</option>
                    </select>
                    <input
                      type="text"
                      value={customSortValue}
                      onChange={(e) => setCustomSortValue(e.target.value)}
                      placeholder="Type value for custom sort"
                      className={selectClass}
                      aria-label="Custom sort value"
                    />
                  </>
                ) : null}
                <select
                  id="student-sort-dir"
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as StudentSortDir)}
                  className={selectClass}
                  aria-label={t("students.sortDirection")}
                >
                  <option value="asc">{t("dashboard.expense.sort.az")}</option>
                  <option value="desc">{t("dashboard.expense.sort.za")}</option>
                </select>
                <button
                  type="button"
                  onClick={runSearch}
                  className="rounded-full bg-gradient-to-br from-[#6a9570] to-[#4a6b4e] px-5 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-110"
                >
                  {t("dashboard.search")}
                </button>
                {showDirectoryTools ? (
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={loading || items.length === 0}
                    className="rounded-full border border-[#c9e2f2] bg-gradient-to-br from-[#e8f4fa] to-[#d4e8f5] px-4 py-2 text-sm font-bold text-[#2d3436] shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("students.exportExcel")}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-0 overflow-hidden">
          <table className="table-fixed w-full text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-[#ebe4d9] bg-[#faf7f0]/95 text-[10px] font-bold uppercase tracking-wide text-[#636e72] backdrop-blur-sm sm:text-[11px]">
              <tr>
                {showDirectoryTools ? (
                  <th className="w-12 px-1 py-3 sm:w-14 sm:px-2">{t("students.col.photo")}</th>
                ) : null}
                <th className="w-[11%] px-1 py-3 sm:px-2">{t("students.col.admission")}</th>
                <th className="w-[18%] px-1 py-3 sm:px-2">{t("students.col.name")}</th>
                <th className="w-[12%] px-1 py-3 sm:px-2">{t("students.col.class")}</th>
                <th className="w-[9%] px-1 py-3 sm:px-2">{t("students.col.section")}</th>
                <th className="w-[10%] px-1 py-3 sm:px-2">{t("students.col.status")}</th>
                <th className="w-[11%] px-1 py-3 sm:px-2">{t("students.col.dob")}</th>
                <th className="w-[12%] px-1 py-3 sm:px-2">{t("students.col.admitted")}</th>
                {showDirectoryTools ? (
                  <th className="w-24 px-1 py-3 text-center sm:w-28 sm:px-2">
                    {t("students.col.actions")}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {loading ? (
                <tr>
                  <td
                    colSpan={showDirectoryTools ? 9 : 7}
                    className="px-5 py-10 text-center text-sm text-[#636e72]"
                  >
                    {t("students.loading")}
                  </td>
                </tr>
              ) : null}
              {!loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={showDirectoryTools ? 9 : 7}
                    className="px-5 py-10 text-center text-sm text-[#636e72]"
                  >
                    {t("students.noRecordFound")}
                  </td>
                </tr>
              ) : null}
              {!loading
                ? displayedItems.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-[#f0f7f4]/90 odd:bg-[#fafaf8]/80"
                    >
                      {showDirectoryTools ? (
                        <td className="px-1 py-2 sm:px-2">
                          <div className="mx-auto h-9 w-9 overflow-hidden rounded-lg ring-1 ring-[#ebe4d9] sm:h-10 sm:w-10 sm:rounded-xl">
                            <AuthenticatedStudentPhoto
                              studentId={row.id}
                              hasPhoto={row.hasPassportPhoto}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </td>
                      ) : null}
                      <td className="min-w-0 truncate px-1 py-2 font-mono text-[10px] font-semibold text-[#5a8faf] sm:px-2 sm:text-xs">
                        {row.admissionNumber}
                      </td>
                      <td className="min-w-0 truncate px-1 py-2 text-xs font-semibold text-[#2d3436] sm:px-2 sm:text-sm">
                        {row.fullName}
                      </td>
                      <td className="min-w-0 truncate px-1 py-2 text-xs text-[#2d3436] sm:px-2 sm:text-sm">
                        {row.className ?? "—"}
                      </td>
                      <td className="min-w-0 truncate px-1 py-2 text-xs text-[#636e72] sm:px-2 sm:text-sm">
                        {row.sectionName ?? "—"}
                      </td>
                      <td className="min-w-0 truncate px-1 py-2 text-xs font-medium text-[#636e72] sm:px-2 sm:text-sm">
                        {formatStudentStatus(row.boardingStatus)}
                      </td>
                      <td className="min-w-0 truncate px-1 py-2 text-[10px] tabular-nums text-[#636e72] sm:px-2 sm:text-sm">
                        {row.dateOfBirthFormatted ?? "—"}
                      </td>
                      <td className="min-w-0 truncate px-1 py-2 text-[10px] tabular-nums text-[#636e72] sm:px-2 sm:text-sm">
                        {row.admittedAt}
                      </td>
                      {showDirectoryTools ? (
                        <td className="px-0 py-2 sm:px-1">
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                            <button
                              type="button"
                              className={iconBtn}
                              title={t("students.action.view")}
                              aria-label={t("students.action.view")}
                              onClick={() => openView(row.id)}
                            >
                              <IconView />
                            </button>
                            <button
                              type="button"
                              className={iconBtn}
                              title={t("students.action.edit")}
                              aria-label={t("students.action.edit")}
                              onClick={() => openEdit(row.id)}
                            >
                              <IconEdit />
                            </button>
                            <button
                              type="button"
                              className={`${iconBtn} text-rose-600 hover:border-rose-200 hover:text-rose-800`}
                              title={t("students.action.delete")}
                              aria-label={t("students.action.delete")}
                              onClick={() => setConfirmDeleteRow(row)}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {profileCard ? (
        <section className="neo-card overflow-hidden border border-[#d9e4f0] bg-gradient-to-br from-[#fffdf9] via-[#f8fbff] to-[#eef4fb] p-0">
          <div className="flex items-start justify-between gap-3">
            <div className="w-full border-b border-[#e1e9f2] px-4 py-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#2d3436]">Student Profile Card</h3>
            </div>
            <button
              type="button"
              onClick={() => setProfileCard(null)}
              className="mr-3 mt-3 rounded-full bg-[#faf7f0] px-3 py-1 text-xs font-semibold text-[#636e72] ring-1 ring-[#ebe4d9] transition hover:bg-white"
            >
              Close
            </button>
          </div>
          <div className="px-4 pb-4 pt-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 ring-1 ring-[#e3ebf5]">
            <div className="h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-[#d0dfef]">
              <AuthenticatedStudentPhoto
                studentId={profileCard.id}
                hasPhoto={profileCard.hasPassportPhoto}
                alt="Student profile"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-base font-bold text-[#2d3436]">{profileCard.fullName}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#636e72]">
                {profileCard.className ?? "Unassigned"} {profileCard.sectionName ? `- ${profileCard.sectionName}` : ""}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">{t("students.col.admission")}:</span> {profileCard.admissionNumber}</p>
            <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">{t("students.col.class")}:</span> {profileCard.className ?? "—"}</p>
            <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">{t("students.col.section")}:</span> {profileCard.sectionName ?? "—"}</p>
            <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">{t("students.col.dob")}:</span> {profileCard.dateOfBirthFormatted ?? "—"}</p>
            <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">{t("students.col.nationality")}:</span> {profileCard.nationality ?? "—"}</p>
            <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">{t("students.col.country")}:</span> {profileCard.countryName ?? profileCard.countryCode ?? "—"}</p>
            <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">{t("students.col.district")}:</span> {profileCard.district ?? "—"}</p>
            <p className="rounded-xl bg-white/80 px-3 py-2"><span className="font-semibold text-[#636e72]">{t("students.col.registrationType")}:</span> {profileCard.registrationType}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#dce6f2] pt-3">
            <button
              type="button"
              onClick={() => {
                setModalInitialEdit(true);
                setModalId(profileCard.id);
              }}
              className="rounded-full bg-[#e8f2fa] px-4 py-1.5 text-xs font-semibold text-[#2d3436]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteRow(profileCard)}
              className="rounded-full bg-[#fce8e5] px-4 py-1.5 text-xs font-semibold text-[#a9332a]"
            >
              Delete
            </button>
          </div>
          </div>
        </section>
      ) : null}

      <StudentDetailModal
        studentId={modalId}
        initialEditing={modalInitialEdit}
        onClose={() => {
          setModalId(null);
          setModalInitialEdit(false);
        }}
        onChanged={reloadList}
        onSaved={(studentName) => {
          setUpdatedStudentNotice(studentName);
          const id = modalId;
          if (id != null && profileCard?.id === id) {
            void fetchStudent(id).then((row) => setProfileCard(row));
          }
          setModalId(null);
          setModalInitialEdit(false);
        }}
      />
    </>
  );
}
