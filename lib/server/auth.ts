import { NextResponse } from "next/server";

interface AuthUser {
  id: string;
  email?: string;
}

function getAuthConfig():
  | {
      url: string;
      anonKey: string;
    }
  | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

function parseBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function resolveAuthenticatedUser(
  request: Request,
): Promise<AuthUser | null> {
  const config = getAuthConfig();
  const token = parseBearerToken(request);
  if (!config || !token) {
    return null;
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { id?: string; email?: string };
  if (!payload.id) {
    return null;
  }

  return {
    id: payload.id,
    email: payload.email,
  };
}

export async function requireAuthenticatedUser(request: Request): Promise<
  | {
      user: AuthUser;
      response?: undefined;
    }
  | {
      user?: undefined;
      response: NextResponse;
    }
> {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required. Please login first." },
        { status: 401 },
      ),
    };
  }
  return { user };
}
