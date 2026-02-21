import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getFairnessBuckets } from "@/lib/server/store";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth.response;
  }
  return NextResponse.json({ buckets: getFairnessBuckets(auth.user.id) });
}
