import { Router } from "express";
import { studentToApiRow } from "../formatting/studentRow.js";
import {
  ClassRoom,
  Student,
  StudentFeeAssignment,
  StudentFeePayment,
  StudentFeeReceipt,
} from "../models/index.js";

function parseIsoDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

export function createMeFinanceStatementsRouter() {
  const r = Router();

  r.get("/finance/statements/:studentId", async (req, res) => {
    try {
      const studentId = Number(req.params.studentId);
      if (!Number.isFinite(studentId) || studentId < 1) {
        return res.status(400).json({ error: "Invalid studentId" });
      }
      const student = await Student.findByPk(studentId, {
        include: [{ model: ClassRoom, as: "classRoom", required: false }],
      });
      if (!student) return res.status(404).json({ error: "Student not found" });

      const termRaw = typeof req.query.term === "string" ? req.query.term.trim() : "";
      let term = termRaw;
      if (!term) {
        const latestReceipt = await StudentFeeReceipt.findOne({
          where: { studentId },
          order: [["created_at", "DESC"]],
        });
        term = latestReceipt?.term ?? "Term 1";
      }

      const assignment = await StudentFeeAssignment.findOne({ where: { studentId, term } });
      const payments = await StudentFeePayment.findAll({
        where: { studentId, term },
        order: [["created_at", "ASC"]],
      });
      const receipts = await StudentFeeReceipt.findAll({
        where: { studentId, term },
        order: [["created_at", "ASC"]],
      });
      const receiptById = new Map<number, StudentFeeReceipt>();
      for (const rcp of receipts) receiptById.set(rcp.id, rcp);

      const totalAssigned = Number(assignment?.amountDueUgx ?? 0) || 0;
      const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amountPaidUgx) || 0), 0);
      const normalizedAssigned = totalAssigned > 0 ? totalAssigned : totalPaid;
      let runningPaid = 0;

      const transactions = payments.map((p) => {
        const amt = Number(p.amountPaidUgx) || 0;
        runningPaid += amt;
        const receipt =
          p.receiptId != null ? receiptById.get(p.receiptId) ?? null : null;
        return {
          id: p.id,
          date:
            p.createdAt ??
            (p.get("created_at") as Date | string | undefined) ??
            new Date().toISOString(),
          receiptNo: receipt?.receiptNo ?? "—",
          method: p.paymentMethod,
          paidBy: p.paidBy,
          amountPaid: amt,
          runningBalance: Math.max(normalizedAssigned - runningPaid, 0),
        };
      });

      return res.json({
        item: {
          student: studentToApiRow(student),
          term,
          assignedAmount: normalizedAssigned,
          totalPaid,
          outstandingAmount: Math.max(normalizedAssigned - totalPaid, 0),
          creditAmount: Math.max(totalPaid - normalizedAssigned, 0),
          transactions,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/finance/fees/assign", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const studentId = Number(body.studentId);
      const term = typeof body.term === "string" ? body.term.trim() : "";
      const amountDue = Number(body.amountDueUgx);
      const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 255) : null;
      if (!Number.isFinite(studentId) || studentId < 1) {
        return res.status(400).json({ error: "Invalid studentId" });
      }
      if (!term) return res.status(400).json({ error: "term is required" });
      if (!Number.isFinite(amountDue) || amountDue < 0) {
        return res.status(400).json({ error: "amountDueUgx must be a valid non-negative number" });
      }
      const student = await Student.findByPk(studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });
      const [row] = await StudentFeeAssignment.findOrCreate({
        where: { studentId, term },
        defaults: { amountDueUgx: Math.round(amountDue), notes },
      });
      await row.update({ amountDueUgx: Math.round(amountDue), notes });
      return res.status(201).json({
        item: {
          id: row.id,
          studentId: row.studentId,
          term: row.term,
          amountDueUgx: Number(row.amountDueUgx),
          notes: row.notes ?? null,
          createdAt:
            row.createdAt ??
            (row.get("created_at") as Date | string | undefined) ??
            new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/finance/fees/assignments", async (req, res) => {
    try {
      const studentIdRaw = Number(req.query.studentId);
      const termRaw = typeof req.query.term === "string" ? req.query.term.trim() : "";
      const where: Record<string, unknown> = {};
      if (Number.isFinite(studentIdRaw) && studentIdRaw > 0) where.studentId = studentIdRaw;
      if (termRaw) where.term = termRaw;
      const rows = await StudentFeeAssignment.findAll({
        where,
        order: [
          ["term", "ASC"],
          ["created_at", "DESC"],
        ],
      });
      return res.json({
        items: rows.map((x) => ({
          id: x.id,
          studentId: x.studentId,
          term: x.term,
          amountDueUgx: Number(x.amountDueUgx),
          notes: x.notes ?? null,
          createdAt:
            x.createdAt ??
            (x.get("created_at") as Date | string | undefined) ??
            new Date().toISOString(),
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/finance/statements", async (req, res) => {
    try {
      const studentIdRaw = Number(req.query.studentId);
      const onDate = parseIsoDate(req.query.date);
      const lim = Number.parseInt(String(req.query.limit ?? "20"), 10);
      const limit = Number.isFinite(lim) ? Math.max(1, Math.min(100, lim)) : 20;
      const where: Record<string, unknown> = {};
      if (Number.isFinite(studentIdRaw) && studentIdRaw > 0) where.studentId = studentIdRaw;
      if (onDate) where.createdAt = `${onDate}%`;
      const rows = await StudentFeeReceipt.findAll({
        where,
        order: [["created_at", "DESC"]],
        limit,
      });
      return res.json({
        items: rows.map((x) => ({
          id: x.id,
          studentId: x.studentId,
          receiptNo: x.receiptNo,
          term: x.term,
          amountPaid: Number(x.amountPaidUgx),
          totalFeesDue: Number(x.totalFeesDueUgx),
          outstandingAfter: Number(x.outstandingAfterUgx),
          issuedAt:
            x.createdAt ??
            (x.get("created_at") as Date | string | undefined) ??
            new Date().toISOString(),
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  return r;
}
