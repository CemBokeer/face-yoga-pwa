import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/server/auth";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email ?? null,
    },
  });
}
