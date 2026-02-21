import { NextResponse } from "next/server";

import type { TelemetryFrameSample } from "@/lib/domain/types";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { asString, parseNumber } from "@/lib/server/parsers";
import { appendTelemetryFrame, getUserConsent } from "@/lib/server/store";
import { isSupabaseConfigured, persistTelemetryFrame } from "@/lib/server/supabase-rest";

function parseTelemetrySample(payload: Record<string, unknown>): TelemetryFrameSample | null {
  const pseudoSessionKey = asString(payload.pseudoSessionKey);
  const movementId = asString(payload.movementId);
  const modelVersion = asString(payload.modelVersion);
  const deviceOrientation =
    payload.deviceOrientation === "portrait" || payload.deviceOrientation === "landscape"
      ? payload.deviceOrientation
      : null;
  const qualityOverall = parseNumber(payload.qualityOverall);
  const accuracy = parseNumber(payload.accuracy);
  const confidence = parseNumber(payload.confidence);
  const statusColor =
    payload.statusColor === "green" ||
    payload.statusColor === "yellow" ||
    payload.statusColor === "red"
      ? payload.statusColor
      : null;
  const distanceBucket =
    payload.distanceBucket === "near" ||
    payload.distanceBucket === "mid" ||
    payload.distanceBucket === "far"
      ? payload.distanceBucket
      : null;
  const latencyMs = parseNumber(payload.latencyMs);
  const notes = Array.isArray(payload.notes)
    ? payload.notes.filter((item): item is string => typeof item === "string")
    : [];

  if (
    !pseudoSessionKey ||
    !movementId ||
    !modelVersion ||
    !deviceOrientation ||
    qualityOverall === null ||
    accuracy === null ||
    confidence === null ||
    !statusColor ||
    !distanceBucket ||
    latencyMs === null
  ) {
    return null;
  }

  return {
    pseudoSessionKey,
    movementId,
    modelVersion,
    deviceOrientation,
    qualityOverall,
    accuracy,
    confidence,
    statusColor,
    distanceBucket,
    latencyMs,
    notes,
  };
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth.response;
  }

  const payload = await readJson(request);
  if (!isRecord(payload)) {
    return badRequest("Invalid request body.");
  }

  const sample = parseTelemetrySample(payload);
  if (!sample) {
    return badRequest("Invalid telemetry frame payload.");
  }

  const consent = getUserConsent(auth.user.id);
  if (!consent.telemetryOptIn) {
    return NextResponse.json({ error: "Telemetry consent is required." }, { status: 403 });
  }

  appendTelemetryFrame({ userId: auth.user.id, sample });

  if (isSupabaseConfigured()) {
    try {
      await persistTelemetryFrame({ userId: auth.user.id, sample });
    } catch (error) {
      return NextResponse.json(
        {
          error: "Telemetry stored locally but failed to persist in database.",
          details: error instanceof Error ? error.message : "Unknown persistence error.",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
