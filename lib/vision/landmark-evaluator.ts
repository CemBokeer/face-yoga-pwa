import type { Point3D } from "@/lib/domain/types";

export interface LandmarkFrame {
  timestamp: number;
  points: Point3D[];
}

export interface LandmarkMovementRule {
  id: string;
  name: string;
  anchorIndexes: [number, number];
  targetIndexes: [number, number];
  ratioMin: number;
  ratioMax: number;
}

export interface LandmarkEvaluation {
  score: number;
  inRange: boolean;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function distance(a: Point3D, b: Point3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function ratioFromRule(points: Point3D[], rule: LandmarkMovementRule): number | null {
  const a0 = points[rule.anchorIndexes[0]];
  const a1 = points[rule.anchorIndexes[1]];
  const t0 = points[rule.targetIndexes[0]];
  const t1 = points[rule.targetIndexes[1]];
  if (!a0 || !a1 || !t0 || !t1) {
    return null;
  }
  const anchorLength = distance(a0, a1);
  const targetLength = distance(t0, t1);
  if (anchorLength < 0.00001) {
    return null;
  }
  return targetLength / anchorLength;
}

export function evaluateLandmarkRule(
  frame: LandmarkFrame,
  rule: LandmarkMovementRule,
): LandmarkEvaluation {
  const ratio = ratioFromRule(frame.points, rule);
  if (ratio === null) {
    return {
      score: 0,
      inRange: false,
    };
  }

  if (ratio >= rule.ratioMin && ratio <= rule.ratioMax) {
    return {
      score: 1,
      inRange: true,
    };
  }

  const center = (rule.ratioMin + rule.ratioMax) / 2;
  const halfBand = Math.max((rule.ratioMax - rule.ratioMin) / 2, 0.0001);
  const score = clamp(1 - Math.abs(ratio - center) / halfBand);
  return {
    score,
    inRange: false,
  };
}
