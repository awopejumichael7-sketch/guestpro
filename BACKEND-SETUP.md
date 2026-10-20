# GuestPass Pro API — local development foundation

This milestone adds a separate Node/Express API with account registration/login, signed bearer sessions, organization-scoped event and guest routes, seat generation, server-side seat uniqueness checks, check-in, and attendance reports.

## 1. Requirements
- Node.js 22 LTS or newer
- npm
- Keep the React frontend and API running in separate terminals while developing

## 2. Configure
From the project root (the folder containing `package.json`):

PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace `JWT_SECRET` with a long random secret of at least 32 characters. Keep `.env` private and never paste it into a public repository or browser code.

## 3. Install and start

```powershell
npm.cmd install
npm.cmd run dev:api
```

API health check: `http://localhost:8787/api/health`

In another VS Code terminal, the current frontend can still be started with:

```powershell
npm.cmd run dev
```

**Important:** this milestone supplies the API foundation; the existing React screens still use browser-local storage and are not yet connected to the API. Do not assume browser data is synced to the API.

## 4. Run API tests

```powershell
npm.cmd run test:api
```

The tests cover health, registration/login, input validation, tenant isolation, seat generation/assignment rules, check-in/check-out, and attendance reports. They require installed npm dependencies.

## 5. API overview
- `POST /api/auth/register` — create organization owner and organization
- `POST /api/auth/login` — sign in
- `GET /api/auth/me` — current account and organization
- `GET|POST /api/events` — list/create events
- `GET|PATCH|DELETE /api/events/:eventId` — event details and maintenance
- `POST /api/events/:eventId/guests` — add guest
- `PATCH|DELETE /api/events/:eventId/guests/:guestId` — update/delete guest
- `POST /api/events/:eventId/seats/generate` — generate seats
- `PATCH|DELETE /api/events/:eventId/seats/:seatId` — manually edit, block/unblock, or delete an unoccupied seat
- `POST /api/events/:eventId/check-in` — check in by invitation code
- `POST /api/events/:eventId/guests/:guestId/check-out` — reverse a check-in
- `GET /api/events/:eventId/reports/attendance` — attendance summary

Authenticated routes use `Authorization: Bearer <token>`.

## 6. Current limits — read before real deployment
- The JSON file adapter is for local development only. It serializes writes within one Node process but is not a substitute for a transactional database in a multi-instance or high-concurrency production deployment.
- Google Drive/Sheets is not connected yet. The next storage milestone should introduce a repository interface and server-side Google OAuth/Drive integration without exposing credentials in the frontend.
- The React UI has not yet been migrated to use this API. Current guest records remain in browser storage.
- Email verification, password reset, team invitations, audit logs, retention controls, billing, license enforcement, and full production security review remain outstanding.
- QR links in the current UI are convenience links, not signed tickets. Server-side invitation tokens and revocation should be added before real event entry.
