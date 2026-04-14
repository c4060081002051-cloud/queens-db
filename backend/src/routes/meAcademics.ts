import { Router } from "express";
import { Op } from "sequelize";
import {
  ClassRoom,
  ClassSection,
  Student,
  StudentAssessmentResult,
  User,
  UserClassAuthorization,
} from "../models/index.js";

const TERM_OPTIONS = ["Term 1", "Term 2", "Term 3"] as const;
const EXAM_TYPE_OPTIONS = ["BOT", "MID", "EOT", "ASSESSMENT"] as const;
type ExamType = (typeof EXAM_TYPE_OPTIONS)[number];

function trimStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeExamType(v: unknown): ExamType | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toUpperCase();
  return EXAM_TYPE_OPTIONS.includes(t as ExamType) ? (t as ExamType) : null;
}

function subjectsForClass(className: string): string[] {
  const c = className.trim().toUpperCase();
  if (c.startsWith("KG")) {
    return [
      "Learning Area (LA) 1",
      "Learning Area (LA) 2",
      "Learning Area (LA) 3",
      "Learning Area (LA) 4",
      "Learning Area (LA) 5",
    ];
  }
  if (c === "P1" || c === "P2" || c === "P3") {
    return [
      "English",
      "Mathematics",
      "Literacy A",
      "Literacy B",
      "Luganda",
      "Religious Education",
    ];
  }
  if (c === "P4" || c === "P5" || c === "P6" || c === "P7") {
    return ["English", "Mathematics", "Social Studies", "Science"];
  }
  return ["English", "Mathematics", "Social Studies", "Science"];
}

async function getUserRole(userId: number): Promise<string> {
  const user = await User.findByPk(userId, { attributes: ["id", "role"] });
  return user?.role?.toLowerCase() ?? "";
}

async function getAccessibleClassrooms(userId: number): Promise<Array<{ id: number; name: string }>> {
  const role = await getUserRole(userId);
  if (role === "admin") {
    const rows = await ClassRoom.findAll({
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });
    return rows.map((x) => ({ id: x.id, name: x.name }));
  }

  const rows = await UserClassAuthorization.findAll({
    where: { userId },
    include: [{ model: ClassRoom, as: "classRoom", attributes: ["id", "name"], required: true }],
    order: [[{ model: ClassRoom, as: "classRoom" }, "name", "ASC"]],
  });
  return rows
    .map((x) => {
      const cls = x.get("classRoom") as ClassRoom | undefined;
      if (!cls) return null;
      return { id: cls.id, name: cls.name };
    })
    .filter((x): x is { id: number; name: string } => x != null);
}

function normalizeClassSortToken(value: string): [number, number] {
  const upper = value.trim().toUpperCase();
  const kg = /^KG(\d+)$/.exec(upper);
  if (kg) return [1, Number(kg[1])];
  const p = /^P(\d+)$/.exec(upper);
  if (p) return [2, Number(p[1])];
  if (upper === "GRADUATED") return [3, 0];
  return [9, 0];
}

export function createMeAcademicsRouter() {
  const r = Router();

  r.get("/academics/result-entry/options", async (req, res) => {
    try {
      const userId = req.userId!;
      const role = await getUserRole(userId);
      const classes = await getAccessibleClassrooms(userId);
      const classIds = classes.map((x) => x.id);
      const sectionRows =
        classIds.length === 0
          ? []
          : await ClassSection.findAll({
              where: { classRoomId: { [Op.in]: classIds } },
              attributes: ["id", "classRoomId", "name"],
              order: [
                ["class_room_id", "ASC"],
                ["name", "ASC"],
              ],
            });
      return res.json({
        authority: role === "admin" ? "full" : "restricted",
        terms: TERM_OPTIONS,
        examTypes: EXAM_TYPE_OPTIONS,
        classes,
        sections: sectionRows.map((x) => ({
          id: x.id,
          classRoomId: x.classRoomId,
          name: x.name,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/academics/performance-summary", async (req, res) => {
    try {
      const userId = req.userId!;
      const term = trimStr(req.query.term, 20) ?? "Term 1";
      const examType = normalizeExamType(req.query.examType) ?? "BOT";
      const classes = await getAccessibleClassrooms(userId);
      const classIds = classes.map((x) => x.id);
      if (classIds.length === 0) return res.json({ rows: [] });

      const students = await Student.findAll({
        where: { classRoomId: { [Op.in]: classIds } },
        attributes: ["id", "classRoomId", "sectionName"],
      });
      const results = await StudentAssessmentResult.findAll({
        where: { term, examType, classRoomId: { [Op.in]: classIds } },
        attributes: ["studentId", "classRoomId", "sectionName", "score"],
      });

      const classNameById = new Map(classes.map((x) => [x.id, x.name]));
      const studentCountMap = new Map<string, number>();
      for (const stu of students) {
        const className = classNameById.get(stu.classRoomId ?? 0) ?? "Unassigned";
        const sectionName = (stu.sectionName ?? "").trim() || "General";
        const k = `${stu.classRoomId ?? 0}::${className}::${sectionName}`;
        studentCountMap.set(k, (studentCountMap.get(k) ?? 0) + 1);
      }

      const resultsMap = new Map<string, { count: number; sum: number; pass: number }>();
      for (const row of results) {
        const className = classNameById.get(row.classRoomId ?? 0) ?? "Unassigned";
        const sectionName = (row.sectionName ?? "").trim() || "General";
        const k = `${row.classRoomId ?? 0}::${className}::${sectionName}`;
        const prev = resultsMap.get(k) ?? { count: 0, sum: 0, pass: 0 };
        const score = Number(row.score) || 0;
        prev.count += 1;
        prev.sum += score;
        if (score >= 50) prev.pass += 1;
        resultsMap.set(k, prev);
      }

      const allKeys = new Set<string>([...studentCountMap.keys(), ...resultsMap.keys()]);
      const rows = Array.from(allKeys)
        .map((k) => {
          const [, className, sectionName] = k.split("::");
          const totalStudents = studentCountMap.get(k) ?? 0;
          const resultStat = resultsMap.get(k) ?? { count: 0, sum: 0, pass: 0 };
          const avgScore = resultStat.count > 0 ? resultStat.sum / resultStat.count : null;
          const passRate = resultStat.count > 0 ? (resultStat.pass / resultStat.count) * 100 : null;
          const enteredStudents = Math.min(totalStudents, resultStat.count);
          return {
            className,
            sectionName,
            totalStudents,
            resultsEntered: enteredStudents,
            avgScore,
            passRate,
          };
        })
        .sort((a, b) => a.className.localeCompare(b.className) || a.sectionName.localeCompare(b.sectionName));

      return res.json({ rows });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/academics/result-entry/students", async (req, res) => {
    try {
      const userId = req.userId!;
      const term = trimStr(req.query.term, 20) ?? "Term 1";
      const examType = normalizeExamType(req.query.examType) ?? "BOT";
      const classRoomId = Number(req.query.classRoomId);
      const sectionName = trimStr(req.query.sectionName, 80);
      if (!Number.isFinite(classRoomId) || classRoomId < 1) {
        return res.status(400).json({ error: "Invalid classRoomId" });
      }

      const classes = await getAccessibleClassrooms(userId);
      if (!classes.some((x) => x.id === classRoomId)) {
        return res.status(403).json({ error: "Not authorized for this class" });
      }

      const where: Record<string, unknown> = { classRoomId };
      if (sectionName) where.sectionName = sectionName;
      const students = await Student.findAll({
        where,
        attributes: ["id", "admissionNumber", "firstName", "middleName", "lastName", "sectionName", "classRoomId"],
        order: [
          ["first_name", "ASC"],
          ["last_name", "ASC"],
        ],
      });
      const ids = students.map((s) => s.id);
      const resultRows =
        ids.length === 0
          ? []
          : await StudentAssessmentResult.findAll({
              where: {
                term,
                examType,
                studentId: { [Op.in]: ids },
              },
              attributes: ["studentId"],
            });
      const hasAnyByStudent = new Set<number>(resultRows.map((x) => x.studentId));

      return res.json({
        items: students.map((s) => ({
          studentId: s.id,
          admissionNumber: s.admissionNumber,
          fullName: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
          classRoomId: s.classRoomId,
          sectionName: s.sectionName ?? null,
          hasResults: hasAnyByStudent.has(s.id),
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/academics/result-entry/pending-students", async (req, res) => {
    try {
      const userId = req.userId!;
      const term = trimStr(req.query.term, 20) ?? "Term 1";
      const examType = normalizeExamType(req.query.examType) ?? "BOT";
      const classes = await getAccessibleClassrooms(userId);
      const classIds = classes.map((x) => x.id);
      if (classIds.length === 0) return res.json({ items: [] });

      const classNameById = new Map(classes.map((x) => [x.id, x.name]));
      const students = await Student.findAll({
        where: { classRoomId: { [Op.in]: classIds } },
        attributes: ["id", "admissionNumber", "firstName", "middleName", "lastName", "sectionName", "classRoomId"],
      });
      const resultRows = await StudentAssessmentResult.findAll({
        where: { term, examType, classRoomId: { [Op.in]: classIds } },
        attributes: ["studentId"],
      });
      const hasRecord = new Set(resultRows.map((x) => x.studentId));
      const items = students
        .filter((s) => !hasRecord.has(s.id))
        .map((s) => {
          const className = classNameById.get(s.classRoomId ?? 0) ?? "Unassigned";
          const sectionName = (s.sectionName ?? "").trim() || "General";
          const fullName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
          return {
            studentId: s.id,
            admissionNumber: s.admissionNumber,
            fullName,
            className,
            sectionName,
            classRoomId: s.classRoomId,
          };
        })
        .sort((a, b) => {
          const [ag, an] = normalizeClassSortToken(a.className);
          const [bg, bn] = normalizeClassSortToken(b.className);
          if (ag !== bg) return ag - bg;
          if (an !== bn) return an - bn;
          const s = a.sectionName.localeCompare(b.sectionName);
          if (s !== 0) return s;
          return a.fullName.localeCompare(b.fullName);
        });

      return res.json({ items });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/academics/result-entry/student/:studentId", async (req, res) => {
    try {
      const userId = req.userId!;
      const studentId = Number(req.params.studentId);
      const term = trimStr(req.query.term, 20) ?? "Term 1";
      const examType = normalizeExamType(req.query.examType) ?? "BOT";
      if (!Number.isFinite(studentId) || studentId < 1) {
        return res.status(400).json({ error: "Invalid studentId" });
      }
      const student = await Student.findByPk(studentId, {
        include: [{ model: ClassRoom, as: "classRoom", attributes: ["id", "name"], required: false }],
      });
      if (!student || !student.classRoomId) {
        return res.status(404).json({ error: "Student not found" });
      }
      const classes = await getAccessibleClassrooms(userId);
      if (!classes.some((x) => x.id === student.classRoomId)) {
        return res.status(403).json({ error: "Not authorized for this class" });
      }
      const className =
        (student.get("classRoom") as ClassRoom | null | undefined)?.name ??
        classes.find((x) => x.id === student.classRoomId)?.name ??
        "Unknown";
      const subjects = subjectsForClass(className);
      const resultRows = await StudentAssessmentResult.findAll({
        where: { studentId, term, examType, subject: { [Op.in]: subjects } },
        attributes: ["subject", "score"],
      });
      const markBySubject = new Map<string, number>();
      for (const row of resultRows) markBySubject.set(row.subject, Number(row.score) || 0);

      return res.json({
        item: {
          studentId: student.id,
          fullName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
          admissionNumber: student.admissionNumber,
          classRoomId: student.classRoomId,
          className,
          sectionName: student.sectionName ?? null,
          term,
          examType,
          subjects: subjects.map((subject) => ({
            subject,
            score: markBySubject.get(subject) ?? null,
          })),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/academics/result-entry/student/:studentId/marks", async (req, res) => {
    try {
      const userId = req.userId!;
      const studentId = Number(req.params.studentId);
      const body = req.body as Record<string, unknown>;
      const term = trimStr(body.term, 20);
      const examType = normalizeExamType(body.examType);
      const marks = Array.isArray(body.marks) ? body.marks : [];

      if (!Number.isFinite(studentId) || studentId < 1) {
        return res.status(400).json({ error: "Invalid studentId" });
      }
      if (!term) return res.status(400).json({ error: "term is required" });
      if (!examType) return res.status(400).json({ error: "examType is required" });

      const student = await Student.findByPk(studentId, {
        include: [{ model: ClassRoom, as: "classRoom", attributes: ["id", "name"], required: false }],
      });
      if (!student || !student.classRoomId) {
        return res.status(404).json({ error: "Student not found" });
      }
      const classes = await getAccessibleClassrooms(userId);
      if (!classes.some((x) => x.id === student.classRoomId)) {
        return res.status(403).json({ error: "Not authorized for this class" });
      }

      const className =
        (student.get("classRoom") as ClassRoom | null | undefined)?.name ??
        classes.find((x) => x.id === student.classRoomId)?.name ??
        "Unknown";
      const allowedSubjects = new Set(subjectsForClass(className));

      let saved = 0;
      for (const raw of marks) {
        const e = raw as Record<string, unknown>;
        const subject = trimStr(e.subject, 120);
        const scoreRaw = Number(e.score);
        if (!subject || !allowedSubjects.has(subject)) continue;
        if (!Number.isFinite(scoreRaw)) continue;
        const score = Math.max(0, Math.min(100, Number(scoreRaw.toFixed(2))));

        const [row] = await StudentAssessmentResult.findOrCreate({
          where: { studentId, term, examType, subject },
          defaults: {
            classRoomId: student.classRoomId,
            sectionName: student.sectionName ?? null,
            subject,
            score,
            remarks: null,
            enteredByUserId: userId,
          },
        });
        await row.update({
          classRoomId: student.classRoomId,
          sectionName: student.sectionName ?? null,
          subject,
          score,
          remarks: null,
          enteredByUserId: userId,
        });
        saved += 1;
      }

      return res.status(201).json({ ok: true, saved });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  return r;
}
