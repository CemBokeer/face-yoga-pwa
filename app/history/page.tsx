"use client";

import { useEffect, useState } from "react";

import type { SessionRecord } from "@/lib/domain/types";
import { getOrCreateUserId } from "@/lib/client-user";

interface MovementItem {
  movementId: string;
  sessions: number;
  averageAccuracy: number;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = getOrCreateUserId();
    Promise.all([
      fetch(`/api/history/sessions?userId=${encodeURIComponent(userId)}`).then((res) =>
        res.json(),
      ),
      fetch(`/api/history/movements?userId=${encodeURIComponent(userId)}`).then((res) =>
        res.json(),
      ),
    ])
      .then(([sessionPayload, movementPayload]) => {
        setSessions(sessionPayload.sessions ?? []);
        setMovements(movementPayload.movements ?? []);
      })
      .catch(() => setError("Gecmis verileri alinamadi."));
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Gecmis ve Ilerleme</h1>
        <p className="mt-2 text-slate-600">
          Hangi gun ne kadar calistiginizi ve ortalama form kalitesini takip edin.
        </p>
      </header>

      {error && <p className="rounded-lg bg-rose-100 p-3 text-sm text-rose-700">{error}</p>}

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Seanslar</h2>
        {sessions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Henuz seans kaydi yok.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2">Baslangic</th>
                  <th className="py-2">Sure (sn)</th>
                  <th className="py-2">Dogruluk</th>
                  <th className="py-2">Completion</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.sessionId} className="border-t border-slate-100">
                    <td className="py-2">{new Date(session.startedAt).toLocaleString()}</td>
                    <td className="py-2">{session.durationSec}</td>
                    <td className="py-2">{Math.round(session.averageAccuracy * 100)}%</td>
                    <td className="py-2">{Math.round(session.completionRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Hareket Ozeti</h2>
        {movements.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Hareket ozet verisi yok.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {movements.map((movement) => (
              <li key={movement.movementId} className="rounded-lg bg-slate-50 p-3">
                <p className="font-medium">{movement.movementId}</p>
                <p>
                  Seans: {movement.sessions} | Ortalama dogruluk:{" "}
                  {Math.round(movement.averageAccuracy * 100)}%
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
