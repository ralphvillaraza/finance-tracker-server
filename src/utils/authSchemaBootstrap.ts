import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';

export function buildAuthMigrationStatements(): string[] {
  return [
    'ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL',
    'ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0',
    'CREATE UNIQUE INDEX ux_users_username ON users (username)',
    `CREATE TABLE IF NOT EXISTS pending_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(191) NOT NULL,
      username VARCHAR(50) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ux_pending_users_email (email),
      UNIQUE KEY ux_pending_users_username (username)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS auth_verification_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      email VARCHAR(191) NOT NULL,
      purpose ENUM('signup_verification', 'reset_password') NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_auth_code_lookup (email, purpose, used_at, expires_at)
    ) ENGINE=InnoDB`,
  ];
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    [tableName, columnName],
  );

  return rows.length > 0;
}

async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
    [tableName, indexName],
  );

  return rows.length > 0;
}

export async function ensureAuthSchema(): Promise<void> {
  if (!(await columnExists('users', 'username'))) {
    await pool.query('ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL');
  }

  if (!(await columnExists('users', 'is_verified'))) {
    await pool.query('ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0');
  }

  if (!(await indexExists('users', 'ux_users_username'))) {
    await pool.query('CREATE UNIQUE INDEX ux_users_username ON users (username)');
  }

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
