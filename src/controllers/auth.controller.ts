import { Request, Response, NextFunction } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/db.js';
import {
  SignupInput,
  VerifySignupInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../schemas/auth.schema.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendEmail } from '../utils/mailer.js';
import { signAuthToken } from '../utils/authToken.js';

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  is_verified: number;
}

interface PendingUserRow extends RowDataPacket {
  id: number;
  email: string;
  username: string;
  password_hash: string;
}

interface VerificationCodeRow extends RowDataPacket {
  id: number;
  code_hash: string;
  expires_at: Date;
}

export type SignupConflictStatus =
  | 'email_in_use'
  | 'username_in_use'
  | 'email_or_username_already_pending'
  | null;

export function getSignupConflictStatus({
  email,
  username,
  verifiedEmails = [],
  verifiedUsernames = [],
  pendingEmails = [],
  pendingUsernames = [],
}: {
  email: string;
  username: string;
  verifiedEmails?: string[];
  verifiedUsernames?: string[];
  pendingEmails?: string[];
  pendingUsernames?: string[];
}): SignupConflictStatus {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();

  const emailMatchesPending = pendingEmails.some((value) => value.trim().toLowerCase() === normalizedEmail);
  const usernameMatchesPending = pendingUsernames.some((value) => value.trim() === normalizedUsername);
  if (emailMatchesPending || usernameMatchesPending) {
    return 'email_or_username_already_pending';
  }

  const emailMatchesVerified = verifiedEmails.some((value) => value.trim().toLowerCase() === normalizedEmail);
  if (emailMatchesVerified) {
    return 'email_in_use';
  }

  const usernameMatchesVerified = verifiedUsernames.some((value) => value.trim() === normalizedUsername);
  if (usernameMatchesVerified) {
    return 'username_in_use';
  }

  return null;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createVerificationCode(userId: number, email: string, purpose: 'signup_verification' | 'reset_password'): Promise<string> {
  const code = generateCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query(
    `
      INSERT INTO auth_verification_codes (user_id, email, purpose, code_hash, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [userId, email, purpose, codeHash, expiresAt]
  );

  return code;
}

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as SignupInput;
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();

    const [verifiedUsers] = await pool.query<UserRow[]>(
      'SELECT id, email, username FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 50',
      [email, username]
    );
    const [pendingUsers] = await pool.query<PendingUserRow[]>(
      'SELECT email, username FROM pending_users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 50',
      [email, username]
    );

    const conflict = getSignupConflictStatus({
      email,
      username,
      verifiedEmails: verifiedUsers.map((user) => user.email),
      verifiedUsernames: verifiedUsers.map((user) => user.username),
      pendingEmails: pendingUsers.map((user) => user.email),
      pendingUsernames: pendingUsers.map((user) => user.username),
    });

    if (conflict === 'email_or_username_already_pending') {
      res.status(409).json({ success: false, error: 'This email or username is already pending verification. Please verify it first.' });
      return;
    }

    if (conflict === 'email_in_use') {
      res.status(409).json({ success: false, error: 'Email is already in use' });
      return;
    }

    if (conflict === 'username_in_use') {
      res.status(409).json({ success: false, error: 'Username is already in use' });
      return;
    }

    const passwordHash = await hashPassword(input.password);
    const [pendingInsert] = await pool.query<ResultSetHeader>(
      `
        INSERT INTO pending_users (email, username, password_hash)
        VALUES (?, ?, ?)
      `,
      [email, username, passwordHash]
    );

    const verificationCode = await createVerificationCode(pendingInsert.insertId, email, 'signup_verification');

    try {
      await sendEmail({
        to: email,
        subject: 'FinanceTracker - Verify your account',
        text: `Your FinanceTracker verification code is ${verificationCode}. This code expires in 15 minutes.`,
        html: `<p>Your FinanceTracker verification code is <strong>${verificationCode}</strong>.</p><p>This code expires in 15 minutes.</p>`,
      });
    } catch (mailError) {
      await pool.query('DELETE FROM pending_users WHERE id = ?', [pendingInsert.insertId]);
      const message =
        mailError instanceof Error
          ? mailError.message
          : 'Unable to send verification email. Please check the SMTP configuration and try again.';

      res.status(500).json({
        success: false,
        error: message,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Your account is pending verification. Please check your email and enter the 6-digit code.',
      ...(process.env.NODE_ENV !== 'production' ? { devVerificationCode: verificationCode } : {}),
    });
  } catch (error) {
    next(error);
  }
}

export async function verifySignup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as VerifySignupInput;
    const email = input.email.trim().toLowerCase();

    const [pendingUsers] = await pool.query<PendingUserRow[]>(
      'SELECT id, email, username, password_hash FROM pending_users WHERE LOWER(email) = ? LIMIT 1',
      [email]
    );

    if (pendingUsers.length === 0) {
      const [activeUsers] = await pool.query<UserRow[]>('SELECT id, email FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
      if (activeUsers.length > 0) {
        res.status(400).json({ success: false, error: 'This email is already verified and active.' });
        return;
      }
      res.status(404).json({ success: false, error: 'No pending account found for this email' });
      return;
    }

    const pendingUser = pendingUsers[0];

    const [codes] = await pool.query<VerificationCodeRow[]>(
      `
        SELECT id, code_hash, expires_at
        FROM auth_verification_codes
        WHERE user_id = ? AND email = ? AND purpose = 'signup_verification' AND used_at IS NULL
        ORDER BY id DESC
        LIMIT 1
      `,
      [pendingUser.id, email]
    );

    if (codes.length === 0) {
      res.status(400).json({ success: false, error: 'No active verification code found' });
      return;
    }

    const codeRecord = codes[0];

    if (new Date(codeRecord.expires_at).getTime() < Date.now()) {
      res.status(400).json({ success: false, error: 'Verification code has expired' });
      return;
    }

    const isCodeValid = await verifyPassword(input.code, codeRecord.code_hash);
    if (!isCodeValid) {
      res.status(400).json({ success: false, error: 'Invalid verification code' });
      return;
    }

    await pool.query(
      `
        INSERT INTO users (name, username, email, password_hash, currency, is_verified)
        VALUES (?, ?, ?, ?, 'USD', 1)
      `,
      [pendingUser.username, pendingUser.username, pendingUser.email, pendingUser.password_hash]
    );

    await pool.query('DELETE FROM pending_users WHERE id = ?', [pendingUser.id]);
    await pool.query('UPDATE auth_verification_codes SET used_at = NOW() WHERE id = ?', [codeRecord.id]);

    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as LoginInput;

    const [users] = await pool.query<UserRow[]>(
      'SELECT id, email, username, password_hash, is_verified FROM users WHERE username = ? LIMIT 1',
      [input.username]
    );

    if (users.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    const user = users[0];
    const passwordMatches = await verifyPassword(input.password, user.password_hash);

    if (!passwordMatches) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    if (!user.is_verified) {
      res.status(403).json({ success: false, error: 'Email is not verified yet' });
      return;
    }

    const token = signAuthToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as ForgotPasswordInput;

    const [users] = await pool.query<UserRow[]>('SELECT id, email FROM users WHERE email = ? LIMIT 1', [input.email]);

    if (users.length > 0) {
      const user = users[0];
      const code = await createVerificationCode(user.id, user.email, 'reset_password');

      await sendEmail({
        to: user.email,
        subject: 'FinanceTracker - Password reset code',
        text: `Your FinanceTracker password reset code is ${code}. This code expires in 15 minutes.`,
        html: `<p>Your FinanceTracker password reset code is <strong>${code}</strong>.</p><p>This code expires in 15 minutes.</p>`,
      });

      res.json({
        success: true,
        message: 'If the email exists, a reset code has been sent.',
        ...(process.env.NODE_ENV !== 'production' ? { devResetCode: code } : {}),
      });
      return;
    }

    res.json({ success: true, message: 'If the email exists, a reset code has been sent.' });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as ResetPasswordInput;

    const [users] = await pool.query<UserRow[]>('SELECT id, email FROM users WHERE email = ? LIMIT 1', [input.email]);
    if (users.length === 0) {
      res.status(404).json({ success: false, error: 'Account not found for this email' });
      return;
    }

    const user = users[0];

    const [codes] = await pool.query<VerificationCodeRow[]>(
      `
        SELECT id, code_hash, expires_at
        FROM auth_verification_codes
        WHERE user_id = ? AND email = ? AND purpose = 'reset_password' AND used_at IS NULL
        ORDER BY id DESC
        LIMIT 1
      `,
      [user.id, user.email]
    );

    if (codes.length === 0) {
      res.status(400).json({ success: false, error: 'No active reset code found' });
      return;
    }

    const codeRecord = codes[0];

    if (new Date(codeRecord.expires_at).getTime() < Date.now()) {
      res.status(400).json({ success: false, error: 'Reset code has expired' });
      return;
    }

    const isCodeValid = await verifyPassword(input.code, codeRecord.code_hash);
    if (!isCodeValid) {
      res.status(400).json({ success: false, error: 'Invalid reset code' });
      return;
    }

    const passwordHash = await hashPassword(input.newPassword);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
    await pool.query('UPDATE auth_verification_codes SET used_at = NOW() WHERE id = ?', [codeRecord.id]);

    res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
}
