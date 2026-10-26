import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db.js';

interface UserIdRow extends RowDataPacket {
  id: number;
}

const DEFAULT_USER_ID = 1;

/**
 * Returns the authenticated user ID when a valid session is present.
 * Falls back to the legacy single-user default only when no authenticated user exists.
 */
export async function resolveAuthenticatedUserId(options?: {
  reqUserId?: number;
  preferredUserId?: number;
  ensureExists?: boolean;
}): Promise<number> {
  const reqUserId = options?.reqUserId;
  if (typeof reqUserId === 'number' && Number.isFinite(reqUserId) && reqUserId > 0) {
    return reqUserId;
  }

  const preferredUserId = options?.preferredUserId ?? DEFAULT_USER_ID;
  const ensureExists = options?.ensureExists ?? false;

  const [preferredRows] = await pool.query<UserIdRow[]>(
    'SELECT id FROM users WHERE id = ? LIMIT 1',
    [preferredUserId]
  );

  if (preferredRows.length > 0) {
    return preferredRows[0].id;
  }

  const [anyRows] = await pool.query<UserIdRow[]>('SELECT id FROM users ORDER BY id ASC LIMIT 1');
  if (anyRows.length > 0) {
    return anyRows[0].id;
  }

  if (!ensureExists) {
    return preferredUserId;
  }

  const uniqueSuffix = Date.now();
  const [insertResult] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO users (name, email, password_hash, currency)
      VALUES (?, ?, ?, ?)
    `,
    [
      'Local User',
      `local-user-${uniqueSuffix}@finance-tracker.local`,
      'local-dev-password-hash-placeholder',
      'USD',
    ]
  );

  return insertResult.insertId;
}

export async function resolveActiveUserId(options?: {
  reqUserId?: number;
  preferredUserId?: number;
  ensureExists?: boolean;
}): Promise<number> {
  return resolveAuthenticatedUserId(options);
}
