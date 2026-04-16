import { Router } from "express";
import {
  Student,
  StudentFeeAssignment,
  StudentFeeStructure,
  ClassRoom,
} from "../models/index.js";

function studentClassName(student: Student): string | null {
  const assoc = student.get("classRoom") as { name?: string } | null | undefined;
  const fromAssoc = typeof assoc?.name === "string" ? assoc.name : null;
  const fromFlat = student.get("class_name") as string | null | undefined;
  return fromAssoc ?? fromFlat ?? null;
}

function isP7Class(className: string | null | undefined): boolean {
  const s = (className ?? "").trim().toLowerCase();
  return s.includes("p7") || s.includes("primary seven");
}

function normalizeStudentBoardingStatus(v: unknown): "day_half" | "day_full" | "boarding" | null {
  if (v === "day_half" || v === "day_full" || v === "boarding") return v;
  return null;
}

function toFeeStructureStatus(
  boardingStatus: "day_half" | "day_full" | "boarding" | null,
  className: string | null | undefined,
): string | null {
  if (boardingStatus === "day_full" && isP7Class(className)) return "day_full_p7";
  return boardingStatus;
}

export function createMeFinanceBurseryRouter() {
  const r = Router();

  /** Assign or update a bursary (percentage discount) for a student. */
  r.post("/finance/bursery", async (req, res) => {
    try {
      const { studentId, percentage, term } = req.body;
      const parsedStudentId = Number(studentId);
      const parsedPercentage = Number(percentage);

      if (!Number.isFinite(parsedStudentId) || parsedStudentId < 1) {
        return res.status(400).json({ error: "Invalid studentId" });
      }
      if (!Number.isFinite(parsedPercentage) || parsedPercentage < 0 || parsedPercentage > 100) {
        return res.status(400).json({ error: "Percentage must be between 0 and 100" });
      }
      if (!term || typeof term !== "string") {
        return res.status(400).json({ error: "Term is required to apply the discount" });
      }

      const student = await Student.findByPk(parsedStudentId, {
        include: [{ model: ClassRoom, as: "classRoom", required: false }],
      });
      if (!student) return res.status(404).json({ error: "Student not found" });

      // 1. Update student bursary percentage
      await student.update({ bursaryPercentage: parsedPercentage });

      // 2. Identify base fee from structure or current assignment
      const boardingStatus = normalizeStudentBoardingStatus(student.boardingStatus);
      const className = studentClassName(student);
      const feeStatus = toFeeStructureStatus(boardingStatus, className);

      const structure = feeStatus
        ? await StudentFeeStructure.findOne({ where: { term, boardingStatus: feeStatus } })
        : null;

      const baseAmount = structure ? Number(structure.amountDueUgx) : 0;
      
      if (baseAmount > 0) {
        const discountedAmount = Math.round(baseAmount * (1 - parsedPercentage / 100));
        
        // 3. Update or Create Assignment
        const [assignment] = await StudentFeeAssignment.findOrCreate({
          where: { studentId: parsedStudentId, term },
          defaults: { amountDueUgx: discountedAmount, notes: `Bursery applied: ${parsedPercentage}%` },
        });
        
        await assignment.update({
          amountDueUgx: discountedAmount,
          notes: parsedPercentage > 0 ? `Bursery applied: ${parsedPercentage}%` : null,
        });
      }

      return res.json({
        ok: true,
        studentId: parsedStudentId,
        bursaryPercentage: parsedPercentage,
        appliedToTerm: term,
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  /** Revoke bursary (reset to 0). */
  r.delete("/finance/bursery/:studentId", async (req, res) => {
    try {
      const studentId = Number(req.params.studentId);
      const { term } = req.body; // Needs term to restore the base fee

      if (!Number.isFinite(studentId) || studentId < 1) {
        return res.status(400).json({ error: "Invalid studentId" });
      }
      if (!term || typeof term !== "string") {
        return res.status(400).json({ error: "Term is required to restore default fees" });
      }

      const student = await Student.findByPk(studentId, {
        include: [{ model: ClassRoom, as: "classRoom", required: false }],
      });
      if (!student) return res.status(404).json({ error: "Student not found" });

      // 1. Reset percentage
      await student.update({ bursaryPercentage: 0 });

      // 2. Restore base fee
      const boardingStatus = normalizeStudentBoardingStatus(student.boardingStatus);
      const className = studentClassName(student);
      const feeStatus = toFeeStructureStatus(boardingStatus, className);

      const structure = feeStatus
        ? await StudentFeeStructure.findOne({ where: { term, boardingStatus: feeStatus } })
        : null;

      const baseAmount = structure ? Number(structure.amountDueUgx) : 0;

      if (baseAmount > 0) {
        const assignment = await StudentFeeAssignment.findOne({ where: { studentId, term } });
        if (assignment) {
          await assignment.update({
            amountDueUgx: baseAmount,
            notes: "Bursery revoked",
          });
        }
      }

      return res.json({
        ok: true,
        studentId,
        bursaryPercentage: 0,
        restoredTerm: term,
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  return r;
}
