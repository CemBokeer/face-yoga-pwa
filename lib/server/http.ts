import { NextResponse } from "next/server";

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
