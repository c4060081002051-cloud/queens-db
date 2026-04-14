import { useEffect, useState } from "react";
import {
  fetchAuthorizedReportUsers,
  fetchDailyFinanceReports,
  reopenDailyReport,
  sealDailyReport,
  takeReportForReview,
} from "../../../api/financeReports";
import type { AuthorizedReportUser } from "../../../api/financeReports";
import { formatCurrencyUGX } from "../shared/financeFormat";
import type { FinanceReportRow } from "../shared/financeTypes";

type ModalMode =
  | { type: "none" }
  | { type: "seal"; report: FinanceReportRow }
  | { type: "reopen"; report: FinanceReportRow };

export function AdminDailyReportsPage({ onViewLedger }: { onViewLedger?: (date: string) => void }) {
  const [rows, setRows] = useState<FinanceReportRow[]>([]);

  const [users, setUsers] = useState<AuthorizedReportUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>({ type: "none" });
  const [modalNotes, setModalNotes] = useState("");
  const [modalReason, setModalReason] = useState("");
  const [modalUserId, setModalUserId] = useState<number | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetchDailyFinanceReports(45)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
    void fetchAuthorizedReportUsers()
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load authorized users"));
  }, []);

  const onTakeReview = async (id: number) => {
    try {
      await takeReportForReview(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to take for review");
    }
  };

  const openSealModal = (report: FinanceReportRow) => {
    setModal({ type: "seal", report });
    setModalNotes("");
    setModalError(null);
  };

  const openReopenModal = (report: FinanceReportRow) => {
    setModal({ type: "reopen", report });
    setModalReason("");
    setModalUserId(users.length > 0 ? users[0].id : null);
    setModalError(null);
  };

  const closeModal = () => {
    setModal({ type: "none" });
    setModalError(null);
    setModalNotes("");
    setModalReason("");
  };

  const doSeal = async () => {
    if (modal.type !== "seal") return;
    if (!modalNotes.trim()) {
      setModalError("Admin comment is required before sealing.");
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await sealDailyReport(modal.report.id, modalNotes.trim());
      closeModal();
      load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed to seal report");
    } finally {
      setModalSubmitting(false);
    }
  };

  const doReopen = async () => {
    if (modal.type !== "reopen") return;
    if (!modalReason.trim()) {
      setModalError("Reason for reopening is required.");
      return;
    }
    if (!modalUserId) {
      setModalError("Please select a user to assign.");
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await reopenDailyReport(modal.report.id, modalReason.trim(), modalUserId);
      closeModal();
      load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed to reopen report");
    } finally {
      setModalSubmitting(false);
    }
  };

  const pendingCount = rows.filter((r) => r.status === "submitted").length;
  const reviewCount = rows.filter((r) => r.status === "admin_review").length;
  const sealedCount = rows.filter((r) => r.status === "closed").length;

  if (loading && rows.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 256 }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "4px solid #e2e8f0",
            borderTopColor: "#0c2340",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 24px",
            borderLeft: "5px solid #f59e0b",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Pending Review
            </p>
            <h3 style={{ margin: "4px 0 0", fontSize: "1.6rem", fontWeight: 800, color: "#d97706" }}>
              {pendingCount}
            </h3>
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "#fffbeb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
            }}
          >
            🔔
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 24px",
            borderLeft: "5px solid #3b82f6",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Under Admin Review
            </p>
            <h3 style={{ margin: "4px 0 0", fontSize: "1.6rem", fontWeight: 800, color: "#2563eb" }}>
              {reviewCount}
            </h3>
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
            }}
          >
            🔍
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 24px",
            borderLeft: "5px solid #22c55e",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#14532d", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Sealed & Closed
            </p>
            <h3 style={{ margin: "4px 0 0", fontSize: "1.6rem", fontWeight: 800, color: "#16a34a" }}>
              {sealedCount}
            </h3>
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "#f0fdf4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
            }}
          >
            ✅
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>⚠️</span>
          <p style={{ margin: 0, color: "#991b1b", fontSize: "0.85rem", fontWeight: 600 }}>
            {error}
          </p>
        </div>
      )}

      {/* Reports Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Report Date", "Submitted By", "Inflow", "Outflow", "Net", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 20px",
                      textAlign: h === "Inflow" || h === "Outflow" || h === "Net" ? "right" : h === "Actions" ? "center" : "left",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottom: "2px solid #e2e8f0",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <>
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      background: expandedId === row.id ? "#f8fafc" : undefined,
                    }}
                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    onMouseOver={(e) => { if (expandedId !== row.id) e.currentTarget.style.background = "#fafbfc"; }}
                    onMouseOut={(e) => { if (expandedId !== row.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>
                        {new Date(row.reportDate + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                        {row.submittedBy || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right", fontSize: "0.9rem", fontWeight: 700, color: "#059669" }}>
                      +{formatCurrencyUGX(row.totalEarnings)}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right", fontSize: "0.9rem", fontWeight: 700, color: "#dc2626" }}>
                      -{formatCurrencyUGX(row.totalExpenditure)}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right", fontSize: "0.9rem", fontWeight: 800, color: row.netTotal >= 0 ? "#0c2340" : "#dc2626" }}>
                      {formatCurrencyUGX(row.netTotal)}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <StatusBadge status={row.status} isReopened={row.isReopened} />
                      {row.reopenedForUserEmail && (
                        <p style={{ margin: "4px 0 0", fontSize: "0.65rem", fontWeight: 700, color: "#7c3aed" }}>
                          Assigned: {row.reopenedForUserEmail}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                        {row.status === "submitted" && (
                          <ActionButton
                            onClick={(e) => {
                              e.stopPropagation();
                              void onTakeReview(row.id);
                            }}
                            label="Take for Review"
                            icon="🔍"
                            variant="blue"
                          />
                        )}
                        {row.status === "admin_review" && (
                          <>
                            <ActionButton
                              onClick={(e) => {
                                e.stopPropagation();
                                openSealModal(row);
                              }}
                              label="Seal Report"
                              icon="🔒"
                              variant="green"
                            />
                            <ActionButton
                              onClick={(e) => {
                                e.stopPropagation();
                                openReopenModal(row);
                              }}
                              label="Reopen"
                              icon="↩️"
                              variant="orange"
                            />
                          </>
                        )}
                        {row.status === "closed" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              🔒 Permanently Sealed
                            </span>
                          </div>
                        )}
                        {row.status === "not_submitted" && !row.isReopened && (
                          <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontStyle: "italic" }}>Awaiting submission</span>
                        )}
                        {row.status === "not_submitted" && row.isReopened && (
                          <span style={{ fontSize: "0.7rem", color: "#7c3aed", fontWeight: 600 }}>↻ Awaiting re-submission</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {expandedId === row.id && (
                    <tr key={`${row.id}-detail`}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div
                          style={{
                            background: "#f8fafc",
                            borderTop: "2px solid #e2e8f0",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "20px 24px",
                          }}
                        >
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                            {/* Admin Notes */}
                            <div>
                              <p style={{ margin: "0 0 6px", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                Admin Comment
                              </p>
                              <p style={{ margin: 0, fontSize: "0.85rem", color: "#1e293b", fontWeight: 500, fontStyle: row.adminNotes ? "normal" : "italic" }}>
                                {row.adminNotes || "No comment yet."}
                              </p>
                            </div>

                            {/* Reopen Info */}
                            <div>
                              <p style={{ margin: "0 0 6px", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                Reopen Details
                              </p>
                              {row.isReopened ? (
                                <div>
                                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#7c3aed", fontWeight: 600 }}>
                                    {row.reopenedReason || "No reason provided."}
                                  </p>
                                  {row.reopenedForUserEmail && (
                                    <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#6d28d9" }}>
                                      Assigned to: <strong>{row.reopenedForUserEmail}</strong>
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic" }}>
                                  Not reopened.
                                </p>
                              )}
                            </div>

                            {/* Financial Summary */}
                            <div>
                              <p style={{ margin: "0 0 6px", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                Financial Summary
                              </p>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Total Income:</span>
                                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#059669" }}>{formatCurrencyUGX(row.totalEarnings)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Total Expenses:</span>
                                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626" }}>{formatCurrencyUGX(row.totalExpenditure)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: 4 }}>
                                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>Net Balance:</span>
                                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: row.netTotal >= 0 ? "#0c2340" : "#dc2626" }}>
                                    {formatCurrencyUGX(row.netTotal)}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewLedger?.(row.reportDate);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px 0",
                                  borderRadius: 8,
                                  border: "1px solid #0c2340",
                                  background: "#fff",
                                  color: "#0c2340",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.background = "#0c2340", e.currentTarget.style.color = "#fff")}
                                onMouseOut={(e) => (e.currentTarget.style.background = "#fff", e.currentTarget.style.color = "#0c2340")}
                              >
                                📄 View Detailed Ledger
                              </button>
                            </div>

                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: "60px 20px", fontStyle: "italic" }}>
                    <span style={{ display: "block", fontSize: "2.5rem", marginBottom: 12, opacity: 0.2 }}>📂</span>
                    No financial reports found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Overlay ── */}
      {modal.type !== "none" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: 32,
              maxWidth: 480,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Seal Modal ── */}
            {modal.type === "seal" && (
              <>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      background: "#f0fdf4",
                      color: "#16a34a",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.8rem",
                      margin: "0 auto 12px",
                    }}
                  >
                    🔒
                  </div>
                  <h3 style={{ margin: 0, color: "#0c2340", fontWeight: 800, fontSize: "1.2rem" }}>
                    Seal Report Permanently
                  </h3>
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                    Report for{" "}
                    <strong>
                      {new Date(modal.report.reportDate + "T00:00:00").toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </strong>
                  </p>
                  <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.75rem" }}>
                    This action is permanent. The report will be recorded as audited and closed.
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#334155",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    💬 ADMIN COMMENT *
                  </label>
                  <textarea
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Reviewed and approved. All figures verified..."
                    style={{
                      width: "100%",
                      height: 100,
                      borderRadius: 12,
                      border: "2px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "0.9rem",
                      boxSizing: "border-box",
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#22c55e")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                {modalError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                    <p style={{ margin: 0, color: "#991b1b", fontSize: "0.8rem", fontWeight: 600 }}>⚠️ {modalError}</p>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      height: 46,
                      borderRadius: 12,
                      border: "2px solid #e2e8f0",
                      background: "#fff",
                      color: "#64748b",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void doSeal()}
                    disabled={modalSubmitting}
                    style={{
                      height: 46,
                      borderRadius: 12,
                      border: "none",
                      background: "linear-gradient(135deg, #059669, #16a34a)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: modalSubmitting ? "not-allowed" : "pointer",
                      opacity: modalSubmitting ? 0.6 : 1,
                    }}
                  >
                    {modalSubmitting ? "Sealing..." : "🔒 Seal & Close"}
                  </button>
                </div>
              </>
            )}

            {/* ── Reopen Modal ── */}
            {modal.type === "reopen" && (
              <>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      background: "#ede9fe",
                      color: "#7c3aed",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.8rem",
                      margin: "0 auto 12px",
                    }}
                  >
                    🔓
                  </div>
                  <h3 style={{ margin: 0, color: "#0c2340", fontWeight: 800, fontSize: "1.2rem" }}>
                    Reopen Report for Corrections
                  </h3>
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                    Report for{" "}
                    <strong>
                      {new Date(modal.report.reportDate + "T00:00:00").toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </strong>
                  </p>
                  <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.75rem" }}>
                    Select a user to assign and provide a reason for reopening.
                  </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#334155",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    👤 ASSIGN TO USER *
                  </label>
                  <select
                    value={modalUserId ?? ""}
                    onChange={(e) => setModalUserId(Number(e.target.value) || null)}
                    style={{
                      width: "100%",
                      height: 48,
                      borderRadius: 12,
                      border: "2px solid #e2e8f0",
                      padding: "0 16px",
                      fontSize: "0.9rem",
                      boxSizing: "border-box",
                      background: "#fff",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email} ({u.role})
                      </option>
                    ))}
                  </select>
                  {users.length === 0 && (
                    <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#dc2626", fontWeight: 600 }}>
                      No authorized non-admin users found.
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#7c3aed",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    💬 REASON FOR REOPENING *
                  </label>
                  <textarea
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    placeholder="e.g., Missing expense entry, incorrect payment recorded..."
                    style={{
                      width: "100%",
                      height: 90,
                      borderRadius: 12,
                      border: "2px solid #8b5cf6",
                      padding: "12px 16px",
                      fontSize: "0.9rem",
                      boxSizing: "border-box",
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                {modalError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                    <p style={{ margin: 0, color: "#991b1b", fontSize: "0.8rem", fontWeight: 600 }}>⚠️ {modalError}</p>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      height: 46,
                      borderRadius: 12,
                      border: "2px solid #e2e8f0",
                      background: "#fff",
                      color: "#64748b",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void doReopen()}
                    disabled={modalSubmitting}
                    style={{
                      height: 46,
                      borderRadius: 12,
                      border: "none",
                      background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: modalSubmitting ? "not-allowed" : "pointer",
                      opacity: modalSubmitting ? 0.6 : 1,
                    }}
                  >
                    {modalSubmitting ? "Reopening..." : "🔓 Reopen & Assign"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, isReopened }: { status: string; isReopened: boolean }) {
  const configs: Record<string, { bg: string; color: string; border: string }> = {
    submitted: { bg: "#fffbeb", color: "#d97706", border: "#fcd34d" },
    admin_review: { bg: "#eff6ff", color: "#1e40af", border: "#93c5fd" },
    closed: { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
    not_submitted: { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  };

  const label = status.replace(/_/g, " ").toUpperCase();
  const c = configs[status] || configs.not_submitted;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
      <span
        style={{
          display: "inline-block",
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: "0.65rem",
          fontWeight: 800,
          background: c.bg,
          color: c.color,
          border: `1px solid ${c.border}`,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      {isReopened && (
        <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase" }}>
          ✨ Reopened
        </span>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  icon,
  variant,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  icon: string;
  variant: "blue" | "green" | "orange";
}) {
  const styles = {
    blue: { bg: "#eff6ff", color: "#1e40af", hoverBg: "#dbeafe" },
    green: { bg: "#f0fdf4", color: "#166534", hoverBg: "#dcfce7" },
    orange: { bg: "#fff7ed", color: "#9a3412", hoverBg: "#ffedd5" },
  };
  const s = styles[variant];

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: "0.75rem",
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = s.hoverBg)}
      onMouseOut={(e) => (e.currentTarget.style.background = s.bg)}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
