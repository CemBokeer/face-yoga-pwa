"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { QualityCamera } from "@/components/camera/quality-camera";
import { useAuthState } from "@/lib/auth/use-auth-state";
import { MOVEMENTS } from "@/lib/domain/movements";
import type { SessionPhase, StatusColor } from "@/lib/domain/types";
import {
  consentStateRequest,
  endSessionRequest,
  frameEvalRequest,
  referenceMovementsRequest,
  startSessionRequest,
  telemetryFrameRequest,
} from "@/lib/client-api";
import { speakFeedback } from "@/lib/session/audio";

const movement = MOVEMENTS[0];

export default function SessionPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [statusColor, setStatusColor] = useState<StatusColor>("yellow");
  const [statusMessage, setStatusMessage] = useState("Seans baslatilmadi.");
  const [accuracy, setAccuracy] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [phase, setPhase] = useState<SessionPhase>("prepare");
  const [summary, setSummary] = useState<string | null>(null);
  const [telemetryOptIn, setTelemetryOptIn] = useState(false);
  const [referenceVideo, setReferenceVideo] = useState(
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  );
  const [referenceGuidance, setReferenceGuidance] = useState<string[]>([]);
  const telemetryThrottleRef = useRef(0);
  const pseudoSessionKeyRef = useRef(crypto.randomUUID());
  const frameThrottleRef = useRef(0);
  const holdProgressRef = useRef(0);
  const speechThrottleRef = useRef(0);
  const { isHydrated, isAuthenticated } = useAuthState();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    void referenceMovementsRequest()
      .then((payload) => {
        const profile = payload.movements.find((item) => item.movementId === movement.id);
        if (!profile) {
          return;
        }
        setReferenceVideo(profile.videoUrl);
        setReferenceGuidance(profile.guidance);
      })
      .catch(() => undefined);
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      return;
    }
    void consentStateRequest()
      .then((payload) => setTelemetryOptIn(payload.telemetryOptIn))
      .catch(() => undefined);
  }, [isAuthenticated, isHydrated]);

  const statusColorClass = useMemo(() => {
    if (statusColor === "green") {
      return "bg-emerald-500";
    }
    if (statusColor === "red") {
      return "bg-rose-500";
    }
    return "bg-amber-500";
  }, [statusColor]);

  const startSession = async () => {
    if (!isHydrated || !isAuthenticated) {
      setStatusMessage("Devam etmek icin once giris yapin.");
      return;
    }
    const response = await startSessionRequest({
      movementIds: [movement.id],
    });
    setSessionId(response.sessionId);
    setSummary(null);
    setStatusMessage("Seans aktif. Referans videoyu takip ederek baslayin.");
    setPhase("prepare");
    setStatusColor("yellow");
    holdProgressRef.current = 0;
  };

  const endSession = async () => {
    if (!sessionId) {
      return;
    }
    try {
      const metrics = await endSessionRequest({ sessionId });
      setSummary(
        `Sure ${metrics.durationSec}s, completion ${Math.round(
          metrics.completionRate * 100,
        )}%, consistency ${Math.round(metrics.consistency * 100)}%.`,
      );
      setSessionId(null);
      setStatusMessage("Seans tamamlandi.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Seans bitirme hatasi.");
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Canli Seans</h1>
        <p className="text-slate-600">
          Dogruysa yesil, duzeltme gerekiyorsa kirmizi; guven dusukse sari gosterilir.
        </p>
        {isHydrated && !isAuthenticated && (
          <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">
            Bu sayfa icin giris gerekiyor.{" "}
            <Link href="/auth" className="font-semibold underline">
              Giris yap
            </Link>
          </p>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className={`rounded-xl p-4 text-white ${statusColorClass}`}>
            <p className="text-sm font-medium uppercase tracking-wide">Anlik Durum</p>
            <p className="mt-2 text-2xl font-bold">{statusMessage}</p>
            <p className="mt-1 text-sm">
              Dogruluk: {Math.round(accuracy * 100)} | Guven:{" "}
              {Math.round(confidence * 100)} | Faz: {phase}
            </p>
          </div>

          <QualityCamera
            onFrame={(event) => {
              if (!sessionId) {
                return;
              }
              const now = Date.now();
              if (now - frameThrottleRef.current < 700) {
                return;
              }
              frameThrottleRef.current = now;

              if (statusColor === "green") {
                holdProgressRef.current += 0.7;
              } else {
                holdProgressRef.current = 0;
              }

              void frameEvalRequest({
                sessionId,
                movementId: movement.id,
                quality: event.qualityInput,
                expressionProxy: event.expressionProxy,
                landmarks: event.landmarks,
                landmarkModelVersion: event.landmarkModelVersion,
                frameTimestampMs: Date.now(),
                deviceOrientation:
                  window.innerHeight >= window.innerWidth ? "portrait" : "landscape",
                calibrationVersion: "v2",
                holdProgressSec: holdProgressRef.current,
                previousPhase: phase,
                previousStatus: statusColor,
              })
                .then((evaluation) => {
                  setStatusColor(evaluation.statusColor);
                  setStatusMessage(evaluation.visualCue);
                  setAccuracy(evaluation.accuracy);
                  setConfidence(evaluation.confidence);
                  setPhase(evaluation.phase);
                  if (Date.now() - speechThrottleRef.current > 2500) {
                    speakFeedback(evaluation.audioCue);
                    speechThrottleRef.current = Date.now();
                  }

                  if (telemetryOptIn && Date.now() - telemetryThrottleRef.current > 1400) {
                    telemetryThrottleRef.current = Date.now();
                    void telemetryFrameRequest({
                      pseudoSessionKey: pseudoSessionKeyRef.current,
                      movementId: movement.id,
                      modelVersion: evaluation.debug?.modelVersion ?? event.landmarkModelVersion,
                      deviceOrientation:
                        window.innerHeight >= window.innerWidth ? "portrait" : "landscape",
                      qualityOverall: event.qualityScore.overall,
                      accuracy: evaluation.accuracy,
                      confidence: evaluation.confidence,
                      statusColor: evaluation.statusColor,
                      distanceBucket: event.distanceBucket,
                      latencyMs: 0,
                      notes: evaluation.errorReasons,
                    }).catch(() => undefined);
                  }
                })
                .catch((error: unknown) => {
                  setStatusMessage(
                    error instanceof Error ? error.message : "Frame degerlendirme hatasi.",
                  );
                });
            }}
          />
        </div>

        <aside className="relative overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <p className="mb-2 text-sm font-semibold text-slate-700">Referans Hareket</p>
          <video
            src={referenceVideo}
            autoPlay
            muted
            loop
            playsInline
            className="h-[240px] w-full rounded-xl bg-black object-cover"
          />
          {referenceGuidance.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {referenceGuidance.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Referans kaynak yuklenemedi, varsayilan video gosteriliyor.
            </p>
          )}
        </aside>
      </div>

      {summary && <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">{summary}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void startSession()}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Seansi Baslat
        </button>
        <button
          type="button"
          onClick={() => void endSession()}
          disabled={!sessionId}
          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          Seansi Bitir
        </button>
      </div>
    </main>
  );
}
