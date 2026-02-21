# Face Yoga PWA Architecture (MVP)

## Runtime Components

1. `Client Vision Engine`
   - Captures camera frames.
   - Computes frame quality signals (light, blur, face coverage, yaw, fps).
   - Produces expression proxy for movement scoring.
   - Produces canonical landmark points with fallback model versions.

2. `Calibration Engine`
   - Stores sampled frame metrics.
   - Builds user baseline (neutral expression + variance).
   - Recommends calibration duration (90-180 sec).

3. `Session Evaluator`
   - Uses movement definitions and baseline-normalized values.
   - Mixes expression-proxy and landmark normalized scoring (when available).
   - Emits `green` / `red` / `yellow`.
   - Provides visual + audio cue text.
   - Uses uncertainty fallback to avoid over-confident red outputs.

4. `History Layer`
   - Saves session summary and movement aggregates.
   - Serves user timeline endpoints.
   - Stores opt-in telemetry and fairness buckets by device orientation and distance.

## Data Contract

Core contracts are defined in `lib/domain/types.ts`:

- `CalibrationProfile`
- `MovementDefinition`
- `FrameEvaluation`
- `SessionMetrics`
- `PersonalBaselineV2`
- `TelemetryFrameSample`
- `FairnessBucketMetrics`

## Privacy Model

1. Raw camera video is processed in browser only.
2. Persisted payloads are metric summaries, not face video frames.
3. RLS-ready SQL schema is available in `supabase/migrations/0001_face_yoga_init.sql`.
