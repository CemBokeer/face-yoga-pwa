import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getMovementHistory } from "@/lib/server/store";
import { fetchMovementHistory, isSupabaseConfigured } from "@/lib/server/supabase-rest";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth.response;
  }

  const userId = auth.user.id;
  let movements = getMovementHistory(userId);
  if (isSupabaseConfigured()) {
    try {
      movements = await fetchMovementHistory(userId);
    } catch {
      // Keep local fallback if remote read fails.
    }
  }
  return NextResponse.json({ movements });
}
