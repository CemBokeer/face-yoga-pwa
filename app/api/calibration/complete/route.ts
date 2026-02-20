import { NextResponse } from "next/server";

import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { asString } from "@/lib/server/parsers";
import { completeCalibration } from "@/lib/server/store";
import { isSupabaseConfigured, persistCalibrationProfile } from "@/lib/server/supabase-rest";

export async function POST(request: Request) {
  const payload = await readJson(request);
  if (!isRecord(payload)) {
    return badRequest("Invalid request body.");
  }

  const calibrationId = asString(payload.calibrationId);
  if (!calibrationId) {
    return badRequest("calibrationId is required.");
  }

  const profile = completeCalibration(calibrationId);
  if (!profile) {
    return NextResponse.json({ error: "Calibration not found." }, { status: 404 });
  }

  if (isSupabaseConfigured()) {
    try {
      await persistCalibrationProfile(profile);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Calibration saved locally but failed to persist in database.",
          details: error instanceof Error ? error.message : "Unknown persistence error.",
          profile,
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(profile);
}
