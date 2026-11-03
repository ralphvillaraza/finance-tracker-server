import jwt from 'jsonwebtoken';

export interface AuthTokenPayload {
  userId: number;
  username: string;
  email: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET is not configured. Set it in server/.env before starting the app.');
  }

  return secret;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}
