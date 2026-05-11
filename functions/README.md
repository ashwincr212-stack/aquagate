# AquaGate Functions Skeleton

This folder is the backend skeleton for future AI scoring in AquaGate.

## Current Scope

- Backend code skeleton only
- No real Gemini API call yet
- No Gemini API key added yet
- No OpenAI or Claude integration added
- No deployment required in this step

## Provider Direction

Gemini is planned as the first real provider later because it is expected to be more cost-effective for this project.

That future step must still keep all provider access on the backend only.
Gemini placeholders can be prepared locally, but no real Gemini call should happen until backend secrets are configured.

## Security Rules

- API keys must be stored backend-only using Firebase secrets or secure backend environment variables.
- Use Firebase Secret Manager for deployed Gemini access.
- `functions/.env` is acceptable for local emulator testing only.
- Do not put Gemini keys in root `.env` or Vite env files.
- Frontend must never contain Gemini, OpenAI, or Claude API keys.
- Browser code must never call the AI provider directly.

## Billing Notes

- Blaze is not required for this local skeleton step.
- Blaze will be needed later for deployed Firebase Cloud Functions in production.
- Local Emulator testing can happen before production deployment.
- Gemini API keys are not needed for the emulator step.

## What Exists Here

- `index.js`: callable `scoreSubmission` skeleton
- `services/firestoreAccess.js`: Firestore read/write helpers
- `services/geminiProvider.js`: Gemini prompt and response placeholders only
- `services/promptBuilder.js`: future Gemini payload builder
- `services/scoringService.js`: deterministic backend mock scorer
- `services/rulesEngine.js`: backend rule evaluation

## What Does Not Exist Yet

- Provider secrets
- Retry and queue infrastructure
- Production deployment configuration

## Local Backend-Only Key Setup Later

When Gemini is ready to be configured locally:
- Copy `functions/.env.example` to `functions/.env`
- Add `GEMINI_API_KEY_LOCAL` only inside `functions/.env`
- Never add the Gemini key to root `.env`
- Never prefix the Gemini key with `VITE_`
- Never place the Gemini key anywhere inside `src/`
- For production, store the key as Firebase Functions secret `GEMINI_API_KEY` before deployment

This step only checks configuration readiness.
Real Gemini calls remain disabled until you add a backend-only key locally.

## Production Deployment Readiness

- Vercel frontend should never receive the Gemini API key.
- In local development, the frontend uses the Functions emulator because `src/firebase.js` connects the Functions client to `127.0.0.1:5001` only in `import.meta.env.DEV`.
- In production, the same callable frontend code automatically talks to deployed Firebase Functions.
- `scoreSubmissionWithGemini` and `getAiProviderStatus` now support Firebase Functions secret `GEMINI_API_KEY` in production and fall back to `functions/.env` key `GEMINI_API_KEY_LOCAL` locally.

Set the deployed Gemini secret with Firebase CLI:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Optional local/deployed model override stays in backend env only:

```bash
GEMINI_MODEL=gemini-1.5-flash
```

## Next Safe Step

Use the Firebase Emulator to test backend reads, writes, and mock scoring logic before any real provider integration.

## Local Test Flow

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run functions:serve
```

Then test:
- Go to `Admin Submissions`
- Select a submission
- Click `Backend Mock Score`

Notes:
- No Blaze is needed for the local emulator flow.
- Blaze is needed later only when deploying Cloud Functions.
- No Gemini key is needed yet because this backend path is still mock-only.
- Local emulator testing can validate the backend flow before any deployment step.

## Local-Only Gemini Test

A) Create `functions/.env` manually:

```bash
GEMINI_API_KEY_LOCAL=your_key_here
GEMINI_MODEL=gemini-1.5-flash
```

B) Start the emulator:

```bash
npm run functions:serve
```

C) Start the app:

```bash
npm run dev
```

D) Test:
- Go to `Admin Submissions`
- Select a submission
- Click `Gemini Score`

Warnings:
- Do not commit `functions/.env`
- Do not put the Gemini key in the frontend
- Do not deploy yet
- Blaze is needed later only for production deployment
