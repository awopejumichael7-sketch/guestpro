# GuestPass Pro — development prototype

GuestPass Pro is a guest invitation, photo identification, seating, and entrance check-in web application. This repository currently contains a browser-based React prototype and a separate development API. They are **not yet integrated**.

## Browser prototype features

- Add, edit, delete, search, and filter guest records.
- Attach a small guest photograph.
- Generate seating layouts (up to 5,000 seats in the browser prototype) and prevent duplicate assignments in that browser.
- Record and reverse check-ins locally.
- Generate QR-coded invitation passes and print them. The QR link is a convenience link, not a secure ticket-validation mechanism.
- Import/export CSV, responsive dashboard, installable PWA shell, and browser-local persistence.

## API foundation features (v0.3.0)

- Registration and login, scrypt password hashes, signed bearer tokens, and `/api/auth/me`.
- Organization-scoped event and guest APIs.
- Seat generation, manual seat updates/blocking/deletion, duplicate seat assignment checks, check-in/check-out, and attendance reports.
- Helmet security headers, explicit CORS allow-list, and authentication rate limiting.
- API integration tests for authentication, tenant isolation, validation, seating, check-in, and reports.

## Critical limitations

This is **not production-ready**. The React frontend still uses `localStorage` and does not call the API. The API uses a single-process JSON file adapter for development and must not be used for production or concurrent multi-instance deployment. Google Drive/Sheets storage, OAuth consent, email verification, password reset, staff roles, secure public QR validation, billing, licensing, backups, audit trails, and production deployment configuration remain unfinished.

Do not enter real guest personal data or deploy this as a commercial service yet. Use synthetic test data only.

## Requirements

- Node.js LTS and npm
- VS Code recommended

## Run the browser prototype

From the directory containing `package.json`:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Run the API locally

Copy `.env.example` to `.env`; set `JWT_SECRET` to a unique random secret of at least 32 characters. Never commit `.env`. Then run:

```powershell
npm.cmd install
npm.cmd run dev:api
```

The API listens at `http://localhost:8787`. In another terminal, run `npm.cmd run dev` for the browser prototype. **The prototype and API remain separate in this version.**

## QA commands

```powershell
npm.cmd run check:syntax
npm.cmd run test:api
npm.cmd run build
```

`check:syntax` checks server/test JavaScript syntax. `test:api` requires the declared npm dependencies to be installed. A successful syntax check is not the same as passing integration tests or a production build.

## Windows PowerShell

If PowerShell blocks `npm.ps1`, use `npm.cmd` as shown above. If npm reports that it cannot find `package.json`, use `Get-ChildItem` and change directory into the folder that directly contains `package.json`.

## Deployment

See `DEPLOYMENT.md` for the static frontend deployment notes. GitHub Pages can host the frontend only; it cannot run this API or safely hold OAuth credentials. A real cloud-connected deployment needs a separately hosted backend and a production database.
