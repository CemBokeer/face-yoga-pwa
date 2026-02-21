import { NextResponse } from "next/server";

import { MOVEMENT_REFERENCE_PROFILES } from "@/lib/domain/reference";

export async function GET() {
  return NextResponse.json({ movements: MOVEMENT_REFERENCE_PROFILES });
}
