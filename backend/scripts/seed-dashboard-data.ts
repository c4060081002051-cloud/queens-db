import "./loadBackendEnv.js";
import { loadConfig } from "../src/config.js";
import { ensureSecuritySchema } from "../src/db/ensureSecuritySchema.js";
import { ensureDashboardSchema } from "../src/db/ensureDashboardSchema.js";
import {
  setupDatabase,
  ClassRoom,
  Student,
  StaffMember,
  Enquiry,
  NoticeBoardEntry,
  SchoolExpense,
  SchoolEvent,
  DashboardChartPoint,
  SocialPlatformStat,
  AttendanceRecord,
  DashboardKpi,
} from "../src/models/index.js";

function todayDateOnly(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main() {
  const config = loadConfig();
  console.info(
    `[seed:dashboard] Target database: ${config.DB_NAME} @ ${config.DB_HOST}:${config.DB_PORT} (user: ${config.DB_USER})`,
  );
  const sequelize = setupDatabase(config);
  await sequelize.authenticate();
  await ensureSecuritySchema(sequelize);
  await ensureDashboardSchema(sequelize);

  await AttendanceRecord.destroy({ where: {} });
  await SchoolExpense.destroy({ where: {} });
  await SchoolEvent.destroy({ where: {} });
  await DashboardChartPoint.destroy({ where: {} });
  await SocialPlatformStat.destroy({ where: {} });
  await DashboardKpi.destroy({ where: {} });
  await NoticeBoardEntry.destroy({ where: {} });
  await Enquiry.destroy({ where: {} });
  await StaffMember.destroy({ where: {} });

  const [p4] = await ClassRoom.findOrCreate({
    where: { name: "P.4", academicYear: "2025/2026" },
    defaults: { gradeLevel: "Primary 4" },
  });
  const [p6] = await ClassRoom.findOrCreate({
    where: { name: "P.6", academicYear: "2025/2026" },
    defaults: { gradeLevel: "Primary 6" },
  });

  const studentSeeds: Array<{
    admissionNumber: string;
    firstName: string;
    lastName: string;
    gender: string;
    sectionName: string;
    classRoomId: number;
    parentEmail: string | null;
  }> = [];

  for (const s of studentSeeds) {
    const [row, created] = await Student.findOrCreate({
      where: { admissionNumber: s.admissionNumber },
      defaults: {
        admissionNumber: s.admissionNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        dateOfBirth: null,
        parentEmail: s.parentEmail,
        classRoomId: s.classRoomId,
        gender: s.gender,
        sectionName: s.sectionName,
      },
    });
    if (!created) {
      await row.update({
        firstName: s.firstName,
        lastName: s.lastName,
        parentEmail: s.parentEmail,
        classRoomId: s.classRoomId,
        gender: s.gender,
        sectionName: s.sectionName,
      });
    }
  }

  await StaffMember.bulkCreate([]);

  await Enquiry.bulkCreate([
    {
      subject: "Admission for 2026",
      messageBody: "We would like to tour the campus next week.",
      sourceEmail: "visitor@example.com",
      status: "open",
    },
    {
      subject: "Transport route",
      messageBody: "Is there a bus stop near Ntinda?",
      sourceEmail: "parent.route@example.com",
      status: "open",
    },
  ]);

  await NoticeBoardEntry.bulkCreate([]);

  await SchoolExpense.bulkCreate([
    {
      referenceCode: "EXP-1042",
      expenseType: "Utilities",
      amountUgx: 2_400_000,
      status: "paid",
      contactEmail: "accounts@queens.school",
      expenseDate: "2026-04-02",
    },
    {
      referenceCode: "EXP-1041",
      expenseType: "Learning materials",
      amountUgx: 890_000,
      status: "due",
      contactEmail: "store@queens.school",
      expenseDate: "2026-04-01",
    },
    {
      referenceCode: "EXP-1040",
      expenseType: "Transport fuel",
      amountUgx: 1_100_000,
      status: "paid",
      contactEmail: "transport@queens.school",
      expenseDate: "2026-03-28",
    },
  ]);

  await SchoolEvent.bulkCreate([
    { title: "Staff planning", eventDate: "2026-04-05" },
    { title: "Fee window opens", eventDate: "2026-04-12" },
    { title: "Sports volunteers briefing", eventDate: "2026-04-18" },
  ]);

  await DashboardChartPoint.bulkCreate([
    { sortOrder: 0, xPos: 0, yPos: 55 },
    { sortOrder: 1, xPos: 30, yPos: 40 },
    { sortOrder: 2, xPos: 60, yPos: 48 },
    { sortOrder: 3, xPos: 90, yPos: 25 },
    { sortOrder: 4, xPos: 120, yPos: 35 },
    { sortOrder: 5, xPos: 150, yPos: 20 },
    { sortOrder: 6, xPos: 180, yPos: 30 },
    { sortOrder: 7, xPos: 200, yPos: 15 },
  ]);

  await SocialPlatformStat.bulkCreate([
    { platformKey: "facebook", displayLabel: "Facebook", followerCount: 1200, sortOrder: 0 },
    { platformKey: "x", displayLabel: "X", followerCount: 840, sortOrder: 1 },
    { platformKey: "google", displayLabel: "Google", followerCount: 2100, sortOrder: 2 },
    { platformKey: "linkedin", displayLabel: "LinkedIn", followerCount: 560, sortOrder: 3 },
  ]);

  await DashboardKpi.bulkCreate([
    { kpiKey: "due_fees", valueText: "1,500" },
    { kpiKey: "upcoming_exams", valueText: "15" },
    { kpiKey: "results_published", valueText: "08" },
    { kpiKey: "term_expenses", valueText: "10K" },
  ]);

  const students = await Student.findAll({ order: [["id", "ASC"]], limit: 6 });
  const today = todayDateOnly();
  for (const st of students) {
    await AttendanceRecord.create({
      studentId: st.id,
      recordDate: today,
      present: true,
    });
  }

  const [nStudents, nStaff, nExpenses] = await Promise.all([
    Student.count(),
    StaffMember.count(),
    SchoolExpense.count(),
  ]);

  console.log(
    "Dashboard seed complete: staff, enquiries, notices, expenses, events, chart, social, KPIs, " +
      `${students.length} attendance rows for ${today}, ${studentSeeds.length} learners upserted.`,
  );
  console.info(
    `[seed:dashboard] Row counts — students: ${nStudents}, staff_members: ${nStaff}, school_expenses: ${nExpenses}`,
  );

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
