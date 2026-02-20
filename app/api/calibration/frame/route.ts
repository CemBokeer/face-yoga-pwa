import { NextResponse } from "next/server";

import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { asString, parseNumber, parseQualityInput } from "@/lib/server/parsers";
import { addCalibrationFrame } from "@/lib/server/store";

export async function POST(request: Request) {
  const payload = await readJson(request);
  if (!isRecord(payload)) {
    return badRequest("Invalid request body.");
  }

  const calibrationId = asString(payload.calibrationId);
  const expressionProxy = parseNumber(payload.expressionProxy);
  const quality = parseQualityInput(payload.quality);
  if (!calibrationId || expressionProxy === null || !quality) {
    return badRequest("calibrationId, expressionProxy and quality are required.");
  }

  const result = addCalibrationFrame({
    calibrationId,
    frame: {
      timestamp: Date.now(),
      expressionProxy,
      quality,
    },
  });
  if (!result) {
    return NextResponse.json({ error: "Calibration not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
