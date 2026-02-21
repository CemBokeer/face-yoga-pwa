import { NextResponse } from "next/server";

import { badRequest, isRecord, readJson } from "@/lib/server/http";
import {
  asString,
  parseDistanceBucket,
  parseLandmarks,
  parseNumber,
  parseQualityInput,
} from "@/lib/server/parsers";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { evaluateQuality } from "@/lib/vision/quality";
import { addCalibrationFrame } from "@/lib/server/store";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth.response;
  }

  const payload = await readJson(request);
  if (!isRecord(payload)) {
    return badRequest("Invalid request body.");
  }

  const calibrationId = asString(payload.calibrationId);
  const expressionProxy = parseNumber(payload.expressionProxy);
  const quality = parseQualityInput(payload.quality);
  const landmarks = parseLandmarks(payload.landmarks) ?? undefined;
  const landmarkModelVersion = asString(payload.landmarkModelVersion) ?? undefined;
  const distanceBucket = parseDistanceBucket(payload.distanceBucket) ?? undefined;
  if (!calibrationId || expressionProxy === null || !quality) {
    return badRequest("calibrationId, expressionProxy and quality are required.");
  }
  const breakdown = evaluateQuality(quality);

  const result = addCalibrationFrame({
    calibrationId,
    userId: auth.user.id,
    frame: {
      timestamp: Date.now(),
      expressionProxy,
      quality,
      landmarks,
      landmarkModelVersion,
      distanceBucket,
      qualityBreakdown: {
        brightnessScore: breakdown.brightnessScore,
        blurScore: breakdown.blurScore,
        coverageScore: breakdown.coverageScore,
        yawScore: breakdown.yawScore,
        occlusionScore: breakdown.occlusionScore,
        fpsScore: breakdown.fpsScore,
        overall: breakdown.overall,
      },
    },
  });
  if (!result) {
    return NextResponse.json({ error: "Calibration not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
