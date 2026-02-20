import { NextResponse } from "next/server";

import { getSessions } from "@/lib/server/store";
import { fetchSessionHistory, isSupabaseConfigured } from "@/lib/server/supabase-rest";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query is required." }, { status: 400 });
  }

  let sessions = getSessions(userId);
  if (isSupabaseConfigured()) {
    try {
      sessions = await fetchSessionHistory(userId);
    } catch {
      // Keep local fallback if remote read fails.
    }
  }
  return NextResponse.json({ sessions });
}
