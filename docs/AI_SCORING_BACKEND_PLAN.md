# AI Scoring Backend Plan

## Purpose

This document defines the safe production architecture for real AI scoring in AquaGate.
It is a planning artifact only.

Current status:
- The frontend mock AI score flow exists for local and development testing.
- No real AI provider is connected.
- No AI API key is stored in the frontend.
- No Firebase Functions deployment is included in this step.

Warning:
Frontend mock AI scoring is dev-only and must not be marketed, described, or presented as real AI evaluation.

## Production Architecture

### Frontend Responsibilities

The frontend should only trigger backend scoring.

Expected production flow:
1. Admin clicks `Score with AI`.
2. Frontend calls a backend endpoint only.
3. Frontend sends a minimal request such as `submissionId` and optional `forceRescore`.
4. Frontend shows loading, success, or failure state.
5. Frontend reads scored results back from Firestore after backend completion.

Rules:
- Frontend must never call OpenAI, Gemini, Claude, or any other AI provider directly.
- Frontend must never contain AI API keys.
- Vite env must never contain production AI secrets.
- Frontend should not build prompts or hold privileged backend logic.

### Backend Responsibilities

The backend should be implemented as either:
- Firebase Cloud Functions
- Cloud Run with a Node.js service

Expected backend flow:
1. Receive a trusted scoring request from admin tooling.
2. Read the submission document.
3. Read candidate, program, questions, and active rules from Firestore.
4. Validate that the submission is complete and scorable.
5. Build the AI prompt securely on the backend.
6. Call the AI provider using a backend-only secret.
7. Validate the returned JSON structure.
8. Apply AquaGate selection rules after AI scoring.
9. Write final score output back to Firestore.
10. Return a compact success or failure response to the frontend.

## Firestore Data Flow

### Firestore Input Collections

The backend scorer should read from:
- `submissions`
- `questions`
- `selectionRules`
- `programs`
- `candidates`

### Firestore Output Fields

The backend scorer should write back to the submission document:
- `totalScore`
- `aiScores`
- `aiSummary`
- `aiRecommendation`
- `ruleUsedSnapshot`
- `aiRubricUsedSnapshot`
- `status`
- `scoredAt`
- `updatedAt`

### Suggested Backend Read Model

The scoring worker should assemble:
- Submission answers
- Candidate metadata if needed for audit or prompt context
- Program title and configuration
- Ordered question list
- Active rule version
- Rubric snapshot for each question

### Suggested Backend Write Model

The backend should write a single consistent scoring result payload.
It should avoid partial success unless there is a clearly tracked retry state.

## Scoring Prompt Design

The production prompt should be assembled on the backend only.

Prompt ingredients:
- Program name
- Ordered list of questions
- Rubric or scoring guidance per question
- Maximum score per question
- Candidate answers
- Required output JSON schema
- Explicit instruction to avoid extra prose outside JSON

Expected AI JSON shape:

```json
{
  "aiScores": [
    {
      "questionId": "...",
      "order": 1,
      "score": 8,
      "feedback": "...",
      "strengths": ["..."],
      "weaknesses": ["..."]
    }
  ],
  "aiSummary": "...",
  "aiRecommendation": "..."
}
```

Validation expectations:
- `aiScores` must be an array
- each item must match a real submission question
- `score` must be numeric
- `score` must not exceed the question max score
- `order` must match the stored question ordering
- `aiSummary` must be a string
- `aiRecommendation` must be a string

After validation:
- backend calculates or verifies `totalScore`
- backend applies selection rules
- backend stores a rule snapshot and rubric snapshot used for that scoring run

## Provider Options

### OpenAI

Strengths:
- Strong JSON and structured output reliability
- Mature Node.js backend support
- Good fit for schema-constrained scoring flows

Tradeoffs:
- Cost depends on model choice
- Payment workflow may vary by account setup and region

Notes for India:
- Usually workable for backend billing, but payment convenience depends on account and card acceptance at the time of setup

Firebase/Node compatibility:
- Strong

### Gemini

Strengths:
- Strong fit for Google and Firebase-aligned stacks
- Often convenient for teams already using Google Cloud
- Good Node.js backend compatibility

Tradeoffs:
- JSON reliability can be good, but should still be strictly validated server-side
- Model pricing and quotas should be reviewed carefully before scale

Notes for India:
- Often attractive for Indian teams already comfortable with Google billing flows

Firebase/Node compatibility:
- Strong

### Claude

Strengths:
- Often strong at nuanced written feedback
- Good candidate for rubric-style qualitative scoring

Tradeoffs:
- Structured JSON reliability should still be tested carefully for this workflow
- Availability and billing convenience can vary by account and region

Notes for India:
- Payment and account setup ease may be less predictable than Google-native tooling for some teams

Firebase/Node compatibility:
- Strong with backend SDK or HTTP integration

### Brief Comparison

| Provider | JSON output reliability | Cost predictability | Indian availability/payment ease | Firebase/Node backend compatibility |
| --- | --- | --- | --- | --- |
| OpenAI | Very strong with structured output patterns | Moderate to good | Medium | Strong |
| Gemini | Strong | Good to moderate | Good | Strong |
| Claude | Good, but validate carefully | Moderate | Medium to uncertain | Strong |

Recommendation for first production trial:
- Start with the provider your team can bill and support most reliably.
- Favor JSON consistency and backend ergonomics over model marketing claims.

## Blaze Plan and Secrets

Real deployed Firebase Cloud Functions require billing on the Blaze plan.

Important details:
- Deployed production Cloud Functions need billing enabled.
- Local Firebase Emulator testing can be done before production deployment.
- Cloud Run deployment also requires backend billing considerations.

Secret handling rules:
- API keys must be stored in backend secret manager or secure backend environment configuration.
- API keys must never be stored in frontend code.
- API keys must never be added to Vite env files used by the browser bundle.

## Failure Handling

The real backend implementation should explicitly handle the following cases.

### AI Timeout

If the provider times out:
- mark the scoring attempt as failed or retryable
- do not write partial scored output as final
- allow admin retry later

### Invalid JSON

If the AI returns malformed or non-schema JSON:
- reject the response
- log the raw backend response safely
- mark the attempt as failed
- optionally retry with a stricter repair prompt on the backend

### Partial Scores

If some questions are scored and others are missing:
- treat the response as invalid
- do not compute a final decision from incomplete data

### Missing Questions

If submission answers do not align with the current question set or stored snapshot:
- stop scoring
- mark for investigation or admin review

### Rules Missing

If no active rules or valid snapshot can be found:
- stop scoring
- do not invent default production rules silently

### Duplicate Scoring

If a submission was already scored:
- default to no-op unless admin requests rescore
- preserve audit history if rescoring is allowed later

### Admin Rescore

If admin requests rescore:
- write a new score attempt or score version
- preserve the old result for audit if possible
- record who triggered the rescore and when

## Safe Backend Endpoints

Possible endpoint shapes:

### Callable Function Pattern

Frontend sends:

```json
{
  "submissionId": "abc123",
  "forceRescore": false
}
```

Backend returns:

```json
{
  "ok": true,
  "submissionId": "abc123",
  "status": "shortlisted"
}
```

### HTTP Function or Cloud Run Pattern

Suggested route:
- `POST /score-submission`

Suggested request body:

```json
{
  "submissionId": "abc123",
  "forceRescore": false
}
```

Suggested response body:

```json
{
  "ok": true,
  "submissionId": "abc123",
  "status": "waitlisted",
  "scoredAt": "2026-05-10T12:00:00.000Z"
}
```

## Suggested Validation Checklist

Before calling the AI provider, backend should verify:
- submission exists
- submission has answers
- program exists
- questions exist
- active rules exist
- question count matches the scorable answer set
- submission is not already locked by another scoring attempt

After the provider responds, backend should verify:
- valid JSON
- all expected questions covered
- all scores numeric and in range
- summary and recommendation present
- computed total is consistent

## Suggested Audit Fields Later

These are optional future additions and are not required in the current app:
- `scoreAttemptId`
- `scoreProvider`
- `scoreModel`
- `scoreLatencyMs`
- `scoreFailureCode`
- `scoreFailureMessage`
- `rescoredBy`
- `rescoredAt`

## Next Implementation Phases

### Phase A: Cloud Function Skeleton Without Real AI

Build:
- backend function entry point
- Firestore read and validation logic
- prompt builder module
- JSON validator module
- Firestore write module

Do not add:
- real provider API call
- production secrets

### Phase B: Local Emulator Test

Test locally with:
- Firebase Emulator
- seeded submission data
- mocked provider response

Verify:
- Firestore reads
- schema validation
- rule application
- Firestore writes
- error handling paths

### Phase C: Add AI Provider With Secret

Add:
- one provider SDK or HTTP client
- backend-only secret configuration
- strict JSON validation and retry strategy

Keep:
- frontend unchanged except backend trigger wiring

### Phase D: Admin Trigger Real AI Score

Add:
- admin button such as `Score with AI`
- loading and retry UX
- score status refresh flow

Keep:
- no frontend secrets
- no provider calls from browser

### Phase E: Production Deploy After Blaze

Complete:
- billing-enabled backend deployment
- secret manager configuration
- production auth checks
- monitoring and logs
- controlled rollout with real submissions

## Final Safety Notes

- Real AI must run on a backend only.
- Frontend mock scoring is a development aid only.
- Mock results must not be described to users as real AI output.
- Production rollout should happen only after backend validation, emulator testing, secret storage, and billing setup are complete.
