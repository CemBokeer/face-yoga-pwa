import type { FaceBox } from "@/lib/camera/frame-analysis";
import type { Point3D } from "@/lib/domain/types";

interface FaceDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceDetectionResult {
  boundingBox: FaceDetectionBox;
  landmarks?: Array<{
    type?: string;
    locations?: Array<{ x: number; y: number }>;
  }>;
}

type LandmarkEntry = NonNullable<FaceDetectionResult["landmarks"]>[number];

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

export interface FaceSignal {
  box: FaceBox | null;
  landmarks: Point3D[];
  modelVersion: string;
}

function hasLocations(
  entry: LandmarkEntry | undefined,
): boolean {
  return !!entry && Array.isArray(entry.locations) && entry.locations.length > 0;
}

function centroid(locations: Array<{ x: number; y: number }>): Point3D {
  const sum = locations.reduce(
    (acc, item) => ({
      x: acc.x + item.x,
      y: acc.y + item.y,
    }),
    { x: 0, y: 0 },
  );
  return {
    x: sum.x / locations.length,
    y: sum.y / locations.length,
    z: 0,
  };
}

function fallbackLandmarks(box: FaceDetectionBox): Point3D[] {
  const cx = box.x + box.width / 2;
  return [
    { x: cx, y: box.y + box.height * 0.08, z: 0 },
    { x: box.x + box.width * 0.32, y: box.y + box.height * 0.32, z: 0 },
    { x: box.x + box.width * 0.68, y: box.y + box.height * 0.32, z: 0 },
    { x: cx, y: box.y + box.height * 0.48, z: 0 },
    { x: cx, y: box.y + box.height * 0.92, z: 0 },
    { x: box.x + box.width * 0.35, y: box.y + box.height * 0.7, z: 0 },
    { x: box.x + box.width * 0.65, y: box.y + box.height * 0.7, z: 0 },
    { x: cx, y: box.y + box.height * 0.68, z: 0 },
    { x: cx, y: box.y + box.height * 0.76, z: 0 },
    { x: box.x + box.width * 0.2, y: box.y + box.height * 0.6, z: 0 },
    { x: box.x + box.width * 0.8, y: box.y + box.height * 0.6, z: 0 },
  ];
}

function findType(
  landmarks: FaceDetectionResult["landmarks"],
  matcher: (type: string) => boolean,
): Point3D | null {
  if (!landmarks) {
    return null;
  }
  for (const landmark of landmarks) {
    const type = landmark.type ?? "";
    if (!matcher(type) || !hasLocations(landmark)) {
      continue;
    }
    return centroid(landmark.locations!);
  }
  return null;
}

function canonicalizeLandmarks(result: FaceDetectionResult): Point3D[] {
  const box = result.boundingBox;
  const fallback = fallbackLandmarks(box);

  if (!Array.isArray(result.landmarks) || result.landmarks.length === 0) {
    return fallback;
  }

  const leftEye = findType(result.landmarks, (type) => type.includes("left") && type.includes("eye"));
  const rightEye = findType(result.landmarks, (type) => type.includes("right") && type.includes("eye"));
  const nose = findType(result.landmarks, (type) => type.includes("nose"));
  const mouth = findType(result.landmarks, (type) => type.includes("mouth"));
  const mouthEntry = result.landmarks.find((item) => (item.type ?? "").includes("mouth"));

  if (!mouthEntry || !hasLocations(mouthEntry)) {
    return [
      fallback[0],
      leftEye ?? fallback[1],
      rightEye ?? fallback[2],
      nose ?? fallback[3],
      fallback[4],
      fallback[5],
      fallback[6],
      mouth ?? fallback[7],
      fallback[8],
      fallback[9],
      fallback[10],
    ];
  }

  const locations = mouthEntry.locations!;
  let leftMost = locations[0];
  let rightMost = locations[0];
  let topMost = locations[0];
  let bottomMost = locations[0];

  for (const point of locations) {
    if (point.x < leftMost.x) {
      leftMost = point;
    }
    if (point.x > rightMost.x) {
      rightMost = point;
    }
    if (point.y < topMost.y) {
      topMost = point;
    }
    if (point.y > bottomMost.y) {
      bottomMost = point;
    }
  }

  return [
    fallback[0],
    leftEye ?? fallback[1],
    rightEye ?? fallback[2],
    nose ?? fallback[3],
    fallback[4],
    { x: leftMost.x, y: leftMost.y, z: 0 },
    { x: rightMost.x, y: rightMost.y, z: 0 },
    { x: topMost.x, y: topMost.y, z: 0 },
    { x: bottomMost.x, y: bottomMost.y, z: 0 },
    fallback[9],
    fallback[10],
  ];
}

export function isFaceDetectionSupported(): boolean {
  if (detectorCache === undefined) {
    detectorCache = getDetector();
  }
  return !!detectorCache;
}

export async function detectFace(video: HTMLVideoElement): Promise<FaceBox | null> {
  const signal = await detectFaceSignal(video);
  return signal.box;
}

export async function detectFaceSignal(video: HTMLVideoElement): Promise<FaceSignal> {
  if (detectorCache === undefined) {
    detectorCache = getDetector();
  }
  if (!detectorCache) {
    return {
      box: null,
      landmarks: [],
      modelVersion: "shape-detection-unsupported",
    };
  }

  const detections = await detectorCache.detect(video);
  if (!detections.length) {
    return {
      box: null,
      landmarks: [],
      modelVersion: "shape-detection-v1",
    };
  }

  const first = detections[0];
  const box = first.boundingBox;
  return {
    box: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    },
    landmarks: canonicalizeLandmarks(first),
    modelVersion: first.landmarks?.length ? "shape-detection-v1" : "box-fallback-v1",
  };
}
