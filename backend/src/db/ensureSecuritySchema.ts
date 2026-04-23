import type { Sequelize } from "sequelize";

/** MySQL ER_DUP_FIELDNAME — column already exists */
const MYSQL_DUP_FIELDNAME = 1060;

/**
 * Additive DDL for deployments that skipped `sequelize.sync` or used an older schema.
 * Safe to run on every API startup (idempotent).
 */
export async function ensureSecuritySchema(sequelize: Sequelize): Promise<void> {
  if (sequelize.getDialect() !== "mysql") {
    return;
  }

  try {
    await sequelize.query(
      "ALTER TABLE users ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0",
    );
    console.info("[db] Added column users.two_factor_enabled");
  } catch (e: unknown) {
    const errno = (e as { parent?: { errno?: number } })?.parent?.errno;
    if (errno !== MYSQL_DUP_FIELDNAME) {
      throw e;
    }
  }

  try {
    await sequelize.query("ALTER TABLE users ADD COLUMN full_name VARCHAR(120) NULL");
    console.info("[db] Added column users.full_name");
  } catch (e: unknown) {
    const errno = (e as { parent?: { errno?: number } })?.parent?.errno;
    if (errno !== MYSQL_DUP_FIELDNAME) {
      throw e;
    }
  }
  try {
    await sequelize.query("ALTER TABLE users ADD COLUMN phone_number VARCHAR(32) NULL");
    console.info("[db] Added column users.phone_number");
  } catch (e: unknown) {
    const errno = (e as { parent?: { errno?: number } })?.parent?.errno;
    if (errno !== MYSQL_DUP_FIELDNAME) {
      throw e;
    }
  }
  try {
    await sequelize.query("ALTER TABLE users ADD COLUMN gender VARCHAR(32) NULL");
    console.info("[db] Added column users.gender");
  } catch (e: unknown) {
    const errno = (e as { parent?: { errno?: number } })?.parent?.errno;
    if (errno !== MYSQL_DUP_FIELDNAME) {
      throw e;
    }
  }
  try {
    await sequelize.query("ALTER TABLE users ADD COLUMN date_of_birth DATE NULL");
    console.info("[db] Added column users.date_of_birth");
  } catch (e: unknown) {
    const errno = (e as { parent?: { errno?: number } })?.parent?.errno;
    if (errno !== MYSQL_DUP_FIELDNAME) {
      throw e;
    }
  }
  try {
    await sequelize.query("ALTER TABLE users ADD COLUMN address_line VARCHAR(255) NULL");
    console.info("[db] Added column users.address_line");
  } catch (e: unknown) {
    const errno = (e as { parent?: { errno?: number } })?.parent?.errno;
    if (errno !== MYSQL_DUP_FIELDNAME) {
      throw e;
    }
  }

  await sequelize.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      role VARCHAR(50) NOT NULL,
      permission_key VARCHAR(64) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_role_permissions_role_key (role, permission_key),
      KEY role_permissions_role_idx (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS user_permission_overrides (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      permission_key VARCHAR(64) NOT NULL,
      allowed TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_permission_overrides_user_permission (user_id, permission_key),
      KEY user_permission_overrides_user_idx (user_id),
      CONSTRAINT fk_user_permission_overrides_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
