"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { buildQualityInput, distanceBucket, expressionProxy } from "@/lib/camera/frame-analysis";
import type { Point3D, QualityInput, QualityScore } from "@/lib/domain/types";
import { detectFaceSignal, isFaceDetectionSupported } from "@/lib/vision/browser-face";
import { evaluateQuality } from "@/lib/vision/quality";

interface CameraFrameEvent {
  qualityInput: QualityInput;
  qualityScore: QualityScore;
  expressionProxy: number;
  hasFace: boolean;
  landmarks: Point3D[];
  landmarkModelVersion: string;
  distanceBucket: "near" | "mid" | "far";
  videoWidth: number;
  videoHeight: number;
}

interface QualityCameraProps {
  onFrame?: (event: CameraFrameEvent) => void;
}

export function QualityCamera({ onFrame }: QualityCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onFrameRef = useRef<typeof onFrame>(onFrame);
  const smoothedScoreRef = useRef<QualityScore | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  function smoothQuality(next: QualityScore): QualityScore {
    const prev = smoothedScoreRef.current;
    if (!prev) {
      smoothedScoreRef.current = next;
      return next;
    }

    const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;
    const t = 0.35;
    const overall = lerp(prev.overall, next.overall, t);
    const blurScore = lerp(prev.blurScore, next.blurScore, t);
    const brightnessScore = lerp(prev.brightnessScore, next.brightnessScore, t);
    const coverageScore = lerp(prev.coverageScore, next.coverageScore, t);
    const yawScore = lerp(prev.yawScore, next.yawScore, t);
    const occlusionScore = lerp(prev.occlusionScore, next.occlusionScore, t);
    const fpsScore = lerp(prev.fpsScore, next.fpsScore, t);
    const level =
      overall < 0.38 ? "poor" : overall < 0.66 ? "fair" : "good";

    const smoothed: QualityScore = {
      overall,
      blurScore,
      brightnessScore,
      coverageScore,
      yawScore,
      occlusionScore,
      fpsScore,
      level,
      reasons: next.reasons,
    };
    smoothedScoreRef.current = smoothed;
    return smoothed;
  }

  useEffect(() => {
    let mounted = true;
    let frameTimer: ReturnType<typeof setInterval> | null = null;
    let lastTick = performance.now();
    let analyzing = false;
    const faceDetectionSupported = isFaceDetectionSupported();

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          return;
        }
        video.srcObject = stream;
        await video.play();
        setReady(true);

        frameTimer = setInterval(async () => {
          if (analyzing || !videoRef.current || !canvasRef.current) {
            return;
          }
          analyzing = true;

          try {
            const videoEl = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!videoEl || !ctx || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
              return;
            }

            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const face = await detectFaceSignal(videoEl);
            const now = performance.now();
            const fps = Math.min(30, 1000 / Math.max(8, now - lastTick));
            lastTick = now;
            const qualityInput = buildQualityInput({
              imageData,
              faceBox: face.box,
              faceDetectionSupported,
              fps,
            });
            const currentScore = smoothQuality(evaluateQuality(qualityInput));
            setQualityScore(currentScore);
            const proximity = distanceBucket(qualityInput.faceCoverage);

            onFrameRef.current?.({
              qualityInput,
              qualityScore: currentScore,
              expressionProxy: expressionProxy(face.box, face.landmarks),
              hasFace: !!face.box,
              landmarks: face.landmarks,
              landmarkModelVersion: face.modelVersion,
              distanceBucket: proximity,
              videoWidth: videoEl.videoWidth,
              videoHeight: videoEl.videoHeight,
            });
          } finally {
            analyzing = false;
          }
        }, 350);
      } catch {
        setCameraError("Kamera acilamadi. Tarayici iznini kontrol edin.");
      }
    };

    void start();

    return () => {
      mounted = false;
      if (frameTimer) {
        clearInterval(frameTimer);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const borderClass = useMemo(() => {
    if (!qualityScore) {
      return "border-slate-400";
    }
    if (qualityScore.level === "good") {
      return "border-emerald-500";
    }
    if (qualityScore.level === "fair") {
      return "border-amber-500";
    }
    return "border-rose-500";
  }, [qualityScore]);

  return (
    <section className="space-y-3">
      <div className={`relative overflow-hidden rounded-2xl border-4 ${borderClass}`}>
        <video
          ref={videoRef}
          className="h-[360px] w-full bg-black object-cover md:h-[480px]"
          autoPlay
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      {cameraError && (
        <p className="rounded-md bg-rose-100 p-2 text-sm text-rose-700">{cameraError}</p>
      )}
      {!cameraError && !ready && (
        <p className="rounded-md bg-slate-100 p-2 text-sm text-slate-700">
          Kamera baglantisi kuruluyor...
        </p>
      )}
      {qualityScore && (
        <div className="rounded-md bg-slate-100 p-3 text-sm text-slate-700">
          <p>
            Kalite skoru: <strong>{Math.round(qualityScore.overall * 100)}</strong> / 100
          </p>
          {qualityScore.reasons.length > 0 && (
            <p className="mt-1">Oneri: {qualityScore.reasons[0]}</p>
          )}
        </div>
      )}
    </section>
  );
}
