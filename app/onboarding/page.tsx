"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { QualityCamera } from "@/components/camera/quality-camera";
import { getAccessToken } from "@/lib/auth/token";
import {
  calibrationFrameRequest,
  completeCalibrationRequest,
  startCalibrationRequest,
} from "@/lib/client-api";

export default function OnboardingPage() {
  const [status, setStatus] = useState("Kalibrasyona hazir.");
  const [calibrationId, setCalibrationId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [lastQuality, setLastQuality] = useState<number | null>(null);
  const [profileSummary, setProfileSummary] = useState<string | null>(null);
  const frameThrottleRef = useRef(0);

  const canComplete = useMemo(() => sampleCount >= 20 && !!calibrationId, [
    sampleCount,
    calibrationId,
  ]);
  const isAuthenticated = !!getAccessToken();

  const startCalibration = async () => {
    if (!isAuthenticated) {
      setStatus("Devam etmek icin once giris yapin.");
      return;
    }
    setProfileSummary(null);
    const response = await startCalibrationRequest({
      deviceProfile: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        videoWidth: 1280,
        videoHeight: 720,
      },
    });
    setCalibrationId(response.calibrationId);
    setIsRunning(true);
    setSampleCount(0);
    setAverageScore(null);
    setStatus(
      `Kalibrasyon basladi. Hedef sure: ${response.targetDurationSec} saniye.`,
    );
  };

  const finishCalibration = async () => {
    if (!calibrationId) {
      return;
    }
    try {
      const profile = await completeCalibrationRequest({ calibrationId });
      setIsRunning(false);
      setCalibrationId(null);
      setStatus("Kalibrasyon tamamlandi.");
      setProfileSummary(
        `Ortalama kalite ${Math.round(
          profile.qualityStats.averageScore * 100,
        )}/100, oneri sure ${profile.qualityStats.recommendedDurationSec} sn.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kalibrasyon hatasi.");
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Kalibrasyon</h1>
        <p className="text-slate-600">
          Kamera acikligina gore adaptif baseline olusturulur. Ham video saklanmaz.
        </p>
        {!isAuthenticated && (
          <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">
            Bu sayfa icin giris gerekiyor.{" "}
            <Link href="/auth" className="font-semibold underline">
              Giris yap
            </Link>
          </p>
        )}
      </header>

      <QualityCamera
        onFrame={(event) => {
          setLastQuality(event.qualityScore.overall);
          if (!isRunning || !calibrationId) {
            return;
          }
          const now = Date.now();
          if (now - frameThrottleRef.current < 700) {
            return;
          }
          frameThrottleRef.current = now;
          void calibrationFrameRequest({
            calibrationId,
            quality: event.qualityInput,
            expressionProxy: event.expressionProxy,
          })
            .then((result) => {
              setSampleCount((count) => count + 1);
              setAverageScore(result.averageScore);
              setStatus(`Kalibrasyon devam ediyor (${result.qualityLevel}).`);
            })
            .catch((error: unknown) => {
              setStatus(
                error instanceof Error ? error.message : "Kalibrasyon hatasi.",
              );
            });
        }}
      />

      <section className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-2">
        <p className="text-sm text-slate-600">Durum: {status}</p>
        <p className="text-sm text-slate-600">Ornek sayisi: {sampleCount}</p>
        <p className="text-sm text-slate-600">
          Anlik kalite: {lastQuality ? `${Math.round(lastQuality * 100)}/100` : "-"}
        </p>
        <p className="text-sm text-slate-600">
          Ortalama kalite:{" "}
          {averageScore !== null ? `${Math.round(averageScore * 100)}/100` : "-"}
        </p>
      </section>

      {profileSummary && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          {profileSummary}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void startCalibration()}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Kalibrasyonu Baslat
        </button>
        <button
          type="button"
          onClick={() => void finishCalibration()}
          disabled={!canComplete}
          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          Kalibrasyonu Tamamla
        </button>
      </div>
    </main>
  );
}
