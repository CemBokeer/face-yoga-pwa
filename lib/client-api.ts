"use client";

import { getAccessToken } from "@/lib/auth/token";
import type {
  CalibrationProfile,
  FrameEvaluation,
  QualityInput,
  SessionRecord,
  SessionMetrics,
  SessionPhase,
  StatusColor,
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
