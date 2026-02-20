"use client";

const STORAGE_KEY = "face-yoga-user-id";

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") {
    return "local-dev-user";
  }
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const nextId = `user-${crypto.randomUUID()}`;
  window.localStorage.setItem(STORAGE_KEY, nextId);
  return nextId;
}
