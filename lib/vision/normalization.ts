import type { MovementFeatureVector, Point3D } from "../domain/types";

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function normalizeLandmarks(
  landmarks: Point3D[],
  faceWidth: number,
  faceHeight: number,
): Point3D[] {
  const width = faceWidth <= 0 ? 1 : faceWidth;
  const height = faceHeight <= 0 ? 1 : faceHeight;
  return landmarks.map((point) => ({
    x: point.x / width,
    y: point.y / height,
    z: point.z / Math.max(width, height),
  }));
}

export function computeSymmetryIndex(
  leftValues: number[],
  rightValues: number[],
): number {
  if (leftValues.length === 0 || rightValues.length === 0) {
    return 0.5;
  }
  const leftMean = mean(leftValues);
  const rightMean = mean(rightValues);
  const denom = Math.max(0.001, Math.abs(leftMean) + Math.abs(rightMean));
  const asymmetry = Math.abs(leftMean - rightMean) / denom;
  return Math.max(0, 1 - asymmetry);
}

export function summarizeExpression(values: number[]): {
  neutral: number;
  deviation: number;
} {
  return {
    neutral: mean(values),
    deviation: stdDev(values),
  };
}

function distance(a: Point3D, b: Point3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function point(points: Point3D[], index: number, fallback: Point3D): Point3D {
  return points[index] ?? fallback;
}

// Canonical indexes:
// 0 forehead, 1 left eye, 2 right eye, 3 nose tip, 4 chin,
// 5 mouth left, 6 mouth right, 7 upper lip, 8 lower lip,
// 9 left cheek, 10 right cheek.
export function extractMovementFeatureVector(points: Point3D[]): MovementFeatureVector {
  const p0 = point(points, 0, { x: 0, y: 0, z: 0 });
  const p1 = point(points, 1, { x: -0.25, y: -0.1, z: 0 });
  const p2 = point(points, 2, { x: 0.25, y: -0.1, z: 0 });
  const p3 = point(points, 3, { x: 0, y: 0.1, z: 0 });
  const p4 = point(points, 4, { x: 0, y: 0.5, z: 0 });
  const p5 = point(points, 5, { x: -0.2, y: 0.2, z: 0 });
  const p6 = point(points, 6, { x: 0.2, y: 0.2, z: 0 });
  const p7 = point(points, 7, { x: 0, y: 0.18, z: 0 });
  const p8 = point(points, 8, { x: 0, y: 0.24, z: 0 });
  const p9 = point(points, 9, { x: -0.3, y: 0.18, z: 0 });
  const p10 = point(points, 10, { x: 0.3, y: 0.18, z: 0 });

  const faceWidth = Math.max(0.0001, distance(p1, p2));
  const faceHeight = Math.max(0.0001, distance(p0, p4));
  const mouthWidth = distance(p5, p6) / faceWidth;
  const mouthOpen = distance(p7, p8) / faceHeight;
  const jawDrop = distance(p3, p4) / faceHeight;
  const cheekLiftLeft = clamp(1 - Math.abs(p5.y - p9.y) / 0.35);
  const cheekLiftRight = clamp(1 - Math.abs(p6.y - p10.y) / 0.35);
  const symmetryScore = clamp(1 - Math.abs(cheekLiftLeft - cheekLiftRight));

  return {
    smileRatio: clamp(mouthWidth),
    mouthOpenRatio: clamp(mouthOpen),
    jawDropRatio: clamp(jawDrop),
    cheekLiftRatio: clamp((cheekLiftLeft + cheekLiftRight) / 2),
    symmetryScore,
  };
}

export function averageFeatureVector(values: MovementFeatureVector[]): MovementFeatureVector {
  if (values.length === 0) {
    return {
      smileRatio: 0,
      mouthOpenRatio: 0,
      jawDropRatio: 0,
      cheekLiftRatio: 0,
      symmetryScore: 0.5,
    };
  }

  const aggregate = values.reduce(
    (acc, value) => ({
      smileRatio: acc.smileRatio + value.smileRatio,
      mouthOpenRatio: acc.mouthOpenRatio + value.mouthOpenRatio,
      jawDropRatio: acc.jawDropRatio + value.jawDropRatio,
      cheekLiftRatio: acc.cheekLiftRatio + value.cheekLiftRatio,
      symmetryScore: acc.symmetryScore + value.symmetryScore,
    }),
    {
      smileRatio: 0,
      mouthOpenRatio: 0,
      jawDropRatio: 0,
      cheekLiftRatio: 0,
      symmetryScore: 0,
    },
  );

  return {
    smileRatio: aggregate.smileRatio / values.length,
    mouthOpenRatio: aggregate.mouthOpenRatio / values.length,
    jawDropRatio: aggregate.jawDropRatio / values.length,
    cheekLiftRatio: aggregate.cheekLiftRatio / values.length,
    symmetryScore: aggregate.symmetryScore / values.length,
  };
}

export function featureRange(values: MovementFeatureVector[]): {
  smileRatio: number;
  mouthOpenRatio: number;
  jawDropRatio: number;
  cheekLiftRatio: number;
} {
  if (values.length < 2) {
    return {
      smileRatio: 0.05,
      mouthOpenRatio: 0.05,
      jawDropRatio: 0.05,
      cheekLiftRatio: 0.05,
    };
  }

  const range = <K extends keyof MovementFeatureVector>(key: K) => {
    const series = values.map((item) => item[key]);
    return Math.max(...series) - Math.min(...series);
  };

  return {
    smileRatio: Math.max(0.03, range("smileRatio")),
    mouthOpenRatio: Math.max(0.03, range("mouthOpenRatio")),
    jawDropRatio: Math.max(0.03, range("jawDropRatio")),
    cheekLiftRatio: Math.max(0.03, range("cheekLiftRatio")),
  };
}
