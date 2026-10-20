import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import request from 'supertest';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'guestpass-test-'));
process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-jwt-tests'; process.env.DATA_FILE = path.join(tmp, 'db.json'); process.env.CORS_ORIGINS = 'http://localhost:5173';
const { default: app } = await import('../index.js');

async function register(email, organizationName) {
  const response = await request(app).post('/api/auth/register').send({ organizationName, name: 'Test Owner', email, password: 'A-strong-password-123' });
  assert.equal(response.status, 201, JSON.stringify(response.body)); return response.body;
}

test('health endpoint is available', async () => {
  const response = await request(app).get('/api/health'); assert.equal(response.status, 200); assert.equal(response.body.status, 'ok');
});
test('registration, login, event creation, guest creation, and tenant isolation', async () => {
  const a = await register('owner-a@example.com', 'Church A');
  const b = await register('owner-b@example.com', 'Church B');
  const event = await request(app).post('/api/events').set('Authorization', `Bearer ${a.token}`).send({ name: 'Sunday Service', capacity: 100 });
  assert.equal(event.status, 201);
  const guest = await request(app).post(`/api/events/${event.body.event.id}/guests`).set('Authorization', `Bearer ${a.token}`).send({ name: 'Guest One', category: 'VIP' });
  assert.equal(guest.status, 201);
  const otherTenant = await request(app).get(`/api/events/${event.body.event.id}`).set('Authorization', `Bearer ${b.token}`);
  assert.equal(otherTenant.status, 404);
  const login = await request(app).post('/api/auth/login').send({ email: 'owner-a@example.com', password: 'A-strong-password-123' });
  assert.equal(login.status, 200);
  const noAuth = await request(app).get('/api/events'); assert.equal(noAuth.status, 401);
});

test('validates event and guest input and enforces seat assignment rules', async () => {
  const account = await register('seat-owner@example.com', 'Seat Test Org');
  const auth = { Authorization: `Bearer ${account.token}` };
  const badEvent = await request(app).post('/api/events').set(auth).send({ name: 'x', capacity: -1 });
  assert.equal(badEvent.status, 400);
  const event = await request(app).post('/api/events').set(auth).send({ name: 'Seating Test', capacity: 20 });
  assert.equal(event.status, 201);
  const generated = await request(app).post(`/api/events/${event.body.event.id}/seats/generate`).set(auth).send({ count: 2, section: 'Main Hall', columns: 2 });
  assert.equal(generated.status, 201);
  const seatId = generated.body.seats[0].id;
  const guest = await request(app).post(`/api/events/${event.body.event.id}/guests`).set(auth).send({ name: 'Assigned Guest', seatId });
  assert.equal(guest.status, 201);
  const duplicate = await request(app).post(`/api/events/${event.body.event.id}/guests`).set(auth).send({ name: 'Second Guest', seatId });
  assert.equal(duplicate.status, 409);
  const invalidEmail = await request(app).post(`/api/events/${event.body.event.id}/guests`).set(auth).send({ name: 'Invalid Email', email: 'not-an-email' });
  assert.equal(invalidEmail.status, 400);
  const blockOccupied = await request(app).patch(`/api/events/${event.body.event.id}/seats/${seatId}`).set(auth).send({ status: 'blocked' });
  assert.equal(blockOccupied.status, 409);
  const deleteOccupied = await request(app).delete(`/api/events/${event.body.event.id}/seats/${seatId}`).set(auth);
  assert.equal(deleteOccupied.status, 409);
});

test('check-in is idempotent, checkout works, and attendance report is consistent', async () => {
  const account = await register('checkin-owner@example.com', 'Check-in Test Org');
  const auth = { Authorization: `Bearer ${account.token}` };
  const event = await request(app).post('/api/events').set(auth).send({ name: 'Check-in Test' });
  const guest = await request(app).post(`/api/events/${event.body.event.id}/guests`).set(auth).send({ name: 'Arrival Guest', category: 'VIP' });
  const eventId = event.body.event.id;
  const code = guest.body.guest.invitationCode;
  const first = await request(app).post(`/api/events/${eventId}/check-in`).set(auth).send({ invitationCode: code });
  assert.equal(first.status, 200); assert.equal(first.body.alreadyCheckedIn, false);
  const second = await request(app).post(`/api/events/${eventId}/check-in`).set(auth).send({ invitationCode: code.toLowerCase() });
  assert.equal(second.status, 200); assert.equal(second.body.alreadyCheckedIn, true);
  const report = await request(app).get(`/api/events/${eventId}/reports/attendance`).set(auth);
  assert.equal(report.status, 200); assert.equal(report.body.total, 1); assert.equal(report.body.arrived, 1);
  const checkout = await request(app).post(`/api/events/${eventId}/guests/${guest.body.guest.id}/check-out`).set(auth);
  assert.equal(checkout.status, 200); assert.equal(checkout.body.guest.checkedInAt, '');
  const after = await request(app).get(`/api/events/${eventId}/reports/attendance`).set(auth);
  assert.equal(after.body.arrived, 0); assert.equal(after.body.notArrived, 1);
});

test('organization cannot mutate another organization\'s event, guest, or seat', async () => {
  const owner = await register('isolation-owner@example.com', 'Isolation Owner');
  const stranger = await register('isolation-stranger@example.com', 'Isolation Stranger');
  const ownerAuth = { Authorization: `Bearer ${owner.token}` };
  const strangerAuth = { Authorization: `Bearer ${stranger.token}` };
  const event = await request(app).post('/api/events').set(ownerAuth).send({ name: 'Private Event' });
  const eventId = event.body.event.id;
  const guest = await request(app).post(`/api/events/${eventId}/guests`).set(ownerAuth).send({ name: 'Private Guest' });
  const strangerGuest = await request(app).patch(`/api/events/${eventId}/guests/${guest.body.guest.id}`).set(strangerAuth).send({ name: 'Stolen Guest' });
  assert.equal(strangerGuest.status, 404);
  const strangerDelete = await request(app).delete(`/api/events/${eventId}`).set(strangerAuth);
  assert.equal(strangerDelete.status, 404);
  const strangerCheckin = await request(app).post(`/api/events/${eventId}/check-in`).set(strangerAuth).send({ invitationCode: guest.body.guest.invitationCode });
  assert.equal(strangerCheckin.status, 404);
});
