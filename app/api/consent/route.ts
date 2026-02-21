import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/server/auth";
import { badRequest, isRecord, readJson } from "@/lib/server/http";
import { asString } from "@/lib/server/parsers";
import { getUserConsent, updateUserConsent } from "@/lib/server/store";
import {
  fetchUserConsent,
  isSupabaseConfigured,
  persistUserConsent,
} from "@/lib/server/supabase-rest";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth.response;
  }

  let consent = getUserConsent(auth.user.id);
  if (isSupabaseConfigured()) {
    try {
      const remote = await fetchUserConsent(auth.user.id);
      if (remote) {
        consent = updateUserConsent({
          userId: auth.user.id,
          telemetryOptIn: remote.telemetryOptIn,
          consentVersion: remote.consentVersion,
          locale: "tr-TR",
        });
      }
    } catch {
      // fallback to in-memory consent state
    }
  }

  return NextResponse.json({
    telemetryOptIn: consent.telemetryOptIn,
    consentVersion: consent.consentVersion,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth.response;
  }

  const payload = await readJson(request);
  if (!isRecord(payload)) {
    return badRequest("Invalid request body.");
  }

  const telemetryOptIn = typeof payload.telemetryOptIn === "boolean" ? payload.telemetryOptIn : null;
  const consentVersion = asString(payload.consentVersion) ?? "v1";
  const locale = asString(payload.locale) ?? "tr-TR";
  if (telemetryOptIn === null) {
    return badRequest("telemetryOptIn must be boolean.");
  }

  const consent = updateUserConsent({
    userId: auth.user.id,
    telemetryOptIn,
    consentVersion,
    locale,
  });

  if (isSupabaseConfigured()) {
    try {
      await persistUserConsent({
        userId: auth.user.id,
        telemetryOptIn,
        consentVersion,
        locale,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: "Consent updated locally but failed to persist in database.",
          details: error instanceof Error ? error.message : "Unknown persistence error.",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    telemetryOptIn: consent.telemetryOptIn,
    consentVersion: consent.consentVersion,
  });
}
