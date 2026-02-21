import type {
  CalibrationProfile,
  SessionMetrics,
  SessionRecord,
  TelemetryFrameSample,
} from "@/lib/domain/types";

interface SupabaseRestConfig {
  url: string;
  serviceRoleKey: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_sec: number;
  completion_rate: number;
  consistency: number;
}

interface SessionMovementRow {
  movement_id: string;
  average_accuracy: number;
  rep_count: number;
}

function getConfig(): SupabaseRestConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return null;
  }
  return { url, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  return getConfig() !== null;
}

function authHeaders(config: SupabaseRestConfig): HeadersInit {
  return {
    "Content-Type": "application/json",
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };
}

async function request<T>(
  method: string,
  path: string,
  payload?: unknown,
  prefer?: string,
): Promise<T | null> {
  const config = getConfig();
  if (!config) {
    return null;
  }

  let headers: HeadersInit = authHeaders(config);
  if (prefer) {
    headers = { ...headers, Prefer: prefer };
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${message}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  return (await response.json()) as T;
}

export async function persistCalibrationProfile(profile: CalibrationProfile): Promise<void> {
  await request(
    "POST",
    "calibration_profiles?on_conflict=user_id",
    {
      user_id: profile.userId,
      quality_average: profile.qualityStats.averageScore,
      quality_sample_count: profile.qualityStats.sampleCount,
      recommended_duration_sec: profile.qualityStats.recommendedDurationSec,
      neutral_expression_proxy: profile.baselineGeometry.neutralExpressionProxy,
      expression_std_dev: profile.baselineGeometry.expressionStdDev,
      symmetry_index: profile.symmetry.index,
      device_platform: profile.deviceProfile.platform,
      device_user_agent: profile.deviceProfile.userAgent,
      created_at: profile.createdAt,
    },
    "resolution=merge-duplicates,return=minimal",
  );
}

export async function persistSessionMetrics(metrics: SessionMetrics): Promise<void> {
  await request(
    "POST",
    "sessions",
    {
      id: metrics.sessionId,
      user_id: metrics.userId,
      started_at: metrics.startedAt,
      ended_at: metrics.endedAt,
      duration_sec: metrics.durationSec,
      completion_rate: metrics.completionRate,
      consistency: metrics.consistency,
    },
    "return=minimal",
  );

  if (metrics.movementScores.length === 0) {
    return;
  }

  const movementRows = metrics.movementScores.map((score) => ({
    session_id: metrics.sessionId,
    movement_id: score.movementId,
    average_accuracy: score.averageAccuracy,
    rep_count: score.repCount,
  }));

  await request("POST", "session_movements", movementRows, "return=minimal");
}

function toSessionRecord(row: SessionRow): SessionRecord {
  return {
    sessionId: row.id,
    userId: row.user_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSec: row.duration_sec,
    averageAccuracy: row.completion_rate,
    completionRate: row.completion_rate,
  };
}

async function getSessionIdsForUser(userId: string): Promise<string[]> {
  const encoded = encodeURIComponent(userId);
  const rows =
    (await request<Array<{ id: string }>>(
      "GET",
      `sessions?select=id&user_id=eq.${encoded}&order=started_at.desc&limit=200`,
    )) ?? [];
  return rows.map((row) => row.id);
}

export async function fetchSessionHistory(userId: string): Promise<SessionRecord[]> {
  const encoded = encodeURIComponent(userId);
  const rows =
    (await request<SessionRow[]>(
      "GET",
      `sessions?select=id,user_id,started_at,ended_at,duration_sec,completion_rate,consistency&user_id=eq.${encoded}&order=started_at.desc&limit=200`,
    )) ?? [];
  return rows.map(toSessionRecord);
}

export async function fetchMovementHistory(userId: string): Promise<
  Array<{
    movementId: string;
    sessions: number;
    averageAccuracy: number;
  }>
> {
  const sessionIds = await getSessionIdsForUser(userId);
  if (sessionIds.length === 0) {
    return [];
  }

  const idsClause = sessionIds.join(",");
  const rows =
    (await request<SessionMovementRow[]>(
      "GET",
      `session_movements?select=movement_id,average_accuracy,rep_count&session_id=in.(${idsClause})`,
    )) ?? [];

  const buckets = new Map<string, { count: number; score: number }>();
  for (const row of rows) {
    const current = buckets.get(row.movement_id) ?? { count: 0, score: 0 };
    current.count += 1;
    current.score += row.average_accuracy;
    buckets.set(row.movement_id, current);
  }

  return [...buckets.entries()].map(([movementId, value]) => ({
    movementId,
    sessions: value.count,
    averageAccuracy: value.score / Math.max(1, value.count),
  }));
}

export async function fetchUserConsent(userId: string): Promise<{
  telemetryOptIn: boolean;
  consentVersion: string;
} | null> {
  const encoded = encodeURIComponent(userId);
  const rows =
    (await request<
      Array<{
        telemetry_opt_in: boolean;
        consent_version: string;
      }>
    >(
      "GET",
      `user_consents?select=telemetry_opt_in,consent_version&user_id=eq.${encoded}&limit=1`,
    )) ?? [];
  if (!rows.length) {
    return null;
  }
  return {
    telemetryOptIn: !!rows[0].telemetry_opt_in,
    consentVersion: rows[0].consent_version ?? "v1",
  };
}

export async function persistUserConsent(input: {
  userId: string;
  telemetryOptIn: boolean;
  consentVersion: string;
  locale: string;
}): Promise<void> {
  await request(
    "POST",
    "user_consents?on_conflict=user_id",
    {
      user_id: input.userId,
      telemetry_opt_in: input.telemetryOptIn,
      consent_version: input.consentVersion,
      locale: input.locale,
      updated_at: new Date().toISOString(),
    },
    "resolution=merge-duplicates,return=minimal",
  );
}

export async function persistTelemetryFrame(input: {
  userId: string;
  sample: TelemetryFrameSample;
}): Promise<void> {
  await request(
    "POST",
    "frame_telemetry_samples",
    {
      user_id: input.userId,
      pseudo_session_key: input.sample.pseudoSessionKey,
      movement_id: input.sample.movementId,
      model_version: input.sample.modelVersion,
      device_orientation: input.sample.deviceOrientation,
      quality_overall: input.sample.qualityOverall,
      accuracy: input.sample.accuracy,
      confidence: input.sample.confidence,
      status_color: input.sample.statusColor,
      distance_bucket: input.sample.distanceBucket,
      latency_ms: input.sample.latencyMs,
      notes: input.sample.notes ?? [],
      created_at: new Date().toISOString(),
    },
    "return=minimal",
  );
}
