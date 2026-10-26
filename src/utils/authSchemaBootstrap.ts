import { pool } from '../config/db.js';

export async function ensureAuthSchema(): Promise<void> {
  // Extend existing users table for username-based auth and email verification.
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS is_verified TINYINT(1) NOT NULL DEFAULT 0
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users (username)
  `);

  // Keep existing rows compatible by backfilling username and verification status.
  await pool.query(`
    UPDATE users
    SET username = COALESCE(username, CONCAT('user', id)),
        is_verified = 1
    WHERE username IS NULL OR username = ''
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(191) NOT NULL,
      username VARCHAR(50) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ux_pending_users_email (email),
      UNIQUE KEY ux_pending_users_username (username)
    ) ENGINE=InnoDB
  `);

  try {
    await pool.query('ALTER TABLE auth_verification_codes DROP FOREIGN KEY fk_auth_codes_user');
  } catch {
    // Ignore if the foreign key already does not exist or the table is not present yet.
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_verification_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      email VARCHAR(191) NOT NULL,
      purpose ENUM('signup_verification', 'reset_password') NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_auth_code_lookup (email, purpose, used_at, expires_at)
    ) ENGINE=InnoDB
  `);
}
