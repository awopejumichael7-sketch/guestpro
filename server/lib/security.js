import crypto from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  const [scheme, salt, hash] = String(encoded || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const derived = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(hash, 'hex');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}
export function issueToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be set to at least 32 characters.');
  return jwt.sign({ sub: user.id, org: user.organizationId, role: user.role }, secret, { expiresIn: '8h', issuer: 'guestpass-pro' });
}
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { issuer: 'guestpass-pro' });
}
export function newInvitationCode() {
  return `GP-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
}
