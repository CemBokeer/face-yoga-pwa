# Supabase Setup (Required For Persistent Data)

## 1. Create project

1. Create a new Supabase project in EU region.
2. Open SQL Editor and run `supabase/migrations/0001_face_yoga_init.sql`.

## 2. Create keys

From Project Settings -> API:

1. Copy `Project URL`.
2. Copy `anon` key.
3. Copy `service_role` key.

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

If env vars are missing, app falls back to in-memory storage.
