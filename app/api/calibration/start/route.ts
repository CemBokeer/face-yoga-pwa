import { NextResponse } from "next/server";

import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { parseDeviceProfile, asString } from "@/lib/server/parsers";
import { startCalibration } from "@/lib/server/store";

export async function POST(request: Request) {
  const payload = await readJson(request);
  if (!isRecord(payload)) {
    return badRequest("Invalid request body.");
  }

  const userId = asString(payload.userId);
  const deviceProfile = parseDeviceProfile(payload.deviceProfile);
  if (!userId || !deviceProfile) {
    return badRequest("userId and deviceProfile are required.");
  }

  const result = startCalibration({ userId, deviceProfile });
  return NextResponse.json(result);
}
