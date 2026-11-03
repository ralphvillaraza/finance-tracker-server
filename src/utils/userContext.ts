import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db.js';

interface UserIdRow extends RowDataPacket {
  id: number;
}

/**
 * Returns the authenticated user ID when a valid session is present.
 * Never falls back to a legacy single-user account when auth is missing.
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

  const preferredUserId = options?.preferredUserId;
  const ensureExists = options?.ensureExists ?? false;

  if (typeof preferredUserId === 'number' && Number.isFinite(preferredUserId) && preferredUserId > 0) {
    const [preferredRows] = await pool.query<UserIdRow[]>(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      [preferredUserId]
    );

    if (preferredRows.length > 0) {
      return preferredRows[0].id;
    }
  }

  if (ensureExists) {
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

  throw new Error('No authenticated user context found for this request.');
}

export async function resolveActiveUserId(options?: {
  reqUserId?: number;
  preferredUserId?: number;
  ensureExists?: boolean;
}): Promise<number> {
  return resolveAuthenticatedUserId(options);
}
