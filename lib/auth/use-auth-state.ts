"use client";

import { useEffect, useState } from "react";

import { getAccessToken, isAccessTokenExpired } from "@/lib/auth/token";

export function useAuthState(): {
  isHydrated: boolean;
  isAuthenticated: boolean;
} {
  const [state, setState] = useState({
    isHydrated: false,
    isAuthenticated: false,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = getAccessToken();
      const valid = !!token && !isAccessTokenExpired();
      setState({
        isHydrated: true,
        isAuthenticated: valid,
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return state;
}
