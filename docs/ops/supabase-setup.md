# Supabase Setup (Required For Persistent Data)

## 1. Create project

1. Create a new Supabase project in EU region.
2. Open SQL Editor and run `supabase/migrations/0001_face_yoga_init.sql`.
3. Run `supabase/migrations/0002_face_yoga_reference_and_consent.sql`.
4. Run `supabase/migrations/0003_face_yoga_telemetry_rollups.sql`.

## 2. Create keys

From Project Settings -> `General` and `API Keys`:

1. Copy `Project URL` from `General`.
2. Copy `anon` key from `API Keys`.
3. Copy `service_role` key from `API Keys`.

## 3. Configure local environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 4. Verify persistence

1. Run `npm run dev`.
2. Complete calibration and finish one session.
3. Verify inserts in tables:
   - `calibration_profiles`
   - `sessions`
   - `session_movements`
   - `user_consents` (after login with consent toggle)
   - `frame_telemetry_samples` (after session if telemetry consent enabled)

If env vars are missing, app falls back to in-memory storage.
