# Teara WorkHub implementation notes

## Changes included

- Admin employee directory now loads through the authenticated `GET /api/admin/users` backend endpoint instead of a client-side Firestore collection query.
- The main application refreshes the employee directory as part of `loadData`, so newly created and activated/deactivated accounts are reflected after refresh.
- Account-status toggling now uses the backend directory response to identify the employee and returns the updated profile without a second client-side profile read.
- Attendance history and the admin attendance list now load through the existing authenticated `/api/attendance/history` and `/api/attendance` endpoints.
- Attendance and work-log API clients use `VITE_API_BASE_URL` when configured, otherwise `/api` (served by the Vite proxy in local development).
- Added a separate admin Reject action for work logs. A rejection requires a reason, is recorded in review history, and is terminal. Revision requests remain a distinct, editable/resubmittable state.
- Added rejected status styling, filtering, and employee-facing/admin-facing status text in the review interface.

## Local run

Terminal 1:
```bash
FIREBASE_SERVICE_ACCOUNT_PATH="$HOME/.config/teara-workhub/serviceAccountKey.json" npm run server
```

Terminal 2:
```bash
npm run dev
```

The Vite development server proxies `/api` requests to `http://localhost:4000`.

## Build / verification

Run:
```bash
npm run lint
npm run server:build
npm run build
```

The source changes were reviewed for consistency, but an automated TypeScript/Vite build could not be completed in the preparation environment because `npm ci` timed out. The installed Firebase packages also report a Node.js engine requirement of `>=24.12.0`; the preparation environment has Node.js 22.16.0. Use Node.js 24.12.0 or newer for dependency installation and verification.

## Deployment note

If the frontend and Express API are hosted on different origins, set `VITE_API_BASE_URL` to the API origin plus `/api` at frontend build time. Leave it unset for local Vite development.
