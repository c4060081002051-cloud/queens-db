import { Router } from "express";
import { Op, fn, col } from "sequelize";
import {
  ClassRoom,
  DailyExpenseEntry,
  DailyFinanceReport,
  DailyFinanceReportAudit,
  Student,
  StudentFeeAssignment,
  StudentFeePayment,
  StudentFeeStructure,
  User,
} from "../models/index.js";

function ymd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type ReportStatus = "not_submitted" | "submitted" | "admin_review" | "closed";

async function appendAudit(reportId: number, actorUserId: number | null, action: string, note?: string | null) {
  await DailyFinanceReportAudit.create({
    reportId,
    actorUserId,
    action,
    note: note ?? null,
  });
}

async function requestRole(userId: number | null | undefined): Promise<string> {
  if (!userId) return "";
  const user = await User.findByPk(userId, { attributes: ["id", "role"] });
  return (user?.role ?? "").trim().toLowerCase();
}

async function ensureAdmin(userId: number | null | undefined): Promise<boolean> {
  return (await requestRole(userId)) === "admin";
}

export function createMeFinanceReportsRouter() {
  const r = Router();

  r.get("/finance/reports/daily", async (req, res) => {
    try {
      const isAdmin = await ensureAdmin(req.userId ?? null);
      // #region agent log
      fetch("http://127.0.0.1:7892/ingest/16abbfe8-e461-4655-b535-5e0791d093a7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6885fa" },
        body: JSON.stringify({
          sessionId: "6885fa",
          runId: "initial",
          hypothesisId: "H2",
          location: "backend/src/routes/meFinanceReports.ts:52",
          message: "daily_reports_access_check",
          data: { userId: req.userId ?? null, isAdmin },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin only" });
      }
      const lim = Number.parseInt(String(req.query.limit ?? "30"), 10);
      const limit = Number.isFinite(lim) ? Math.max(1, Math.min(90, lim)) : 30;
      const rows = await DailyFinanceReport.findAll({
        include: [
          { model: User, as: "submittedBy", required: false },
          { model: User, as: "reopenedFor", required: false },
        ],
        order: [["report_date", "DESC"]],
        limit,
      });
      const reportDates = rows.map((rpt) => rpt.reportDate);
      const paymentsByDate = await StudentFeePayment.findAll({
        attributes: [[fn("DATE", col("created_at")), "d"], [fn("SUM", col("amount_paid_ugx")), "v"]],
        where:
          reportDates.length > 0
            ? {
                createdAt: {
                  [Op.between]: [
                    `${reportDates[reportDates.length - 1]} 00:00:00`,
                    `${reportDates[0]} 23:59:59`,
                  ],
                },
              }
            : undefined,
        group: [fn("DATE", col("created_at"))],
      });
      const expensesByDate = await DailyExpenseEntry.findAll({
        attributes: [["expense_date", "d"], [fn("SUM", col("amount_ugx")), "v"]],
        where: reportDates.length > 0 ? { expenseDate: { [Op.in]: reportDates } } : undefined,
        group: ["expense_date"],
      });

      const incomeMap = new Map<string, number>();
      for (const row of paymentsByDate) {
        const d = String(row.get("d"));
        incomeMap.set(d, Number(row.get("v") ?? 0) || 0);
      }
      const expenseMap = new Map<string, number>();
      for (const row of expensesByDate) {
        const d = String(row.get("d"));
        expenseMap.set(d, Number(row.get("v") ?? 0) || 0);
      }

      return res.json({
        items: rows.map((rpt) => {
          const inVal = incomeMap.get(rpt.reportDate) ?? 0;
          const outVal = expenseMap.get(rpt.reportDate) ?? 0;
          const sBy = rpt.get("submittedBy") as User | null;
          const reopenedFor = rpt.get("reopenedFor") as User | null;
          return {
            id: rpt.id,
            reportDate: rpt.reportDate,
            status: rpt.status,
            submittedBy: sBy?.email ?? null,
            isReopened: rpt.isReopened,
            reopenedReason: rpt.reopenedReason ?? null,
            reopenedForUserId: rpt.reopenedForUserId ?? null,
            reopenedForUserEmail: reopenedFor?.email ?? null,
            adminNotes: rpt.adminNotes ?? null,
            totalEarnings: inVal,
            totalExpenditure: outVal,
            netTotal: inVal - outVal,
          };
        }),
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/finance/reports/daily/submit", async (req, res) => {
    try {
      const isAdmin = await ensureAdmin(req.userId ?? null);
      // #region agent log
      fetch("http://127.0.0.1:7892/ingest/16abbfe8-e461-4655-b535-5e0791d093a7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6885fa" },
        body: JSON.stringify({
          sessionId: "6885fa",
          runId: "initial",
          hypothesisId: "H3",
          location: "backend/src/routes/meFinanceReports.ts:142",
          message: "submit_report_role_check",
          data: { userId: req.userId ?? null, isAdmin },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (isAdmin) {
        return res.status(403).json({ error: "Admin cannot submit reports" });
      }
      const body = req.body as Record<string, unknown>;
      const reportDate =
        typeof body.reportDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.reportDate)
          ? body.reportDate
          : ymd();
      const existing = await DailyFinanceReport.findOne({ where: { reportDate } });
      if (existing?.status === "closed") {
        return res.status(409).json({ error: "Report is sealed. Admin must reopen it first." });
      }
      if (existing?.reopenedForUserId && existing.reopenedForUserId !== req.userId) {
        return res.status(403).json({ error: "This reopened report is assigned to a different user." });
      }
      const [row] = await DailyFinanceReport.findOrCreate({
        where: { reportDate },
        defaults: {
          status: "submitted",
          submittedByUserId: req.userId ?? null,
          submittedAt: new Date(),
          isReopened: false,
        },
      });
      await row.update({
        status: "submitted",
        submittedByUserId: req.userId ?? null,
        submittedAt: new Date(),
        reopenedForUserId: null,
        isReopened: false,
        reopenedReason: null,
      });
      await appendAudit(row.id, req.userId ?? null, "submit_report");
      return res.json({ ok: true, id: row.id, status: row.status });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/finance/reports/daily/:id/take-review", async (req, res) => {
    try {
      if (!(await ensureAdmin(req.userId ?? null))) {
        return res.status(403).json({ error: "Admin only" });
      }
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      const row = await DailyFinanceReport.findByPk(id);
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.status !== "submitted") {
        return res.status(409).json({ error: "Only submitted reports can be reviewed" });
      }
      await row.update({
        status: "admin_review",
        reviewedByUserId: req.userId ?? null,
        reviewedAt: new Date(),
      });
      await appendAudit(id, req.userId ?? null, "take_review");
      return res.json({ ok: true, id, status: row.status });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  async function sealReport(id: number, actorUserId: number | null | undefined, adminNotes: string) {
    const row = await DailyFinanceReport.findByPk(id);
    if (!row) return { status: 404 as const, body: { error: "Not found" } };
    if (row.status !== "admin_review") {
      return { status: 409 as const, body: { error: "Only reports in admin review can be sealed" } };
    }
    await row.update({
      status: "closed",
      closedByUserId: actorUserId ?? null,
      closedAt: new Date(),
      adminNotes,
    });
    await appendAudit(id, actorUserId ?? null, "seal_report", adminNotes);
    return { status: 200 as const, body: { ok: true, id, status: row.status } };
  }

  r.post("/finance/reports/daily/:id/seal", async (req, res) => {
    try {
      if (!(await ensureAdmin(req.userId ?? null))) {
        return res.status(403).json({ error: "Admin only" });
      }
      const id = Number(req.params.id);
      const body = req.body as Record<string, unknown>;
      const adminNotes =
        typeof body.adminNotes === "string" ? body.adminNotes.trim().slice(0, 500) : "";
      // #region agent log
      fetch("http://127.0.0.1:7892/ingest/16abbfe8-e461-4655-b535-5e0791d093a7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6885fa" },
        body: JSON.stringify({
          sessionId: "6885fa",
          runId: "initial",
          hypothesisId: "H4",
          location: "backend/src/routes/meFinanceReports.ts:236",
          message: "seal_report_input",
          data: { reportId: id, hasComment: adminNotes.length > 0, commentLength: adminNotes.length },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      if (!adminNotes) return res.status(400).json({ error: "Admin comment is required before sealing" });
      const result = await sealReport(id, req.userId ?? null, adminNotes);
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  // Backward-compatible alias.
  r.post("/finance/reports/daily/:id/close", async (req, res) => {
    try {
      if (!(await ensureAdmin(req.userId ?? null))) {
        return res.status(403).json({ error: "Admin only" });
      }
      const id = Number(req.params.id);
      const body = req.body as Record<string, unknown>;
      const adminNotes =
        typeof body.adminNotes === "string" ? body.adminNotes.trim().slice(0, 500) : "";
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      if (!adminNotes) return res.status(400).json({ error: "Admin comment is required before sealing" });
      const result = await sealReport(id, req.userId ?? null, adminNotes);
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/finance/reports/daily/:id/reopen", async (req, res) => {
    try {
      if (!(await ensureAdmin(req.userId ?? null))) {
        return res.status(403).json({ error: "Admin only" });
      }
      const id = Number(req.params.id);
      const body = req.body as Record<string, unknown>;
      const reason =
        typeof body.reason === "string" ? body.reason.trim().slice(0, 255) : "";
      const reopenForUserId = Number(body.reopenForUserId);
      // #region agent log
      fetch("http://127.0.0.1:7892/ingest/16abbfe8-e461-4655-b535-5e0791d093a7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6885fa" },
        body: JSON.stringify({
          sessionId: "6885fa",
          runId: "initial",
          hypothesisId: "H5",
          location: "backend/src/routes/meFinanceReports.ts:286",
          message: "reopen_report_input",
          data: {
            reportId: id,
            hasReason: reason.length > 0,
            reasonLength: reason.length,
            reopenForUserId: Number.isFinite(reopenForUserId) ? reopenForUserId : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      if (!reason) return res.status(400).json({ error: "reason is required" });
      if (!Number.isFinite(reopenForUserId) || reopenForUserId < 1) {
        return res.status(400).json({ error: "reopenForUserId is required" });
      }
      const reopenForUser = await User.findByPk(reopenForUserId, {
        attributes: ["id", "email", "role"],
      });
      if (!reopenForUser) return res.status(404).json({ error: "Assigned user not found" });
      if ((reopenForUser.role ?? "").trim().toLowerCase() === "admin") {
        return res.status(400).json({ error: "Assigned user must be a non-admin authorized user" });
      }
      const row = await DailyFinanceReport.findByPk(id);
      if (!row) return res.status(404).json({ error: "Not found" });
      await row.update({
        status: "not_submitted",
        isReopened: true,
        reopenedReason: reason,
        reopenedForUserId: reopenForUserId,
        adminNotes: null,
      });
      await appendAudit(
        id,
        req.userId ?? null,
        "reopen_report",
        `Reopened for ${reopenForUser.email}. Reason: ${reason}`,
      );
      return res.json({ ok: true, id, status: row.status });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/finance/reports/authorized-users", async (req, res) => {
    try {
      if (!(await ensureAdmin(req.userId ?? null))) {
        return res.status(403).json({ error: "Admin only" });
      }
      const users = await User.findAll({
        attributes: ["id", "email", "role"],
        where: { role: { [Op.ne]: "admin" } },
        order: [["email", "ASC"]],
      });
      return res.json({
        items: users.map((u) => ({ id: u.id, email: u.email, role: u.role })),
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/finance/reports/debtors", async (req, res) => {
    try {
      const term = typeof req.query.term === "string" ? req.query.term.trim() : "2026 Term 1";
      
      // 1. Fetch Students
      const students = await Student.findAll({
        include: [{ model: ClassRoom, as: "classRoom", required: false }],
        order: [["admission_number", "ASC"]],
      });

      // 2. Fetch Assignments for this term
      const assignments = await StudentFeeAssignment.findAll({ where: { term } });
      const assignMap = new Map<number, number>();
      for (const a of assignments) {
        assignMap.set(a.studentId, Number(a.amountDueUgx) || 0);
      }

      // 3. Fetch default Fee Structures for this term
      const structures = await StudentFeeStructure.findAll({ where: { term } });
      const structMap = new Map<string, number>();
      for (const s of structures) {
        structMap.set(s.boardingStatus, Number(s.amountDueUgx) || 0);
      }

      // 4. Fetch Payments for this term
      const payments = await StudentFeePayment.findAll({
        attributes: ["studentId", [fn("SUM", col("amount_paid_ugx")), "totalPaid"]],
        where: { term },
        group: ["student_id"],
      });
      const paidMap = new Map<number, number>();
      for (const p of payments) {
        paidMap.set(p.studentId, Number(p.get("totalPaid")) || 0);
      }

      // 5. Calculate balances
      const debtors = students.map((s) => {
        const assigned = assignMap.get(s.id);
        const totalDue = assigned ?? structMap.get(s.boardingStatus ?? "day_half") ?? 0;
        const totalPaid = paidMap.get(s.id) ?? 0;
        const balance = totalDue - totalPaid;

        const cr = s.get("classRoom") as ClassRoom | null;

        return {
          id: s.id,
          admissionNumber: s.admissionNumber,
          fullName: `${s.firstName} ${s.lastName}`.trim(),
          className: cr?.name ?? "—",
          totalFees: totalDue,
          totalPaid: totalPaid,
          balance: balance,
        };
      }).filter(d => d.balance > 0);

      const totalOutstanding = debtors.reduce((acc, d) => acc + d.balance, 0);

      return res.json({
        term,
        totalOutstanding,
        items: debtors,
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  return r;
}
