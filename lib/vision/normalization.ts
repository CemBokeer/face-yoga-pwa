import type { Point3D } from "../domain/types";

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
