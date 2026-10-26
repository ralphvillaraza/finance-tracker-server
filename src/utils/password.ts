import bcrypt from 'bcryptjs';

const DEFAULT_SALT_ROUNDS = 10;

function getSaltRounds(): number {
  const parsed = Number(process.env.PASSWORD_SALT_ROUNDS || DEFAULT_SALT_ROUNDS);
  return Number.isFinite(parsed) && parsed > 3 ? parsed : DEFAULT_SALT_ROUNDS;
}

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, getSaltRounds());
}

export async function verifyPassword(plainTextPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
