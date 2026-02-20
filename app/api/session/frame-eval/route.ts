import { NextResponse } from "next/server";

import { getMovementById } from "@/lib/domain/movements";
import type { SessionPhase, StatusColor } from "@/lib/domain/types";
import { evaluateMovementFrame } from "@/lib/session/evaluator";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { asString, parseNumber, parseQualityInput } from "@/lib/server/parsers";
import { appendSessionEvaluation, getCalibrationProfile } from "@/lib/server/store";
import { evaluateQuality } from "@/lib/vision/quality";

function parsePhase(value: unknown): SessionPhase {
  return value === "activate" || value === "hold" || value === "release"
    ? value
    : "prepare";
}

function parseStatus(value: unknown): StatusColor {
  return value === "green" || value === "red" || value === "yellow"
    ? value
    : "yellow";
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

  const sessionId = asString(payload.sessionId);
  const movementId = asString(payload.movementId);
  const qualityInput = parseQualityInput(payload.quality);
  const expressionProxy = parseNumber(payload.expressionProxy);
  const holdProgressSec = parseNumber(payload.holdProgressSec) ?? 0;
  const previousPhase = parsePhase(payload.previousPhase);
  const previousStatus = parseStatus(payload.previousStatus);

  if (!sessionId || !movementId || !qualityInput || expressionProxy === null) {
    return badRequest(
      "sessionId, movementId, quality and expressionProxy are required.",
    );
  }

  const movement = getMovementById(movementId);
  if (!movement) {
    return NextResponse.json({ error: "Movement not found." }, { status: 404 });
  }

  const profile = getCalibrationProfile(auth.user.id);
  const baseline = profile?.baselineGeometry.neutralExpressionProxy ?? 1;
  const measuredValue = expressionProxy / Math.max(0.001, baseline);
  const quality = evaluateQuality(qualityInput);

  const evaluation = evaluateMovementFrame({
    movement,
    measuredValue,
    quality,
    previousPhase,
    previousStatus,
    holdProgressSec,
  });

  const ok = appendSessionEvaluation({ sessionId, userId: auth.user.id, evaluation });
  if (!ok) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json(evaluation);
}
