"use client";

import { getAccessToken } from "@/lib/auth/token";
import type {
  CalibrationProfile,
  FrameEvaluation,
  Point3D,
  QualityInput,
  SessionRecord,
  SessionMetrics,
  SessionPhase,
  StatusColor,
  TelemetryFrameSample,
} from "@/lib/domain/types";

interface RequestErrorPayload {
  error?: string;
  details?: string;
}

interface AuthResponse {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string } | null;
  requiresEmailConfirmation?: boolean;
}

function authHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (includeAuth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

function toError(payload: RequestErrorPayload): Error {
  const detail =
    payload && typeof payload.details === "string" && payload.details.length > 0
      ? ` Details: ${payload.details}`
      : "";
  return new Error((payload.error ?? "Request failed") + detail);
}

async function postJSON<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as RequestErrorPayload & T;
  if (!response.ok) {
    throw toError(payload);
  }
  return payload as T;
}

async function postPublicJSON<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(false),
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as RequestErrorPayload & T;
  if (!response.ok) {
    throw toError(payload);
  }
  return payload as T;
}

async function getJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: authHeaders(true),
    cache: "no-store",
  });
  const payload = (await response.json()) as RequestErrorPayload & T;
  if (!response.ok) {
    throw toError(payload);
  }
  return payload as T;
}

export async function signupRequest(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return postPublicJSON("/api/auth/signup", input);
}

export async function loginRequest(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return postPublicJSON("/api/auth/login", input);
}

export async function meRequest(): Promise<{ user: { id: string; email: string | null } }> {
  return getJSON("/api/auth/me");
}

export async function startCalibrationRequest(input: {
  deviceProfile: {
    platform: string;
    userAgent: string;
    videoWidth: number;
    videoHeight: number;
  };
}): Promise<{ calibrationId: string; targetDurationSec: number }> {
  return postJSON("/api/calibration/start", input);
}

export async function calibrationFrameRequest(input: {
  calibrationId: string;
  quality: QualityInput;
  expressionProxy: number;
  landmarks?: Point3D[];
  landmarkModelVersion?: string;
  qualityBreakdown?: {
    brightnessScore: number;
    blurScore: number;
    coverageScore: number;
    yawScore: number;
    occlusionScore: number;
    fpsScore: number;
    overall: number;
  };
  distanceBucket?: "near" | "mid" | "far";
}): Promise<{ qualityLevel: string; averageScore: number }> {
  return postJSON("/api/calibration/frame", input);
}

export async function completeCalibrationRequest(input: {
  calibrationId: string;
}): Promise<CalibrationProfile> {
  return postJSON("/api/calibration/complete", input);
}

export async function startSessionRequest(input: {
  movementIds: string[];
}): Promise<{ sessionId: string }> {
  return postJSON("/api/session/start", input);
}

export async function frameEvalRequest(input: {
  sessionId: string;
  movementId: string;
  quality: QualityInput;
  expressionProxy: number;
  landmarks?: Point3D[];
  landmarkModelVersion?: string;
  frameTimestampMs?: number;
  deviceOrientation?: "portrait" | "landscape";
  calibrationVersion?: string;
  holdProgressSec: number;
  previousPhase: SessionPhase;
  previousStatus: StatusColor;
}): Promise<FrameEvaluation> {
  return postJSON("/api/session/frame-eval", input);
}

export async function endSessionRequest(input: {
  sessionId: string;
}): Promise<SessionMetrics> {
  return postJSON("/api/session/end", input);
}

export async function historySessionsRequest(): Promise<{ sessions: SessionRecord[] }> {
  return getJSON("/api/history/sessions");
}

export async function historyMovementsRequest(): Promise<{
  movements: Array<{
    movementId: string;
    sessions: number;
    averageAccuracy: number;
  }>;
}> {
  return getJSON("/api/history/movements");
}

export async function referenceMovementsRequest(): Promise<{
  movements: Array<{
    movementId: string;
    title: string;
    videoUrl: string;
    guidance: string[];
    targetFeature: "smileRatio" | "mouthOpenRatio" | "jawDropRatio" | "cheekLiftRatio";
    modelVersion: string;
  }>;
}> {
  return getJSON("/api/reference/movements");
}

export async function consentStateRequest(): Promise<{
  telemetryOptIn: boolean;
  consentVersion: string;
}> {
  return getJSON("/api/consent");
}

export async function updateConsentRequest(input: {
  telemetryOptIn: boolean;
  consentVersion: string;
  locale?: string;
}): Promise<{ telemetryOptIn: boolean; consentVersion: string }> {
  return postJSON("/api/consent", input);
}

export async function telemetryFrameRequest(input: TelemetryFrameSample): Promise<{ ok: true }> {
  return postJSON("/api/telemetry/frame", input as unknown as Record<string, unknown>);
}
