import { NextResponse } from "next/server";

import { MOVEMENTS } from "@/lib/domain/movements";
import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { startSession } from "@/lib/server/store";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth.response;
  }

  const payload = await readJson(request);
  if (!isRecord(payload)) {
    return badRequest("Invalid request body.");
  }

  const movementIds = Array.isArray(payload.movementIds)
    ? payload.movementIds.filter((id): id is string => typeof id === "string")
    : [MOVEMENTS[0].id];

  const result = startSession({ userId: auth.user.id, movementIds });
  return NextResponse.json(result);
}
