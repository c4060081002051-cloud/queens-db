-- Run in phpMyAdmin or: mysql -u root queensdb < db/schema.sql
-- Create database first if needed: CREATE DATABASE queensdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--
-- Tables match Sequelize models in src/models/index.ts
--
-- Alternative: with NODE_ENV=development the API runs Sequelize sync on startup by default.
-- Or run manually: cd backend && npm run db:sync

USE queensdb;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(32) NULL,
  gender VARCHAR(32) NULL,
  date_of_birth DATE NULL,
  address_line VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classrooms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  category_id INT UNSIGNED NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_sections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_room_id INT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  class_teacher_name VARCHAR(120) NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_sections_name (class_room_id, name, academic_year),
  KEY class_sections_class_idx (class_room_id),
  CONSTRAINT fk_class_sections_classroom FOREIGN KEY (class_room_id) REFERENCES classrooms (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admission_number VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NULL,
  parent_email VARCHAR(255) NULL,
  class_room_id INT UNSIGNED NULL,
  gender VARCHAR(20) NULL,
  section_name VARCHAR(80) NULL,
  passport_photo_filename VARCHAR(255) NULL,
  nationality VARCHAR(100) NULL,
  country_code VARCHAR(10) NULL,
  district VARCHAR(120) NULL,
  registration_type VARCHAR(24) NOT NULL DEFAULT 'first',
  previous_school VARCHAR(200) NULL,
  previous_school_location VARCHAR(200) NULL,
  last_class_attended VARCHAR(120) NULL,
  last_term_year VARCHAR(40) NULL,
  previous_report_card_filename VARCHAR(255) NULL,
  previous_grades VARCHAR(200) NULL,
  transfer_reason VARCHAR(120) NULL,
  parent_alive_status VARCHAR(16) NULL,
  parent_full_name VARCHAR(120) NULL,
  parent_phone VARCHAR(32) NULL,
  parent_address VARCHAR(255) NULL,
  religion VARCHAR(80) NULL,
  special_needs VARCHAR(255) NULL,
  boarding_status VARCHAR(16) NULL,
  residence_address VARCHAR(255) NULL,
  medical_info TEXT NULL,
  emergency_contact_name VARCHAR(120) NULL,
  emergency_contact_phone VARCHAR(32) NULL,
  guardian_name VARCHAR(120) NULL,
  guardian_phone VARCHAR(32) NULL,
  bursary_percentage INT NOT NULL DEFAULT 0,
  bursary_starts_at DATETIME NULL,
  bursary_ends_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_admission (admission_number),
  KEY students_class_room_id_idx (class_room_id),
  CONSTRAINT fk_students_classroom FOREIGN KEY (class_room_id) REFERENCES classrooms (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin: admin@gmail.com / admin@123 (bcrypt cost 12; run npm run seed:admin to reset)
INSERT INTO users (email, password_hash, role) VALUES
(
  'admin@gmail.com',
  '$2b$12$YnyOYoR6II6QgyMXi3ewg.WnHd.mwAdBPNddOZOQnWdi39zcTsTZK',
  'admin'
)
ON DUPLICATE KEY UPDATE email = email;

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email_lower VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY password_reset_otps_email_idx (email_lower)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email OTP for login 2FA, password change, 2FA toggle (Sequelize: SecurityOtpChallenge)
CREATE TABLE IF NOT EXISTS security_otp_challenges (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  purpose VARCHAR(32) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY security_otp_challenges_user_purpose_idx (user_id, purpose),
  KEY security_otp_challenges_expires_idx (expires_at),
  CONSTRAINT fk_security_otp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Header bell: per-user notifications (Sequelize: UserNotification)
CREATE TABLE IF NOT EXISTS user_notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_notifications_user_idx (user_id),
  KEY user_notifications_user_unread_idx (user_id, read_at),
  CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Header mail: per-user messages (Sequelize: UserMessage)
CREATE TABLE IF NOT EXISTS user_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient_user_id INT UNSIGNED NOT NULL,
  sender_user_id INT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_messages_recipient_idx (recipient_user_id),
  KEY user_messages_recipient_unread_idx (recipient_user_id, read_at),
  CONSTRAINT fk_user_messages_recipient FOREIGN KEY (recipient_user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_messages_sender FOREIGN KEY (sender_user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role VARCHAR(50) NOT NULL,
  permission_key VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_permissions_role_key (role, permission_key),
  KEY role_permissions_role_idx (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  permission_key VARCHAR(64) NOT NULL,
  allowed TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_permission_overrides_user_permission (user_id, permission_key),
  KEY user_permission_overrides_user_idx (user_id),
  CONSTRAINT fk_user_permission_overrides_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing databases: add 2FA column if missing
-- ALTER TABLE users ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0;

-- Dashboard (Sequelize: StaffMember, Enquiry, NoticeBoardEntry, SchoolExpense, SchoolEvent,
-- DashboardChartPoint, SocialPlatformStat, AttendanceRecord, DashboardKpi)
CREATE TABLE IF NOT EXISTS staff_members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NULL,
  staff_role VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY staff_members_role_idx (staff_role),
  KEY staff_members_user_idx (user_id),
  CONSTRAINT fk_staff_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enquiries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject VARCHAR(255) NOT NULL,
  message_body TEXT NOT NULL,
  source_email VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY enquiries_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notice_board_entries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_user_id INT UNSIGNED NULL,
  author_label VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  published_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY notice_board_published_idx (published_at),
  CONSTRAINT fk_notice_board_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_expenses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_code VARCHAR(32) NOT NULL,
  expense_type VARCHAR(120) NOT NULL,
  amount_ugx BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_school_expenses_ref (reference_code),
  KEY school_expenses_date_idx (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY school_events_date_idx (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_chart_points (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sort_order INT NOT NULL DEFAULT 0,
  x_pos INT NOT NULL,
  y_pos INT NOT NULL,
  PRIMARY KEY (id),
  KEY dashboard_chart_sort_idx (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_platform_stats (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  platform_key VARCHAR(32) NOT NULL,
  display_label VARCHAR(64) NOT NULL,
  follower_count INT UNSIGNED NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_social_platform_key (platform_key),
  KEY social_sort_idx (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_records (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  record_date DATE NOT NULL,
  present TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY attendance_student_date_idx (student_id, record_date),
  KEY attendance_date_idx (record_date),
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_kpis (
  kpi_key VARCHAR(64) NOT NULL,
  value_text VARCHAR(120) NOT NULL,
  PRIMARY KEY (kpi_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_exam_types (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  exam_key VARCHAR(40) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_academic_exam_types_exam_key (exam_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_subject_assignments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_category_id INT UNSIGNED NOT NULL,
  section_name VARCHAR(80) NOT NULL DEFAULT '',
  subject_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subject_assignment_category_section_subject (class_category_id, section_name, subject_name),
  KEY idx_subject_assignment_category (class_category_id),
  CONSTRAINT fk_subject_assignment_category FOREIGN KEY (class_category_id) REFERENCES class_categories (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
