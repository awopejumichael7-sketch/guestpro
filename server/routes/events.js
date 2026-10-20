import { Router } from 'express';
import { z } from 'zod';
import { loadStore, mutate, newId } from '../lib/store.js';
import { requireAuth, asyncRoute } from '../lib/middleware.js';
import { newInvitationCode } from '../lib/security.js';

const router = Router(); router.use(requireAuth);
const eventSchema = z.object({ name: z.string().trim().min(2).max(160), date: z.string().max(40).optional().default(''), venue: z.string().max(200).optional().default(''), capacity: z.number().int().min(1).max(100000).optional().default(100), section: z.string().max(100).optional().default('Main Hall') });
const guestSchema = z.object({ name: z.string().trim().min(1).max(160), title: z.string().trim().max(120).optional().default(''), organization: z.string().trim().max(160).optional().default(''), category: z.string().trim().min(1).max(80).optional().default('General'), phone: z.string().trim().max(50).optional().default(''), email: z.string().trim().max(254).optional().default('').refine(v => !v || z.string().email().safeParse(v).success, 'Enter a valid email address.'), photo: z.string().max(1_300_000).optional().default(''), seatId: z.string().max(100).optional().default(''), notes: z.string().max(2000).optional().default('') });
function eventFor(db, eventId, orgId) { return db.events.find(e => e.id === eventId && e.organizationId === orgId); }
function seatRow(index) {
  let n = index + 1; let label = '';
  while (n > 0) { n--; label = String.fromCharCode(65 + (n % 26)) + label; n = Math.floor(n / 26); }
  return label;
}
function publicGuest(g) { const { organizationId, ...rest } = g; return rest; }

router.get('/', asyncRoute(async (req, res) => {
  const db = await loadStore();
  res.json({ events: db.events.filter(e => e.organizationId === req.auth.organizationId).map(e => ({ ...e, guestCount: db.guests.filter(g => g.eventId === e.id && g.organizationId === req.auth.organizationId).length })) });
}));
router.post('/', asyncRoute(async (req, res) => {
  const parsed = eventSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Invalid event details.' });
  const event = { id: newId(), organizationId: req.auth.organizationId, ...parsed.data, createdAt: new Date().toISOString() };
  await mutate(db => db.events.push(event)); res.status(201).json({ event });
}));
router.get('/:eventId', asyncRoute(async (req, res) => {
  const db = await loadStore(); const event = eventFor(db, req.params.eventId, req.auth.organizationId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  res.json({ event, seats: db.seats.filter(s => s.eventId === event.id && s.organizationId === req.auth.organizationId), guests: db.guests.filter(g => g.eventId === event.id && g.organizationId === req.auth.organizationId).map(publicGuest) });
}));
router.patch('/:eventId', asyncRoute(async (req, res) => {
  const parsed = eventSchema.partial().safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Invalid event details.' });
  let updated; await mutate(db => { const e = eventFor(db, req.params.eventId, req.auth.organizationId); if (!e) return; Object.assign(e, parsed.data, { updatedAt: new Date().toISOString() }); updated = { ...e }; });
  if (!updated) return res.status(404).json({ error: 'Event not found.' }); res.json({ event: updated });
}));
router.delete('/:eventId', asyncRoute(async (req, res) => {
  let found = false; await mutate(db => { const e = eventFor(db, req.params.eventId, req.auth.organizationId); if (!e) return; found = true; db.events = db.events.filter(x => x.id !== e.id); db.guests = db.guests.filter(g => !(g.eventId === e.id && g.organizationId === req.auth.organizationId)); db.seats = db.seats.filter(s => !(s.eventId === e.id && s.organizationId === req.auth.organizationId)); });
  if (!found) return res.status(404).json({ error: 'Event not found.' }); res.status(204).end();
}));
router.post('/:eventId/guests', asyncRoute(async (req, res) => {
  const parsed = guestSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Invalid guest details.' });
  let guest; let failure;
  await mutate(db => {
    const event = eventFor(db, req.params.eventId, req.auth.organizationId); if (!event) { failure = 404; return; }
    const seatId = parsed.data.seatId;
    if (seatId) {
      const seat = db.seats.find(s => s.id === seatId && s.eventId === event.id && s.organizationId === req.auth.organizationId && s.status !== 'blocked');
      if (!seat || db.guests.some(g => g.eventId === event.id && g.organizationId === req.auth.organizationId && g.seatId === seatId)) { failure = 409; return; }
    }
    guest = { id: newId(), eventId: event.id, organizationId: req.auth.organizationId, ...parsed.data, invitationCode: newInvitationCode(), checkedInAt: '', createdAt: new Date().toISOString() };
    db.guests.push(guest);
  });
  if (failure) return res.status(failure).json({ error: failure === 404 ? 'Event not found.' : 'That seat is unavailable or already assigned.' });
  res.status(201).json({ guest: publicGuest(guest) });
}));
router.patch('/:eventId/guests/:guestId', asyncRoute(async (req, res) => {
  const parsed = guestSchema.partial().safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Invalid guest details.' });
  let updated; let failure;
  await mutate(db => {
    const g = db.guests.find(x => x.id === req.params.guestId && x.eventId === req.params.eventId && x.organizationId === req.auth.organizationId);
    if (!g || !eventFor(db, req.params.eventId, req.auth.organizationId)) { failure = 404; return; }
    if (parsed.data.seatId && parsed.data.seatId !== g.seatId) {
      const seat = db.seats.find(s => s.id === parsed.data.seatId && s.eventId === g.eventId && s.organizationId === req.auth.organizationId && s.status !== 'blocked');
      if (!seat || db.guests.some(x => x.id !== g.id && x.eventId === g.eventId && x.organizationId === req.auth.organizationId && x.seatId === parsed.data.seatId)) { failure = 409; return; }
    }
    Object.assign(g, parsed.data, { updatedAt: new Date().toISOString() }); updated = publicGuest(g);
  });
  if (failure) return res.status(failure).json({ error: failure === 404 ? 'Guest not found.' : 'That seat is unavailable or already assigned.' });
  res.json({ guest: updated });
}));
router.delete('/:eventId/guests/:guestId', asyncRoute(async (req, res) => {
  let found = false; await mutate(db => { const g = db.guests.find(x => x.id === req.params.guestId && x.eventId === req.params.eventId && x.organizationId === req.auth.organizationId); if (!g) return; found = true; db.guests = db.guests.filter(x => !(x.id === g.id && x.eventId === req.params.eventId && x.organizationId === req.auth.organizationId)); });
  if (!found) return res.status(404).json({ error: 'Guest not found.' }); res.status(204).end();
}));
router.post('/:eventId/seats/generate', asyncRoute(async (req, res) => {
  const schema = z.object({ count: z.number().int().min(1).max(5000), section: z.string().trim().min(1).max(100).default('Main Hall'), columns: z.number().int().min(1).max(50).default(10) });
  const parsed = schema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Choose 1–5,000 seats and a valid column count.' });
  let seats = []; let failure = '';
  await mutate(db => {
    if (!eventFor(db, req.params.eventId, req.auth.organizationId)) { failure = 'event'; return; }
    const existing = db.seats.filter(s => s.eventId === req.params.eventId && s.organizationId === req.auth.organizationId);
    if (existing.length + parsed.data.count > 10000) { failure = 'limit'; return; }
    const usedLabels = new Set(existing.filter(s => s.section === parsed.data.section).map(s => s.label));
    seats = [];
    let rowIndex = 0;
    while (seats.length < parsed.data.count) {
      const row = seatRow(rowIndex);
      for (let column = 1; column <= parsed.data.columns && seats.length < parsed.data.count; column++) {
        const label = `${parsed.data.section} · ${row}${column}`;
        if (usedLabels.has(label)) continue;
        seats.push({ id: newId(), organizationId: req.auth.organizationId, eventId: req.params.eventId, section: parsed.data.section, row, number: column, status: 'available', label });
        usedLabels.add(label);
      }
      rowIndex++;
      if (rowIndex > 100000) { failure = 'limit'; seats = []; return; }
    }
    db.seats.push(...seats);
  });
  if (failure) return res.status(failure === 'event' ? 404 : 400).json({ error: failure === 'event' ? 'Event not found.' : 'The event seat limit would be exceeded.' }); res.status(201).json({ seats });
}));
router.patch('/:eventId/seats/:seatId', asyncRoute(async (req, res) => {
  const schema = z.object({ section: z.string().trim().min(1).max(100).optional(), row: z.string().trim().min(1).max(20).optional(), number: z.number().int().min(1).max(100000).optional(), label: z.string().trim().min(1).max(120).optional(), status: z.enum(['available', 'blocked']).optional() }).strict();
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) return res.status(400).json({ error: 'Provide valid seat fields to update.' });
  let updated; let failure = '';
  await mutate(db => {
    if (!eventFor(db, req.params.eventId, req.auth.organizationId)) { failure = 'event'; return; }
    const seat = db.seats.find(s => s.id === req.params.seatId && s.eventId === req.params.eventId && s.organizationId === req.auth.organizationId);
    if (!seat) { failure = 'seat'; return; }
    const occupied = db.guests.some(g => g.eventId === seat.eventId && g.organizationId === req.auth.organizationId && g.seatId === seat.id);
    if (parsed.data.status === 'blocked' && occupied) { failure = 'occupied'; return; }
    Object.assign(seat, parsed.data, { updatedAt: new Date().toISOString() });
    updated = { ...seat };
  });
  if (failure) return res.status(failure === 'occupied' ? 409 : 404).json({ error: failure === 'occupied' ? 'An assigned seat cannot be blocked. Reassign the guest first.' : failure === 'event' ? 'Event not found.' : 'Seat not found.' });
  res.json({ seat: updated });
}));
router.delete('/:eventId/seats/:seatId', asyncRoute(async (req, res) => {
  let failure = '';
  await mutate(db => {
    if (!eventFor(db, req.params.eventId, req.auth.organizationId)) { failure = 'event'; return; }
    const seat = db.seats.find(s => s.id === req.params.seatId && s.eventId === req.params.eventId && s.organizationId === req.auth.organizationId);
    if (!seat) { failure = 'seat'; return; }
    if (db.guests.some(g => g.eventId === seat.eventId && g.organizationId === req.auth.organizationId && g.seatId === seat.id)) { failure = 'occupied'; return; }
    db.seats = db.seats.filter(s => !(s.id === seat.id && s.eventId === req.params.eventId && s.organizationId === req.auth.organizationId));
  });
  if (failure) return res.status(failure === 'occupied' ? 409 : 404).json({ error: failure === 'occupied' ? 'Reassign the guest before deleting this seat.' : failure === 'event' ? 'Event not found.' : 'Seat not found.' });
  res.status(204).end();
}));
router.post('/:eventId/check-in', asyncRoute(async (req, res) => {
  const parsed = z.object({ invitationCode: z.string().trim().min(4).max(80) }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Enter an invitation code.' });
  let result; await mutate(db => {
    const guest = db.guests.find(g => g.eventId === req.params.eventId && g.organizationId === req.auth.organizationId && g.invitationCode.toLowerCase() === parsed.data.invitationCode.toLowerCase());
    if (!guest || !eventFor(db, req.params.eventId, req.auth.organizationId)) return;
    if (guest.checkedInAt) { result = { alreadyCheckedIn: true, guest: publicGuest(guest) }; return; }
    guest.checkedInAt = new Date().toISOString(); result = { alreadyCheckedIn: false, guest: publicGuest(guest) };
  });
  if (!result) return res.status(404).json({ error: 'No matching invitation was found for this event.' }); res.json(result);
}));
router.post('/:eventId/guests/:guestId/check-out', asyncRoute(async (req, res) => {
  let guest; let missingEvent = false;
  await mutate(db => {
    if (!eventFor(db, req.params.eventId, req.auth.organizationId)) { missingEvent = true; return; }
    const record = db.guests.find(g => g.id === req.params.guestId && g.eventId === req.params.eventId && g.organizationId === req.auth.organizationId);
    if (!record) return;
    record.checkedInAt = '';
    record.updatedAt = new Date().toISOString();
    guest = publicGuest(record);
  });
  if (missingEvent) return res.status(404).json({ error: 'Event not found.' });
  if (!guest) return res.status(404).json({ error: 'Guest not found.' });
  res.json({ guest });
}));
router.get('/:eventId/reports/attendance', asyncRoute(async (req, res) => {
  const db = await loadStore(); const event = eventFor(db, req.params.eventId, req.auth.organizationId); if (!event) return res.status(404).json({ error: 'Event not found.' });
  const guests = db.guests.filter(g => g.eventId === event.id && g.organizationId === req.auth.organizationId);
  res.json({ event: { id: event.id, name: event.name }, total: guests.length, arrived: guests.filter(g => g.checkedInAt).length, notArrived: guests.filter(g => !g.checkedInAt).length, byCategory: Object.entries(guests.reduce((acc, g) => { acc[g.category] = acc[g.category] || { total: 0, arrived: 0 }; acc[g.category].total++; if (g.checkedInAt) acc[g.category].arrived++; return acc; }, {})) .map(([category, counts]) => ({ category, ...counts })) });
}));
export default router;
