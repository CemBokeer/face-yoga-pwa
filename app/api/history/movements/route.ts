import { NextResponse } from "next/server";

import { getMovementHistory } from "@/lib/server/store";
import { fetchMovementHistory, isSupabaseConfigured } from "@/lib/server/supabase-rest";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query is required." }, { status: 400 });
  }

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
