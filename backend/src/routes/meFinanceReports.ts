import { Router } from "express";
import { Op, fn, col } from "sequelize";
import {
  DailyExpenseEntry,
  DailyFinanceReport,
  DailyFinanceReportAudit,
  StudentFeePayment,
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

export function createMeFinanceReportsRouter() {
  const r = Router();

  r.get("/finance/reports/daily", async (req, res) => {
    try {
      const lim = Number.parseInt(String(req.query.limit ?? "30"), 10);
      const limit = Number.isFinite(lim) ? Math.max(1, Math.min(90, lim)) : 30;
      const rows = await DailyFinanceReport.findAll({
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
          return {
            id: rpt.id,
            reportDate: rpt.reportDate,
            status: rpt.status,
            isReopened: rpt.isReopened,
            reopenedReason: rpt.reopenedReason ?? null,
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
      const body = req.body as Record<string, unknown>;
      const reportDate =
        typeof body.reportDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.reportDate)
          ? body.reportDate
          : ymd();
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
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      const row = await DailyFinanceReport.findByPk(id);
      if (!row) return res.status(404).json({ error: "Not found" });
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

  r.post("/finance/reports/daily/:id/close", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const body = req.body as Record<string, unknown>;
      const adminNotes =
        typeof body.adminNotes === "string" ? body.adminNotes.trim().slice(0, 500) : null;
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      const row = await DailyFinanceReport.findByPk(id);
      if (!row) return res.status(404).json({ error: "Not found" });
      await row.update({
        status: "closed",
        closedByUserId: req.userId ?? null,
        closedAt: new Date(),
        adminNotes,
      });
      await appendAudit(id, req.userId ?? null, "close_report", adminNotes);
      return res.json({ ok: true, id, status: row.status });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/finance/reports/daily/:id/reopen", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const body = req.body as Record<string, unknown>;
      const reason =
        typeof body.reason === "string" ? body.reason.trim().slice(0, 255) : "";
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      if (!reason) return res.status(400).json({ error: "reason is required" });
      const row = await DailyFinanceReport.findByPk(id);
      if (!row) return res.status(404).json({ error: "Not found" });
      await row.update({
        status: "not_submitted",
        isReopened: true,
        reopenedReason: reason,
        adminNotes: null,
      });
      await appendAudit(id, req.userId ?? null, "reopen_report", reason);
      return res.json({ ok: true, id, status: row.status });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  return r;
}
