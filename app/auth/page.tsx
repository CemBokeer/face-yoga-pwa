"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  loginRequest,
  meRequest,
  signupRequest,
} from "@/lib/client-api";
import { clearAccessToken, setAccessToken } from "@/lib/auth/token";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const buttonLabel = useMemo(
    () => (mode === "login" ? "Giris Yap" : "Kayit Ol"),
    [mode],
  );

  const submit = async () => {
    setWorking(true);
    setMessage(null);
    try {
      const payload =
        mode === "login"
          ? await loginRequest({ email, password })
          : await signupRequest({ email, password });

      if (!payload.accessToken) {
        setMessage(
          "Kayit olustu. Email dogrulamasi aciksa gelen maili onaylayip giris yapin.",
        );
        return;
      }

      setAccessToken(payload.accessToken);
      const me = await meRequest();
      setMessage(`Giris basarili: ${me.user.email ?? me.user.id}`);
      router.push("/onboarding");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Auth islemi basarisiz.");
    } finally {
      setWorking(false);
    }
  };

  const logout = () => {
    clearAccessToken();
    setMessage("Cikis yapildi.");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Hesap</h1>
        <p className="text-slate-600">
          Supabase Auth ile email ve sifre kullanarak giris yapin.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-1 ${
              mode === "login" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Giris
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-1 ${
              mode === "signup" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Kayit
          </button>
        </div>

        <label className="block text-sm text-slate-700">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="block text-sm text-slate-700">
          Sifre
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={working || !email || !password}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-emerald-300"
          >
            {working ? "Isleniyor..." : buttonLabel}
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Cikis
          </button>
        </div>
      </section>

      {message && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}

      <p className="text-sm text-slate-600">
        Kalibrasyon icin <Link href="/onboarding" className="underline">/onboarding</Link>,
        seans icin <Link href="/session" className="underline"> /session</Link> sayfasina gidebilirsiniz.
      </p>
    </main>
  );
}
