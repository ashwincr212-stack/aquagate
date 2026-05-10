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

## Security Rules

- API keys must be stored backend-only using Firebase secrets or secure backend environment variables.
- Frontend must never contain Gemini, OpenAI, or Claude API keys.
- Browser code must never call the AI provider directly.

## Billing Notes

- Blaze is not required for this local skeleton step.
- Blaze will be needed later for deployed Firebase Cloud Functions in production.
- Local Emulator testing can happen before production deployment.

## What Exists Here

- `index.js`: callable `scoreSubmission` skeleton
- `services/firestoreAccess.js`: Firestore read/write helpers
- `services/promptBuilder.js`: future Gemini payload builder
- `services/scoringService.js`: deterministic backend mock scorer
- `services/rulesEngine.js`: backend rule evaluation

## What Does Not Exist Yet

- Real Gemini SDK
- Real Gemini API call
- Provider secrets
- Retry and queue infrastructure
- Production deployment configuration

## Next Safe Step

Use the Firebase Emulator to test backend reads, writes, and mock scoring logic before any real provider integration.
