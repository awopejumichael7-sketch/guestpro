# GuestPass Pro v0.4.0 — Frontend/API integration development

## Added
- Registration and login screens connected to `/api/auth/register` and `/api/auth/login`.
- JWT session token stored in browser localStorage, with sign-out and session recovery.
- Authenticated workspace loading from `/api/auth/me` and `/api/events`. A default event is created for a newly registered organization.
- Guest create/update/delete and CSV import are routed to the event API when signed in.
- Seat generation and guest seat assignment use the API when signed in.
- Check-in and check-out operations use the API when signed in.
- Event settings are saved to the API when signed in.
- Workspace organization identity and sign-out controls added to the sidebar.
- Setup documentation updated for the separately hosted API.

## Important limitations
- Existing browser-local records are not automatically migrated; export CSV from the old browser prototype and import after signing in.
- The API must be deployed separately from GitHub Pages and `VITE_API_BASE_URL` must be configured at frontend build time.
- JSON-file storage remains development-only. No production database, Google Drive/Sheets integration, staff roles, billing, or licensing is implemented by this change.
- Full frontend production build and runtime API tests were not executed because npm dependencies could not be installed in this environment.
