import {
  Sequelize,
  DataTypes,
  Model,
  fn,
  col,
  where,
} from "sequelize";
import type { Config } from "../config.js";

export class User extends Model {
  declare id: number;
  declare email: string;
  declare passwordHash: string;
  declare role: string;
  declare twoFactorEnabled: boolean;
  declare readonly createdAt: Date;
}

/** Short-lived email OTP for login 2FA, password change, and 2FA toggles. */
export class SecurityOtpChallenge extends Model {
  declare id: number;
  declare userId: number;
  declare purpose: string;
  declare codeHash: string;
  declare expiresAt: Date;
  declare readonly createdAt: Date;
}

export class ClassRoom extends Model {
  declare id: number;
  declare name: string;
  declare categoryId: number | null;
  declare description: string | null;
  declare isActive: boolean;
  declare academicYear: string;
  declare readonly createdAt: Date;
}

export class ClassCategory extends Model {
  declare id: number;
  declare name: string;
  declare description: string | null;
  declare readonly createdAt: Date;
}

export class ClassSection extends Model {
  declare id: number;
  declare classRoomId: number;
  declare name: string;
  declare classTeacherName: string | null;
  declare academicYear: string;
  declare readonly createdAt: Date;
}

export class Student extends Model {
  declare id: number;
  declare admissionNumber: string;
  declare firstName: string;
  declare middleName: string | null;
  declare lastName: string;
  declare dateOfBirth: string | null;
  declare parentEmail: string | null;
  declare classRoomId: number | null;
  declare gender: string | null;
  declare rollNumber: string | null;
  declare sectionName: string | null;
  declare passportPhotoFilename: string | null;
  declare nationality: string | null;
  declare countryCode: string | null;
  declare district: string | null;
  declare registrationType: string;
  declare previousSchool: string | null;
  declare previousSchoolLocation: string | null;
  declare lastClassAttended: string | null;
  declare lastTermYear: string | null;
  declare previousReportCardFilename: string | null;
  declare previousGrades: string | null;
  declare transferReason: string | null;
  declare parentAliveStatus: "both" | "one" | "none" | null;
  declare parentFullName: string | null;
  declare parentPhone: string | null;
  declare parentAddress: string | null;
  declare religion: string | null;
  declare specialNeeds: string | null;
  declare boardingStatus: string | null;
  declare residenceAddress: string | null;
  declare medicalInfo: string | null;
  declare emergencyContactName: string | null;
  declare emergencyContactPhone: string | null;
  declare guardianName: string | null;
  declare guardianPhone: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export class StudentFeeReceipt extends Model {
  declare id: number;
  declare studentId: number;
  declare receiptNo: string;
  declare term: string;
  declare paymentMethod: string;
  declare paidBy: string;
  declare amountPaidUgx: number;
  declare previousPaidUgx: number;
  declare totalFeesDueUgx: number;
  declare outstandingAfterUgx: number;
  declare creditAmountUgx: number;
  declare readonly createdAt: Date;
}

export class StudentFeeAssignment extends Model {
  declare id: number;
  declare studentId: number;
  declare term: string;
  declare amountDueUgx: number;
  declare notes: string | null;
  declare readonly createdAt: Date;
}

export class StudentFeePayment extends Model {
  declare id: number;
  declare studentId: number;
  declare term: string;
  declare amountPaidUgx: number;
  declare paymentMethod: string;
  declare paidBy: string;
  declare receiptId: number | null;
  declare readonly createdAt: Date;
}

export class DailyExpenseEntry extends Model {
  declare id: number;
  declare expenseDate: string;
  declare category: string;
  declare description: string;
  declare amountUgx: number;
  declare paymentMethod: string;
  declare recordedByUserId: number | null;
  declare readonly createdAt: Date;
}

export class DailyFinanceReport extends Model {
  declare id: number;
  declare reportDate: string;
  declare status: "not_submitted" | "submitted" | "admin_review" | "closed";
  declare submittedByUserId: number | null;
  declare submittedAt: Date | null;
  declare reviewedByUserId: number | null;
  declare reviewedAt: Date | null;
  declare closedByUserId: number | null;
  declare closedAt: Date | null;
  declare reopenedReason: string | null;
  declare isReopened: boolean;
  declare adminNotes: string | null;
}

export class DailyFinanceReportAudit extends Model {
  declare id: number;
  declare reportId: number;
  declare action: string;
  declare actorUserId: number | null;
  declare note: string | null;
  declare readonly createdAt: Date;
}

export class StaffPayrollEntry extends Model {
  declare id: number;
  declare staffMemberId: number | null;
  declare monthKey: string;
  declare grossAmountUgx: number;
  declare paidAmountUgx: number;
  declare arrearsUgx: number;
  declare status: string;
  declare readonly createdAt: Date;
}

export class PasswordResetOtp extends Model {
  declare id: number;
  declare emailLower: string;
  declare codeHash: string;
  declare expiresAt: Date;
  declare readonly createdAt: Date;
}

/** In-app notifications for a user (header bell). */
export class UserNotification extends Model {
  declare id: number;
  declare userId: number;
  declare title: string;
  declare body: string;
  /** Null = unread. */
  declare readAt: Date | null;
  declare readonly createdAt: Date;
}

/** In-app messages for a user (header mail). */
export class UserMessage extends Model {
  declare id: number;
  declare recipientUserId: number;
  declare senderUserId: number | null;
  /** List headline (e.g. sender name); required even if sender_user_id is set. */
  declare title: string;
  declare body: string;
  declare readAt: Date | null;
  declare readonly createdAt: Date;
}

export class StaffMember extends Model {
  declare id: number;
  declare userId: number | null;
  declare displayName: string;
  declare email: string | null;
  declare staffRole: string;
  declare readonly createdAt: Date;
}

export class Enquiry extends Model {
  declare id: number;
  declare subject: string;
  declare messageBody: string;
  declare sourceEmail: string | null;
  declare status: string;
  declare readonly createdAt: Date;
}

export class NoticeBoardEntry extends Model {
  declare id: number;
  declare authorUserId: number | null;
  declare authorLabel: string;
  declare body: string;
  declare publishedAt: Date;
  declare readonly createdAt: Date;
}

export class SchoolExpense extends Model {
  declare id: number;
  declare referenceCode: string;
  declare expenseType: string;
  declare amountUgx: number;
  declare status: string;
  declare contactEmail: string;
  declare expenseDate: string;
  /** When the row was inserted (for intra-day ordering on daily finance views). */
  declare readonly createdAt: Date;
}

export class SchoolEvent extends Model {
  declare id: number;
  declare title: string;
  declare eventDate: string;
  declare readonly createdAt: Date;
}

export class DashboardChartPoint extends Model {
  declare id: number;
  declare sortOrder: number;
  declare xPos: number;
  declare yPos: number;
}

export class SocialPlatformStat extends Model {
  declare id: number;
  declare platformKey: string;
  declare displayLabel: string;
  declare followerCount: number;
  declare sortOrder: number;
}

export class AttendanceRecord extends Model {
  declare id: number;
  declare studentId: number;
  declare recordDate: string;
  declare present: boolean;
  declare readonly createdAt: Date;
}

export class DashboardKpi extends Model {
  declare kpiKey: string;
  declare valueText: string;
}

export function setupDatabase(config: Config): Sequelize {
  const sequelize = new Sequelize({
    dialect: "mysql",
    host: config.DB_HOST,
    port: config.DB_PORT,
    username: config.DB_USER,
    password: config.DB_PASSWORD === "" ? undefined : config.DB_PASSWORD,
    database: config.DB_NAME,
    logging: config.NODE_ENV === "development" ? console.log : false,
  });

  User.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      // Uniqueness: DB `uq_users_email` (schema.sql). Omit `unique: true` here so
      // `sequelize.sync({ alter: true })` does not emit CHANGE … UNIQUE and hit MySQL
      // ER_TOO_MANY_KEYS when a unique index already exists.
      email: { type: DataTypes.STRING(255), allowNull: false },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash",
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "admin",
      },
      twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "two_factor_enabled",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "users",
      modelName: "User",
      timestamps: false,
    },
  );

  ClassRoom.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(120), allowNull: false },
      categoryId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "category_id",
      },
      description: { type: DataTypes.STRING(255), allowNull: true },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
      },
      academicYear: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: "academic_year",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "classrooms",
      modelName: "ClassRoom",
      timestamps: false,
    },
  );

  ClassCategory.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(80), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "class_categories",
      modelName: "ClassCategory",
      timestamps: false,
    },
  );

  ClassSection.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      classRoomId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "class_room_id",
      },
      name: { type: DataTypes.STRING(80), allowNull: false },
      classTeacherName: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: "class_teacher_name",
      },
      academicYear: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: "academic_year",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "class_sections",
      modelName: "ClassSection",
      timestamps: false,
    },
  );

  Student.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      admissionNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "admission_number",
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "first_name",
      },
      middleName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "middle_name",
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "last_name",
      },
      dateOfBirth: { type: DataTypes.DATEONLY, field: "date_of_birth" },
      parentEmail: { type: DataTypes.STRING(255), field: "parent_email" },
      classRoomId: {
        type: DataTypes.INTEGER.UNSIGNED,
        field: "class_room_id",
      },
      gender: { type: DataTypes.STRING(20), allowNull: true },
      rollNumber: { type: DataTypes.STRING(32), field: "roll_number" },
      sectionName: { type: DataTypes.STRING(80), field: "section_name" },
      passportPhotoFilename: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "passport_photo_filename",
      },
      nationality: { type: DataTypes.STRING(100), allowNull: true },
      countryCode: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: "country_code",
      },
      district: { type: DataTypes.STRING(120), allowNull: true },
      registrationType: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: "first",
        field: "registration_type",
      },
      previousSchool: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: "previous_school",
      },
      previousSchoolLocation: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: "previous_school_location",
      },
      lastClassAttended: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: "last_class_attended",
      },
      lastTermYear: {
        type: DataTypes.STRING(40),
        allowNull: true,
        field: "last_term_year",
      },
      previousReportCardFilename: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "previous_report_card_filename",
      },
      previousGrades: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "previous_grades",
      },
      transferReason: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: "transfer_reason",
      },
      parentAliveStatus: {
        type: DataTypes.STRING(16),
        allowNull: true,
        field: "parent_alive_status",
      },
      parentFullName: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: "parent_full_name",
      },
      parentPhone: {
        type: DataTypes.STRING(32),
        allowNull: true,
        field: "parent_phone",
      },
      parentAddress: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "parent_address",
      },
      religion: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      specialNeeds: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "special_needs",
      },
      boardingStatus: {
        type: DataTypes.STRING(16),
        allowNull: true,
        field: "boarding_status",
      },
      residenceAddress: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "residence_address",
      },
      medicalInfo: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "medical_info",
      },
      emergencyContactName: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: "emergency_contact_name",
      },
      emergencyContactPhone: {
        type: DataTypes.STRING(32),
        allowNull: true,
        field: "emergency_contact_phone",
      },
      guardianName: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: "guardian_name",
      },
      guardianPhone: {
        type: DataTypes.STRING(32),
        allowNull: true,
        field: "guardian_phone",
      },
    },
    {
      sequelize,
      tableName: "students",
      modelName: "Student",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  StudentFeeReceipt.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      studentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "student_id",
      },
      receiptNo: {
        type: DataTypes.STRING(32),
        allowNull: false,
        field: "receipt_no",
      },
      term: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      paymentMethod: {
        type: DataTypes.STRING(40),
        allowNull: false,
        field: "payment_method",
      },
      paidBy: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: "paid_by",
      },
      amountPaidUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "amount_paid_ugx",
      },
      previousPaidUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: "previous_paid_ugx",
      },
      totalFeesDueUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: "total_fees_due_ugx",
      },
      outstandingAfterUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: "outstanding_after_ugx",
      },
      creditAmountUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: "credit_amount_ugx",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "student_fee_receipts",
      modelName: "StudentFeeReceipt",
      timestamps: false,
    },
  );

  StudentFeeAssignment.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      studentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "student_id",
      },
      term: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      amountDueUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "amount_due_ugx",
      },
      notes: { type: DataTypes.STRING(255), allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "student_fee_assignments",
      modelName: "StudentFeeAssignment",
      timestamps: false,
    },
  );

  StudentFeePayment.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      studentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "student_id",
      },
      term: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      amountPaidUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "amount_paid_ugx",
      },
      paymentMethod: {
        type: DataTypes.STRING(40),
        allowNull: false,
        field: "payment_method",
      },
      paidBy: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: "paid_by",
      },
      receiptId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "receipt_id",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "student_fee_payments",
      modelName: "StudentFeePayment",
      timestamps: false,
    },
  );

  DailyExpenseEntry.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      expenseDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "expense_date",
      },
      category: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      amountUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "amount_ugx",
      },
      paymentMethod: {
        type: DataTypes.STRING(40),
        allowNull: false,
        field: "payment_method",
      },
      recordedByUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "recorded_by_user_id",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "daily_expense_entries",
      modelName: "DailyExpenseEntry",
      timestamps: false,
    },
  );

  DailyFinanceReport.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      reportDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "report_date",
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "not_submitted",
      },
      submittedByUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "submitted_by_user_id",
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "submitted_at",
      },
      reviewedByUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "reviewed_by_user_id",
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "reviewed_at",
      },
      closedByUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "closed_by_user_id",
      },
      closedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "closed_at",
      },
      reopenedReason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "reopened_reason",
      },
      isReopened: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_reopened",
      },
      adminNotes: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "admin_notes",
      },
    },
    {
      sequelize,
      tableName: "daily_finance_reports",
      modelName: "DailyFinanceReport",
      timestamps: false,
      indexes: [{ unique: true, fields: ["report_date"] }],
    },
  );

  DailyFinanceReportAudit.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      reportId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "report_id",
      },
      action: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      actorUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "actor_user_id",
      },
      note: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "daily_finance_report_audits",
      modelName: "DailyFinanceReportAudit",
      timestamps: false,
    },
  );

  StaffPayrollEntry.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      staffMemberId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "staff_member_id",
      },
      monthKey: {
        type: DataTypes.STRING(7),
        allowNull: false,
        field: "month_key",
      },
      grossAmountUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: "gross_amount_ugx",
      },
      paidAmountUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: "paid_amount_ugx",
      },
      arrearsUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: "arrears_ugx",
      },
      status: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: "pending",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "staff_payroll_entries",
      modelName: "StaffPayrollEntry",
      timestamps: false,
    },
  );

  // DB uses CONSTRAINT fk_students_classroom (schema.sql). Sequelize alter-sync
  // assumes default names like students_ibfk_1 and throws UnknownConstraintError
  // if they differ — so we keep the real FK in SQL and skip Sequelize FK DDL.
  Student.belongsTo(ClassRoom, {
    foreignKey: "class_room_id",
    as: "classRoom",
    constraints: false,
  });
  ClassRoom.hasMany(Student, {
    foreignKey: "class_room_id",
    as: "students",
    constraints: false,
  });
  ClassRoom.belongsTo(ClassCategory, {
    foreignKey: "category_id",
    as: "category",
    constraints: false,
  });
  ClassCategory.hasMany(ClassRoom, {
    foreignKey: "category_id",
    as: "classes",
    constraints: false,
  });
  ClassSection.belongsTo(ClassRoom, {
    foreignKey: "class_room_id",
    as: "classRoom",
    constraints: false,
  });
  ClassRoom.hasMany(ClassSection, {
    foreignKey: "class_room_id",
    as: "sections",
    constraints: false,
  });

  PasswordResetOtp.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      emailLower: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "email_lower",
      },
      codeHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "code_hash",
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expires_at",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "password_reset_otps",
      modelName: "PasswordResetOtp",
      timestamps: false,
    },
  );

  SecurityOtpChallenge.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "user_id",
      },
      purpose: { type: DataTypes.STRING(32), allowNull: false },
      codeHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "code_hash",
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expires_at",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "security_otp_challenges",
      modelName: "SecurityOtpChallenge",
      timestamps: false,
    },
  );

  SecurityOtpChallenge.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    constraints: false,
  });
  User.hasMany(SecurityOtpChallenge, {
    foreignKey: "user_id",
    as: "securityOtpChallenges",
    constraints: false,
  });

  UserNotification.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "user_id",
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      readAt: { type: DataTypes.DATE, field: "read_at", allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "user_notifications",
      modelName: "UserNotification",
      timestamps: false,
    },
  );

  UserMessage.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      recipientUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "recipient_user_id",
      },
      senderUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        field: "sender_user_id",
        allowNull: true,
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      readAt: { type: DataTypes.DATE, field: "read_at", allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "user_messages",
      modelName: "UserMessage",
      timestamps: false,
    },
  );

  // FK names in db/schema.sql differ from Sequelize defaults; keep DDL in SQL only.
  UserNotification.belongsTo(User, {
    foreignKey: "user_id",
    as: "recipient",
    constraints: false,
  });
  User.hasMany(UserNotification, {
    foreignKey: "user_id",
    as: "notifications",
    constraints: false,
  });

  UserMessage.belongsTo(User, {
    foreignKey: "recipient_user_id",
    as: "recipient",
    constraints: false,
  });
  UserMessage.belongsTo(User, {
    foreignKey: "sender_user_id",
    as: "sender",
    constraints: false,
  });
  User.hasMany(UserMessage, {
    foreignKey: "recipient_user_id",
    as: "receivedMessages",
    constraints: false,
  });
  User.hasMany(UserMessage, {
    foreignKey: "sender_user_id",
    as: "sentMessages",
    constraints: false,
  });

  StaffMember.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        field: "user_id",
        allowNull: true,
      },
      displayName: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: "display_name",
      },
      email: { type: DataTypes.STRING(255), allowNull: true },
      staffRole: {
        type: DataTypes.STRING(40),
        allowNull: false,
        field: "staff_role",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "staff_members",
      modelName: "StaffMember",
      timestamps: false,
    },
  );

  Enquiry.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      subject: { type: DataTypes.STRING(255), allowNull: false },
      messageBody: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "message_body",
      },
      sourceEmail: {
        type: DataTypes.STRING(255),
        field: "source_email",
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "open",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "enquiries",
      modelName: "Enquiry",
      timestamps: false,
    },
  );

  NoticeBoardEntry.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      authorUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        field: "author_user_id",
        allowNull: true,
      },
      authorLabel: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: "author_label",
      },
      body: { type: DataTypes.TEXT, allowNull: false },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "published_at",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "notice_board_entries",
      modelName: "NoticeBoardEntry",
      timestamps: false,
    },
  );

  SchoolExpense.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      referenceCode: {
        type: DataTypes.STRING(32),
        allowNull: false,
        field: "reference_code",
      },
      expenseType: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: "expense_type",
      },
      amountUgx: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "amount_ugx",
      },
      status: { type: DataTypes.STRING(20), allowNull: false },
      contactEmail: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "contact_email",
      },
      expenseDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "expense_date",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "school_expenses",
      modelName: "SchoolExpense",
      timestamps: false,
    },
  );

  SchoolEvent.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      eventDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "event_date",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "school_events",
      modelName: "SchoolEvent",
      timestamps: false,
    },
  );

  DashboardChartPoint.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "sort_order",
      },
      xPos: { type: DataTypes.INTEGER, allowNull: false, field: "x_pos" },
      yPos: { type: DataTypes.INTEGER, allowNull: false, field: "y_pos" },
    },
    {
      sequelize,
      tableName: "dashboard_chart_points",
      modelName: "DashboardChartPoint",
      timestamps: false,
    },
  );

  SocialPlatformStat.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      platformKey: {
        type: DataTypes.STRING(32),
        allowNull: false,
        field: "platform_key",
      },
      displayLabel: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "display_label",
      },
      followerCount: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: "follower_count",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "sort_order",
      },
    },
    {
      sequelize,
      tableName: "social_platform_stats",
      modelName: "SocialPlatformStat",
      timestamps: false,
    },
  );

  AttendanceRecord.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      studentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "student_id",
      },
      recordDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "record_date",
      },
      present: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "attendance_records",
      modelName: "AttendanceRecord",
      timestamps: false,
    },
  );

  DashboardKpi.init(
    {
      kpiKey: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        field: "kpi_key",
      },
      valueText: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: "value_text",
      },
    },
    {
      sequelize,
      tableName: "dashboard_kpis",
      modelName: "DashboardKpi",
      timestamps: false,
    },
  );

  StaffMember.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    constraints: false,
  });
  User.hasMany(StaffMember, {
    foreignKey: "user_id",
    as: "staffMemberships",
    constraints: false,
  });

  NoticeBoardEntry.belongsTo(User, {
    foreignKey: "author_user_id",
    as: "authorUser",
    constraints: false,
  });
  User.hasMany(NoticeBoardEntry, {
    foreignKey: "author_user_id",
    as: "noticeAuthorships",
    constraints: false,
  });

  AttendanceRecord.belongsTo(Student, {
    foreignKey: "student_id",
    as: "student",
    constraints: false,
  });
  Student.hasMany(AttendanceRecord, {
    foreignKey: "student_id",
    as: "attendanceRecords",
    constraints: false,
  });

  StudentFeeReceipt.belongsTo(Student, {
    foreignKey: "student_id",
    as: "student",
    constraints: false,
  });
  Student.hasMany(StudentFeeReceipt, {
    foreignKey: "student_id",
    as: "feeReceipts",
    constraints: false,
  });
  StudentFeeAssignment.belongsTo(Student, {
    foreignKey: "student_id",
    as: "student",
    constraints: false,
  });
  Student.hasMany(StudentFeeAssignment, {
    foreignKey: "student_id",
    as: "feeAssignments",
    constraints: false,
  });
  StudentFeePayment.belongsTo(Student, {
    foreignKey: "student_id",
    as: "student",
    constraints: false,
  });
  Student.hasMany(StudentFeePayment, {
    foreignKey: "student_id",
    as: "feePayments",
    constraints: false,
  });
  StudentFeePayment.belongsTo(StudentFeeReceipt, {
    foreignKey: "receipt_id",
    as: "receipt",
    constraints: false,
  });
  StudentFeeReceipt.hasMany(StudentFeePayment, {
    foreignKey: "receipt_id",
    as: "payments",
    constraints: false,
  });
  DailyFinanceReportAudit.belongsTo(DailyFinanceReport, {
    foreignKey: "report_id",
    as: "report",
    constraints: false,
  });
  DailyFinanceReport.hasMany(DailyFinanceReportAudit, {
    foreignKey: "report_id",
    as: "auditTrail",
    constraints: false,
  });
  DailyExpenseEntry.belongsTo(User, {
    foreignKey: "recorded_by_user_id",
    as: "recordedBy",
    constraints: false,
  });
  User.hasMany(DailyExpenseEntry, {
    foreignKey: "recorded_by_user_id",
    as: "expenseEntries",
    constraints: false,
  });
  StaffPayrollEntry.belongsTo(StaffMember, {
    foreignKey: "staff_member_id",
    as: "staffMember",
    constraints: false,
  });
  StaffMember.hasMany(StaffPayrollEntry, {
    foreignKey: "staff_member_id",
    as: "payrollEntries",
    constraints: false,
  });

  return sequelize;
}

/** Case-insensitive email match (same idea as SQL LOWER(email) = LOWER(?)). */
export function userByEmailCi(normalized: string) {
  return User.findOne({
    where: where(fn("LOWER", col("email")), fn("LOWER", normalized)),
  });
}
