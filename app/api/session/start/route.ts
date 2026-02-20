import { NextResponse } from "next/server";

import { MOVEMENTS } from "@/lib/domain/movements";
import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { asString } from "@/lib/server/parsers";
import { startSession } from "@/lib/server/store";

export async function POST(request: Request) {
  const payload = await readJson(request);
  if (!isRecord(payload)) {
    return badRequest("Invalid request body.");
  }

  const userId = asString(payload.userId);
  if (!userId) {
    return badRequest("userId is required.");
  }

  const movementIds = Array.isArray(payload.movementIds)
    ? payload.movementIds.filter((id): id is string => typeof id === "string")
    : [MOVEMENTS[0].id];

  const result = startSession({ userId, movementIds });
  return NextResponse.json(result);
}
