# Face Yoga PWA (MVP)

Mobile-first face yoga coaching with:

1. Supabase Auth (email/password login)
1. Camera quality gate (light/blur/distance/yaw/fps checks)
2. Adaptive calibration (90-180 sec)
3. Real-time feedback (green/red/yellow + audio cue + landmark debug)
4. Session history and progress summaries
5. Opt-in anonymous landmark telemetry + fairness buckets

Raw camera video is processed in browser and not persisted.

## Project Structure

- `app/`: Next.js routes + API handlers
- `components/`: UI components (camera and PWA helpers)
- `lib/domain/`: core domain types and movement definitions
- `lib/vision/`: quality scoring and normalization logic
- `lib/session/`: state machine and frame evaluator
- `lib/server/`: API parsing and server store abstraction
- `lib/domain/reference.ts`: movement reference metadata contract
- `supabase/migrations/`: SQL schema + RLS policies
- `docs/`: architecture and operations docs

## Local Development

```bash
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Quality Gates

```bash
npm run lint
npm run typecheck
npm run test
```

CI (`.github/workflows/ci.yml`) runs the same gates on pull requests.

## GitHub Setup (first time)

Follow `docs/ops/github-setup.md`.

## Supabase Setup (first time)

Follow `docs/ops/supabase-setup.md`.

## Current MVP Notes

- Face detection currently uses browser `FaceDetector` when available.
- Session evaluation uses quality confidence plus landmark-based normalization when available.
- Reference video metadata now comes from `/api/reference/movements` contract.
- Auth flow lives at `/auth`; API routes now require bearer token.
- Telemetry upload is opt-in and blocked unless consent is enabled.
- If Supabase env vars are defined, calibration/session/history endpoints persist and read from DB.
