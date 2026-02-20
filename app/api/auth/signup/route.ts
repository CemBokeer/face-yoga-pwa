import { NextResponse } from "next/server";

import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { asString } from "@/lib/server/parsers";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

export async function POST(request: Request) {
  const cfg = config();
  if (!cfg) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const payload = await readJson(request);
  if (!isRecord(payload)) {
    return badRequest("Invalid request body.");
  }

  const email = asString(payload.email);
  const password = asString(payload.password);
  if (!email || !password) {
    return badRequest("email and password are required.");
  }

  const response = await fetch(`${cfg.url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.anonKey,
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const body = await response.json();
  if (!response.ok) {
    return NextResponse.json(
      { error: body.msg ?? body.error_description ?? "Signup failed." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    accessToken: body.access_token ?? null,
    refreshToken: body.refresh_token ?? null,
    user: body.user ? { id: body.user.id, email: body.user.email } : null,
    requiresEmailConfirmation: !body.access_token,
  });
}
