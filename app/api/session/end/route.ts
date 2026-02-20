import { NextResponse } from "next/server";

import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { asString } from "@/lib/server/parsers";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { endSession } from "@/lib/server/store";
import { isSupabaseConfigured, persistSessionMetrics } from "@/lib/server/supabase-rest";

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
  if (!sessionId) {
    return badRequest("sessionId is required.");
  }

  const result = endSession(sessionId, auth.user.id);
  if (!result) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (isSupabaseConfigured()) {
    try {
      await persistSessionMetrics(result);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Session closed locally but failed to persist in database.",
          details: error instanceof Error ? error.message : "Unknown persistence error.",
          metrics: result,
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(result);
}
