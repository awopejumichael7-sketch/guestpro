import { Router } from 'express';
import { z } from 'zod';
import { loadStore, mutate, newId } from '../lib/store.js';
import { hashPassword, verifyPassword, issueToken } from '../lib/security.js';
import { requireAuth, asyncRoute } from '../lib/middleware.js';

const router = Router();
const registerSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(12).max(128)
});
const loginSchema = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(128) });

router.post('/register', asyncRoute(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Check the organization name, name, email, and password (minimum 12 characters).' });
  const { organizationName, name, email, password } = parsed.data;
  const existing = (await loadStore()).users.find(u => u.email === email);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
  const passwordHash = await hashPassword(password);
  const org = { id: newId(), name: organizationName, createdAt: new Date().toISOString() };
  const user = { id: newId(), organizationId: org.id, name, email, passwordHash, role: 'owner', createdAt: new Date().toISOString() };
  await mutate(db => {
    if (db.users.some(u => u.email === email)) throw Object.assign(new Error('An account with this email already exists.'), { status: 409 });
    db.organizations.push(org); db.users.push(user);
  });
  const token = issueToken(user);
  res.status(201).json({ token, user: { id: user.id, name, email, role: user.role }, organization: org });
}));

router.post('/login', asyncRoute(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const user = (await loadStore()).users.find(u => u.email === parsed.data.email);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const organization = (await loadStore()).organizations.find(o => o.id === user.organizationId);
  res.json({ token: issueToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role }, organization });
}));

router.get('/me', requireAuth, asyncRoute(async (req, res) => {
  const db = await loadStore();
  const user = db.users.find(u => u.id === req.auth.userId && u.organizationId === req.auth.organizationId);
  const organization = db.organizations.find(o => o.id === req.auth.organizationId);
  if (!user || !organization) return res.status(401).json({ error: 'Account not found.' });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, organization });
}));
export default router;
