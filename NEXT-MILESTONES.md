# GuestPass Pro — phase plan and QA status

## Phase 1 — Browser prototype
Implemented: guest CRUD, local photo data, browser-local persistence, seating generation, local duplicate-seat checks, CSV import/export, local check-in, printable QR passes, responsive layout, PWA shell.

## Phase 2 — API foundation (v0.3.0 source)
Implemented in source: registration/login, scrypt password hashing, signed bearer tokens, tenant-scoped event/guest access, seat generation and management, seat assignment checks, check-in/check-out, attendance report, CORS allow-list, Helmet headers, auth rate limiting. Additional API tests have been added.

## Phase 3 — Frontend/API integration (not completed)
Add registration/login screens, authenticated API client, session lifecycle, event selection, loading/error states, and a one-way import/migration path from local demo data.

## Phase 4 — Google Drive/Sheets integration (not completed)
Implement server-side Google OAuth or a secure supported authorization flow, least-privilege scopes, per-organization storage mapping, token encryption/refresh, quota handling, backups, and authorization tests. Never put Google client secrets or refresh tokens in frontend code.

## Phase 5 — Production identity and tenant controls (not completed)
Email verification, password reset, staff/team invitations, roles/permissions, account recovery, rate-limit policy, session revocation, privacy controls, retention/deletion, and audit logging.

## Phase 6 — Secure invitation and entrance workflow (not completed)
Use high-entropy opaque ticket tokens or signed tickets; server-side event scoping, revocation, duplicate scan handling, check-in audit history, staff permissions, and real QR scanner tests. Current frontend QR is not a security boundary.

## Phase 7 — Production data layer (not completed)
Replace the development-only JSON adapter with a durable repository implementation that supports concurrency and transactions. Google Sheets may work for an early low-concurrency pilot, but should not be treated as an atomic high-concurrency database for entrance operations. Add migration and restore tests.

## Phase 8 — SaaS and self-hosted product (not completed)
Subscription plans, hosted billing, license activation/renewal, tenant administration, tenant-level quotas, operational monitoring, backups, and deployment automation.

## Verification status for this handoff

- `node --check` passed for all server modules and API test source files.
- Full API integration tests could not run in the authoring environment because npm dependency installation timed out and `supertest` was unavailable.
- Frontend production build could not be run because Vite and project dependencies were not installed.
- Therefore, this handoff is **not certified as fully tested**, and no claim is made that all phases are complete. Run the QA commands in README.md on a machine where npm installation succeeds, then fix any failures before using real data.
