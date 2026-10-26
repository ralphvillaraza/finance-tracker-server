import jwt from 'jsonwebtoken';

export interface AuthTokenPayload {
  userId: number;
  username: string;
  email: string;
}

const DEFAULT_JWT_SECRET = 'finance-tracker-dev-secret-change-me';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}
