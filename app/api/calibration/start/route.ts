import { NextResponse } from "next/server";

import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { parseDeviceProfile } from "@/lib/server/parsers";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { startCalibration } from "@/lib/server/store";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth.response;
  }

  const payload = await readJson(request);
  if (!isRecord(payload)) {
    return badRequest("Invalid request body.");
  }

  const deviceProfile = parseDeviceProfile(payload.deviceProfile);
  if (!deviceProfile) {
    return badRequest("deviceProfile is required.");
  }

  const result = startCalibration({ userId: auth.user.id, deviceProfile });
  return NextResponse.json(result);
}
