# Vercel deployment notes

## Frontend and API

The Vite frontend continues to build to `dist/`. The Vercel function at
`api/[...path].ts` forwards `/api/*` requests to the existing Express app in
`server/app.ts`. The Express route paths remain unchanged.

The local development server remains available with:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH="$HOME/.config/teara-workhub/serviceAccountKey.json" npm run server
```

## Firebase Admin credentials on Vercel

Set this environment variable in Vercel (Production, and Preview if needed):

- `FIREBASE_SERVICE_ACCOUNT_BASE64`

Generate its value locally without printing the credential contents:

```bash
base64 -w 0 "$HOME/.config/teara-workhub/serviceAccountKey.json"
```

Copy the command output directly into the Vercel environment-variable value field.
Do not commit the service-account JSON or paste its contents into chat.

The backend also supports `FIREBASE_SERVICE_ACCOUNT_JSON` (raw JSON) and
`FIREBASE_SERVICE_ACCOUNT_PATH` (local development). Base64 is recommended for
Vercel because it avoids multiline environment-variable formatting issues.

After adding the variable, redeploy the Vercel project. Keep the existing Vite
Build Command (`npm run build`) and Output Directory (`dist`); the `/api/*`
function is deployed alongside the static frontend.

## Smoke tests

After deployment, open:

- `/api/health` — expected JSON: `{"status":"ok"}`

Then sign in and test attendance. A valid request should reach Express and return
an application response (for example, a successful check-in or a validation/
authorization error), not Vercel's `NOT_FOUND` response.
