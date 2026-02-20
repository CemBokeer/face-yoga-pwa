"use client";

const ACCESS_TOKEN_KEY = "face-yoga-access-token";

interface JwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getUserIdFromAccessToken(): string | null {
  const token = getAccessToken();
  if (!token) {
    return null;
  }
  const payload = decodeJwtPayload(token);
  if (!payload?.sub) {
    return null;
  }
  return payload.sub;
}

export function isAccessTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) {
    return true;
  }
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= payload.exp;
}
