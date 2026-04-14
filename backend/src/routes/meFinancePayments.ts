import { Router } from "express";
import { Op } from "sequelize";
import { studentToApiRow } from "../formatting/studentRow.js";
import {
  ClassRoom,
  Student,
  StudentFeeAssignment,
  StudentFeePayment,
  StudentFeeReceipt,
  StudentFeeStructure,
} from "../models/index.js";
import { calculatePaymentSummary } from "../services/pythonCalc.js";

function trimStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function parseMoneyUgx(v: unknown): number | null {
  if (typeof v !== "number" && typeof v !== "string") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function ymd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type FeeStructureStatus = "day_half" | "day_full" | "day_full_p7" | "boarding";

function normalizeBoardingStatus(v: unknown): "day_half" | "day_full" | "boarding" | null {
  if (v === "day_half" || v === "day_full" || v === "boarding") return v;
  return null;
}

function isP7Class(className: string | null | undefined): boolean {
  const v = (className ?? "").trim().toLowerCase();
  return v.includes("p7") || v.includes("primary seven");
}

function toFeeStructureStatus(
  boardingStatus: "day_half" | "day_full" | "boarding" | null,
  className: string | null | undefined,
): FeeStructureStatus | null {
  if (boardingStatus === "day_full" && isP7Class(className)) return "day_full_p7";
  return boardingStatus;
}

function studentClassName(student: Student): string | null {
  const assoc = student.get("classRoom") as { name?: string } | null | undefined;
  const fromAssoc = typeof assoc?.name === "string" ? assoc.name : null;
  const fromFlat = student.get("class_name") as string | null | undefined;
  return fromAssoc ?? fromFlat ?? null;
}

export function createMeFinancePaymentsRouter() {
  const r = Router();

  r.post("/finance/payments", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const studentId = Number(body.studentId);
      const term = trimStr(body.term, 20);
      const paymentMethod = trimStr(body.paymentMethod, 40);
      const paidBy = trimStr(body.paidBy, 120);
      const amountPaidUgx = parseMoneyUgx(body.amountPaid);
      const requestedDue = parseMoneyUgx(body.amountDueUgx);
      const changeReason = trimStr(body.changeReason, 255);


      if (!Number.isFinite(studentId) || studentId < 1) {
        return res.status(400).json({ error: "Invalid studentId" });
      }
      if (!term) return res.status(400).json({ error: "term is required" });
      if (!paymentMethod) {
        return res.status(400).json({ error: "paymentMethod is required" });
      }
      if (!paidBy) return res.status(400).json({ error: "paidBy is required" });
      if (amountPaidUgx == null || amountPaidUgx <= 0) {
        return res.status(400).json({ error: "amountPaid must be greater than zero" });
      }

      const student = await Student.findByPk(studentId, {
        include: [{ model: ClassRoom, as: "classRoom", required: false }],
      });
      if (!student) return res.status(404).json({ error: "Student not found" });

      if (requestedDue != null && requestedDue > 0) {
        const [assignment] = await StudentFeeAssignment.findOrCreate({
          where: { studentId, term },
          defaults: { amountDueUgx: requestedDue, notes: null },
        });
        if (Number(assignment.amountDueUgx) !== requestedDue) {
          await assignment.update({ amountDueUgx: requestedDue });
        }
      }
      const assignment = await StudentFeeAssignment.findOne({ where: { studentId, term } });
      const boardingStatus = normalizeBoardingStatus(student.boardingStatus);
      const className = studentClassName(student);
      const feeStatus = toFeeStructureStatus(boardingStatus, className);
      const structure =
        assignment == null && feeStatus != null
          ? await StudentFeeStructure.findOne({ where: { term, boardingStatus: feeStatus } })
          : null;
      if (assignment == null && structure != null) {
        await StudentFeeAssignment.create({
          studentId,
          term,
          amountDueUgx: Number(structure.amountDueUgx),
          notes: structure.notes ?? null,
        });
      }
      const sumRaw = await StudentFeePayment.sum("amount_paid_ugx", { where: { studentId, term } });
      const previousPaidUgx = Math.max(Number(sumRaw ?? 0) || 0, 0);
      const targetDue =
        assignment != null
          ? Number(assignment.amountDueUgx)
          : structure != null
            ? Number(structure.amountDueUgx)
            : previousPaidUgx + amountPaidUgx;
      const summary = await calculatePaymentSummary({
        previousPaidUgx,
        amountPaidUgx,
        targetDueUgx: targetDue,
      });
      const totalFeesDueUgx = summary.totalFeesDueUgx;
      const outstandingAfterUgx = summary.outstandingAfterUgx;
      const creditAmountUgx = summary.creditAmountUgx;

      const createdReceipt = await StudentFeeReceipt.create({
        studentId,
        receiptNo: "PENDING",
        term,
        paymentMethod,
        paidBy,
        amountPaidUgx,
        previousPaidUgx,
        totalFeesDueUgx,
        outstandingAfterUgx,
        creditAmountUgx,
      });
      await createdReceipt.update({
        receiptNo: `ST-${String(createdReceipt.id).padStart(5, "0")}`,
      });

      await StudentFeePayment.create({
        studentId,
        term,
        amountPaidUgx,
        paymentMethod,
        paidBy,
        receiptId: createdReceipt.id,
        changeReason,
      });


      return res.status(201).json({
        item: {
          id: createdReceipt.id,
          receiptNo: createdReceipt.receiptNo,
          issuedAt:
            createdReceipt.createdAt ??
            (createdReceipt.get("created_at") as Date | string | undefined) ??
            new Date().toISOString(),
          term: createdReceipt.term,
          paymentMethod: createdReceipt.paymentMethod,
          paidBy: createdReceipt.paidBy,
          amountPaid: Number(createdReceipt.amountPaidUgx),
          previousPaid: Number(createdReceipt.previousPaidUgx),
          totalFeesDue: Number(createdReceipt.totalFeesDueUgx),
          outstandingAfter: Number(createdReceipt.outstandingAfterUgx),
          creditAmount: Number(createdReceipt.creditAmountUgx),
          student: studentToApiRow(student),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/finance/receipts/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      const receipt = await StudentFeeReceipt.findByPk(id);
      if (!receipt) return res.status(404).json({ error: "Not found" });
      const student = await Student.findByPk(receipt.studentId, {
        include: [{ model: ClassRoom, as: "classRoom", required: false }],
      });
      if (!student) return res.status(404).json({ error: "Student not found" });
      return res.json({
        item: {
          id: receipt.id,
          receiptNo: receipt.receiptNo,
          issuedAt:
            receipt.createdAt ??
            (receipt.get("created_at") as Date | string | undefined) ??
            new Date().toISOString(),
          term: receipt.term,
          paymentMethod: receipt.paymentMethod,
          paidBy: receipt.paidBy,
          amountPaid: Number(receipt.amountPaidUgx),
          previousPaid: Number(receipt.previousPaidUgx),
          totalFeesDue: Number(receipt.totalFeesDueUgx),
          outstandingAfter: Number(receipt.outstandingAfterUgx),
          creditAmount: Number(receipt.creditAmountUgx),
          student: studentToApiRow(student),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/finance/receipts", async (req, res) => {
    try {
      const studentIdRaw = Number(req.query.studentId);
      const termRaw = typeof req.query.term === "string" ? req.query.term.trim() : "";
      const lim = Number.parseInt(String(req.query.limit ?? "50"), 10);
      const limit = Number.isFinite(lim) ? Math.max(1, Math.min(200, lim)) : 50;
      const where: Record<string, unknown> = {};
      if (Number.isFinite(studentIdRaw) && studentIdRaw > 0) where.studentId = studentIdRaw;
      if (termRaw) where.term = termRaw;
      const rows = await StudentFeeReceipt.findAll({
        where,
        order: [["created_at", "DESC"]],
        limit,
      });
      return res.json({
        items: rows.map((x) => ({
          id: x.id,
          receiptNo: x.receiptNo,
          issuedAt:
            x.createdAt ??
            (x.get("created_at") as Date | string | undefined) ??
            new Date().toISOString(),
          studentId: x.studentId,
          term: x.term,
          amountPaid: Number(x.amountPaidUgx),
          paymentMethod: x.paymentMethod,
          paidBy: x.paidBy,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/finance/receipts/by-date", async (req, res) => {
    try {
      const dateRaw = typeof req.query.date === "string" ? req.query.date.trim() : ymd();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
        return res.status(400).json({ error: "Invalid date" });
      }
      const start = `${dateRaw} 00:00:00`;
      const end = `${dateRaw} 23:59:59`;
      const rows = await StudentFeeReceipt.findAll({
        where: {
          createdAt: { [Op.between]: [start, end] },
        },
        order: [["created_at", "ASC"]],
      });
      return res.json({
        items: rows.map((x) => ({
          id: x.id,
          receiptNo: x.receiptNo,
          term: x.term,
          amountPaid: Number(x.amountPaidUgx),
          paymentMethod: x.paymentMethod,
          paidBy: x.paidBy,
          studentId: x.studentId,
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
