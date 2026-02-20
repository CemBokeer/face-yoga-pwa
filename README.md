# Face Yoga PWA (MVP)

Mobile-first face yoga coaching with:

1. Camera quality gate (light/blur/distance/yaw/fps checks)
2. Adaptive calibration (90-180 sec)
3. Real-time feedback (green/red/yellow + audio cue)
4. Session history and progress summaries

Raw camera video is processed in browser and not persisted.

## Project Structure

- `app/`: Next.js routes + API handlers
- `components/`: UI components (camera and PWA helpers)
- `lib/domain/`: core domain types and movement definitions
- `lib/vision/`: quality scoring and normalization logic
- `lib/session/`: state machine and frame evaluator
- `lib/server/`: API parsing and server store abstraction
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
- Session evaluation uses normalized expression proxy + quality confidence.
- Reference video in session page is a placeholder URL; replace with expert clips.
- API persistence is currently in-memory store abstraction, with SQL schema prepared for Supabase migration.
- If Supabase env vars are defined, calibration/session/history endpoints persist and read from DB.
