import { Router } from "express";
import { Op } from "sequelize";
import {
  AcademicExamType,
  AcademicSubjectAssignment,
  ClassCategory,
  ClassRoom,
  ClassSection,
  SchoolSetting,
  Student,
  StudentAssessmentResult,
  User,
  UserClassAuthorization,
} from "../models/index.js";
import {
  divisionForAggregate,
  expectedSubjectCountForClassName,
  gradeForScore,
  parseGradingScale,
  passRateThresholdFromScale,
  type GradingBand,
} from "../lib/grading.js";

const TERM_OPTIONS = ["Term 1", "Term 2", "Term 3"] as const;

function trimStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeExamType(v: unknown, allowedExamTypes: string[]): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toUpperCase();
  return allowedExamTypes.includes(t) ? t : null;
}

async function activeExamTypeKeys(): Promise<string[]> {
  const rows = await AcademicExamType.findAll({
    where: { isActive: true },
    order: [
      ["is_system", "DESC"],
      ["id", "ASC"],
    ],
    attributes: ["examKey"],
  });
  return rows.map((row) => row.examKey.trim().toUpperCase()).filter(Boolean);
}

async function loadGradingScale(): Promise<GradingBand[]> {
  const row = await SchoolSetting.findByPk("grading_scale", {
    attributes: ["settingKey", "settingValue"],
  });
  return parseGradingScale(row?.settingValue ?? null);
}

function normalizeScalePayload(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const parsed = parseGradingScale(JSON.stringify(value));
  if (parsed.length === 0) return null;
  return JSON.stringify(parsed);
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

async function subjectsForStudentClass(
  classRoomId: number | null | undefined,
  _className: string,
  sectionName: string | null | undefined,
): Promise<string[]> {
  if (!classRoomId) return [];
  const classRoom = await ClassRoom.findByPk(classRoomId, { attributes: ["id", "categoryId"] });
  if (!classRoom?.categoryId) return [];

  const sec = (sectionName ?? "").trim();
  const rows = await AcademicSubjectAssignment.findAll({
    where: {
      classCategoryId: classRoom.categoryId,
      sectionName: { [Op.in]: sec ? ["", sec] : [""] },
    },
    order: [
      ["section_name", "DESC"],
      ["subject_name", "ASC"],
    ],
    attributes: ["subjectName"],
  });
  const dedup = Array.from(new Set(rows.map((x) => x.subjectName.trim()).filter(Boolean)));
  return dedup;
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

function routeParamId(req: { params: Record<string, string | string[] | undefined> }): number {
  const p = req.params;
  const pick = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const raw =
    pick(p["id"]) ??
    pick(p["id(\\d+)"]) ??
    Object.values(p)
      .map(pick)
      .find((v) => v && /^\d+$/.test(v));
  return Number.parseInt(String(raw ?? ""), 10);
}

export function createMeAcademicsRouter() {
  const r = Router();

  r.get("/academics/result-entry/options", async (req, res) => {
    try {
      const userId = req.userId!;
      const role = await getUserRole(userId);
      const examTypes = await activeExamTypeKeys();
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
        examTypes,
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
      const examTypes = await activeExamTypeKeys();
      const gradingScale = await loadGradingScale();
      const passThreshold = passRateThresholdFromScale(gradingScale);
      if (examTypes.length === 0) {
        return res.status(400).json({ error: "No exam types configured. Add exam types manually first." });
      }
      const examType = normalizeExamType(req.query.examType, examTypes) ?? examTypes[0];
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
        if (score >= passThreshold) prev.pass += 1;
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

      return res.json({ passThreshold, rows });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/academics/result-entry/students", async (req, res) => {
    try {
      const userId = req.userId!;
      const term = trimStr(req.query.term, 20) ?? "Term 1";
      const examTypes = await activeExamTypeKeys();
      if (examTypes.length === 0) {
        return res.status(400).json({ error: "No exam types configured. Add exam types manually first." });
      }
      const examType = normalizeExamType(req.query.examType, examTypes) ?? examTypes[0];
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
      const examTypes = await activeExamTypeKeys();
      if (examTypes.length === 0) {
        return res.status(400).json({ error: "No exam types configured. Add exam types manually first." });
      }
      const examType = normalizeExamType(req.query.examType, examTypes) ?? examTypes[0];
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
      const examTypes = await activeExamTypeKeys();
      if (examTypes.length === 0) {
        return res.status(400).json({ error: "No exam types configured. Add exam types manually first." });
      }
      const examType = normalizeExamType(req.query.examType, examTypes) ?? examTypes[0];
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
      const subjects = await subjectsForStudentClass(
        student.classRoomId,
        className,
        student.sectionName ?? null,
      );
      const resultRows = await StudentAssessmentResult.findAll({
        where: { studentId, term, examType, subject: { [Op.in]: subjects } },
        attributes: ["subject", "score"],
      });
      const gradingScale = await loadGradingScale();
      const expectedSubjectCount = expectedSubjectCountForClassName(className);
      const markBySubject = new Map<string, number>();
      for (const row of resultRows) markBySubject.set(row.subject, Number(row.score) || 0);
      const subjectRows = subjects.map((subject) => {
        const score = markBySubject.get(subject) ?? null;
        if (score == null) return { subject, score: null, grade: null, aggregate: null };
        const gradeBand = gradeForScore(score, gradingScale);
        return { subject, score, grade: gradeBand.grade, aggregate: gradeBand.aggregate };
      });
      const completed = subjectRows.filter((x) => x.score != null);
      const totalScore = completed.reduce((sum, x) => sum + Number(x.score ?? 0), 0);
      const totalAggregate = completed.reduce((sum, x) => sum + Number(x.aggregate ?? 0), 0);
      const averageScore = completed.length > 0 ? totalScore / completed.length : null;
      const division =
        completed.length >= expectedSubjectCount
          ? divisionForAggregate(totalAggregate, expectedSubjectCount)
          : null;

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
          expectedSubjectCount,
          summary: {
            resultsEntered: completed.length,
            totalScore: completed.length > 0 ? totalScore : null,
            totalAggregate: completed.length > 0 ? totalAggregate : null,
            averageScore,
            division,
          },
          subjects: subjectRows,
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
      const examTypes = await activeExamTypeKeys();
      if (examTypes.length === 0) {
        return res.status(400).json({ error: "No exam types configured. Add exam types manually first." });
      }
      const examType = normalizeExamType(body.examType, examTypes);
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
      const allowedSubjects = new Set(
        await subjectsForStudentClass(student.classRoomId, className, student.sectionName ?? null),
      );

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

  r.get("/academics/report-card/student/:studentId", async (req, res) => {
    try {
      const userId = req.userId!;
      const studentId = Number(req.params.studentId);
      const term = trimStr(req.query.term, 20) ?? "Term 1";
      const examTypes = await activeExamTypeKeys();
      if (examTypes.length === 0) {
        return res.status(400).json({ error: "No exam types configured. Add exam types manually first." });
      }
      const examType = normalizeExamType(req.query.examType, examTypes) ?? examTypes[0];
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
      const subjects = await subjectsForStudentClass(
        student.classRoomId,
        className,
        student.sectionName ?? null,
      );
      const results = await StudentAssessmentResult.findAll({
        where: { studentId, term, examType, subject: { [Op.in]: subjects } },
        attributes: ["subject", "score"],
      });
      const gradingScale = await loadGradingScale();
      const expectedSubjectCount = expectedSubjectCountForClassName(className);

      const scoreBySubject = new Map<string, number>();
      for (const row of results) {
        scoreBySubject.set(row.subject, Number(row.score) || 0);
      }
      const subjectRows = subjects.map((subject) => {
        const score = scoreBySubject.get(subject) ?? null;
        if (score == null) return { subject, score: null, grade: null, aggregate: null };
        const gradeBand = gradeForScore(score, gradingScale);
        return { subject, score, grade: gradeBand.grade, aggregate: gradeBand.aggregate };
      });
      const completedRows = subjectRows.filter((x) => x.score != null);
      const totalScore = completedRows.reduce((sum, x) => sum + Number(x.score ?? 0), 0);
      const totalAggregate = completedRows.reduce((sum, x) => sum + Number(x.aggregate ?? 0), 0);
      const averageScore = completedRows.length > 0 ? totalScore / completedRows.length : null;
      const division =
        completedRows.length >= expectedSubjectCount
          ? divisionForAggregate(totalAggregate, expectedSubjectCount)
          : null;

      return res.json({
        item: {
          studentId: student.id,
          admissionNumber: student.admissionNumber,
          fullName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
          classRoomId: student.classRoomId,
          className,
          sectionName: student.sectionName ?? null,
          term,
          examType,
          expectedSubjectCount,
          enteredSubjectCount: completedRows.length,
          summary: {
            totalScore: completedRows.length > 0 ? totalScore : null,
            totalAggregate: completedRows.length > 0 ? totalAggregate : null,
            averageScore,
            division,
            status: completedRows.length >= expectedSubjectCount ? "complete" : "pending",
          },
          subjects: subjectRows,
        },
        gradingScale,
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/academics/config/exam-types", async (_req, res) => {
    try {
      const rows = await AcademicExamType.findAll({
        order: [
          ["is_system", "DESC"],
          ["id", "ASC"],
        ],
      });
      return res.json({
        items: rows.map((row) => ({
          id: row.id,
          examKey: row.examKey,
          displayName: row.displayName,
          isSystem: Boolean(row.isSystem),
          isActive: Boolean(row.isActive),
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/academics/config/exam-types", async (req, res) => {
    try {
      const userId = req.userId!;
      const role = await getUserRole(userId);
      if (role !== "admin") return res.status(403).json({ error: "Only admins can manage exam types" });

      const body = req.body as Record<string, unknown>;
      const examKey = trimStr(body.examKey, 40)?.toUpperCase().replace(/\s+/g, "_");
      const displayName = trimStr(body.displayName, 80);
      if (!examKey) return res.status(400).json({ error: "examKey is required" });
      if (!displayName) return res.status(400).json({ error: "displayName is required" });

      const existing = await AcademicExamType.findOne({ where: { examKey } });
      if (existing) return res.status(409).json({ error: "Exam type already exists" });

      const created = await AcademicExamType.create({
        examKey,
        displayName,
        isSystem: false,
        isActive: true,
      });
      return res.status(201).json({
        item: {
          id: created.id,
          examKey: created.examKey,
          displayName: created.displayName,
          isSystem: Boolean(created.isSystem),
          isActive: Boolean(created.isActive),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.delete("/academics/config/exam-types/:id(\\d+)", async (req, res) => {
    try {
      const userId = req.userId!;
      const role = await getUserRole(userId);
      if (role !== "admin") return res.status(403).json({ error: "Only admins can manage exam types" });

      const id = routeParamId(req);
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      const row = await AcademicExamType.findByPk(id);
      if (!row) return res.status(404).json({ error: "Not found" });

      await row.destroy();
      return res.status(204).send();
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/academics/config/grading-scale", async (_req, res) => {
    try {
      const scale = await loadGradingScale();
      return res.json({ items: scale });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/academics/config/grading-scale", async (req, res) => {
    try {
      const userId = req.userId!;
      const role = await getUserRole(userId);
      if (role !== "admin") return res.status(403).json({ error: "Only admins can manage grading scale" });

      const body = req.body as Record<string, unknown>;
      const normalized = normalizeScalePayload(body.items);
      if (!normalized) return res.status(400).json({ error: "items must be a valid grading scale array" });

      const existing = await SchoolSetting.findByPk("grading_scale");
      if (existing) {
        await existing.update({ settingValue: normalized });
      } else {
        await SchoolSetting.create({ settingKey: "grading_scale", settingValue: normalized });
      }
      return res.status(201).json({ items: parseGradingScale(normalized) });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/academics/config/subjects", async (_req, res) => {
    try {
      const categories = await ClassCategory.findAll({
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
      });
      const assignments = await AcademicSubjectAssignment.findAll({
        order: [
          ["class_category_id", "ASC"],
          ["section_name", "ASC"],
          ["subject_name", "ASC"],
        ],
      });
      return res.json({
        categories: categories.map((x) => ({ id: x.id, name: x.name })),
        items: assignments.map((x) => ({
          id: x.id,
          classCategoryId: x.classCategoryId,
          sectionName: x.sectionName?.trim() || null,
          subjectName: x.subjectName,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/academics/config/subjects", async (req, res) => {
    try {
      const userId = req.userId!;
      const role = await getUserRole(userId);
      if (role !== "admin") return res.status(403).json({ error: "Only admins can manage subjects" });

      const body = req.body as Record<string, unknown>;
      const classCategoryId = Number(body.classCategoryId);
      const sectionName = trimStr(body.sectionName, 80) ?? "";
      const subjectName = trimStr(body.subjectName, 120);
      if (!Number.isFinite(classCategoryId) || classCategoryId < 1) {
        return res.status(400).json({ error: "classCategoryId is required" });
      }
      if (!subjectName) return res.status(400).json({ error: "subjectName is required" });

      const category = await ClassCategory.findByPk(classCategoryId);
      if (!category) return res.status(400).json({ error: "Invalid classCategoryId" });

      const [row] = await AcademicSubjectAssignment.findOrCreate({
        where: { classCategoryId, sectionName, subjectName },
        defaults: { classCategoryId, sectionName, subjectName },
      });

      return res.status(201).json({
        item: {
          id: row.id,
          classCategoryId: row.classCategoryId,
          sectionName: row.sectionName?.trim() || null,
          subjectName: row.subjectName,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.delete("/academics/config/subjects/:id(\\d+)", async (req, res) => {
    try {
      const userId = req.userId!;
      const role = await getUserRole(userId);
      if (role !== "admin") return res.status(403).json({ error: "Only admins can manage subjects" });

      const id = routeParamId(req);
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      const row = await AcademicSubjectAssignment.findByPk(id);
      if (!row) return res.status(404).json({ error: "Not found" });
      await row.destroy();
      return res.status(204).send();
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  return r;
}
