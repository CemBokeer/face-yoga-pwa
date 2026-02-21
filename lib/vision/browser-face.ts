import type { FaceBox } from "@/lib/camera/frame-analysis";

interface FaceDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceDetectionResult {
  boundingBox: FaceDetectionBox;
}

interface FaceDetectorLike {
  detect(source: HTMLVideoElement): Promise<FaceDetectionResult[]>;
}

interface FaceDetectorConstructor {
  new (options: { fastMode?: boolean; maxDetectedFaces?: number }): FaceDetectorLike;
}

function getDetector(): FaceDetectorLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  const maybeFaceDetector = (window as Window & {
    FaceDetector?: FaceDetectorConstructor;
  }).FaceDetector;

  if (!maybeFaceDetector) {
    return null;
  }

  try {
    return new maybeFaceDetector({ fastMode: true, maxDetectedFaces: 1 });
  } catch {
    return null;
  }
}

let detectorCache: FaceDetectorLike | null | undefined;

export function isFaceDetectionSupported(): boolean {
  if (detectorCache === undefined) {
    detectorCache = getDetector();
  }
  return !!detectorCache;
}

export async function detectFace(video: HTMLVideoElement): Promise<FaceBox | null> {
  if (detectorCache === undefined) {
    detectorCache = getDetector();
  }
  if (!detectorCache) {
    return null;
  }

  const detections = await detectorCache.detect(video);
  if (!detections.length) {
    return null;
  }

  const box = detections[0].boundingBox;
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  };
}
