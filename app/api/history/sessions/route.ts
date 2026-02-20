import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getSessions } from "@/lib/server/store";
import { fetchSessionHistory, isSupabaseConfigured } from "@/lib/server/supabase-rest";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth.response;
  }

  const userId = auth.user.id;
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
