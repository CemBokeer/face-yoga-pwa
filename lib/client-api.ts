"use client";

import type {
  CalibrationProfile,
  FrameEvaluation,
  QualityInput,
  SessionMetrics,
  SessionPhase,
  StatusColor,
} from "@/lib/domain/types";

async function postJSON<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload as T;
}

export async function startCalibrationRequest(input: {
  userId: string;
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
  userId: string;
  movementIds: string[];
}): Promise<{ sessionId: string }> {
  return postJSON("/api/session/start", input);
}

export async function frameEvalRequest(input: {
  sessionId: string;
  userId: string;
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
