import type { QualityInput, QualityScore } from "../domain/types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function targetBandScore(value: number, min: number, max: number): number {
  if (value >= min && value <= max) {
    return 1;
  }

  const distance = value < min ? min - value : value - max;
  return clamp(1 - distance / Math.max(0.01, max - min));
}

export function evaluateQuality(input: QualityInput): QualityScore {
  const brightnessScore = targetBandScore(input.brightness, 0.35, 0.75);
  const blurScore = clamp(input.blur);
  const coverageScore = targetBandScore(input.faceCoverage, 0.16, 0.4);
  const yawScore = clamp(1 - Math.abs(input.headYawDeg) / 35);
  const occlusionScore = clamp(1 - input.occlusion);
  const fpsScore = clamp((input.fps - 8) / 16);

  const overall =
    brightnessScore * 0.18 +
    blurScore * 0.18 +
    coverageScore * 0.24 +
    yawScore * 0.18 +
    occlusionScore * 0.12 +
    fpsScore * 0.1;

  const reasons: string[] = [];
  if (brightnessScore < 0.55) {
    reasons.push("Isigi duzeltin.");
  }
  if (blurScore < 0.55) {
    reasons.push("Kamerayi sabitleyin.");
  }
  if (coverageScore < 0.55) {
    reasons.push("Yuze biraz daha yaklasin.");
  }
  if (yawScore < 0.55) {
    reasons.push("Yuzunuz kameraya daha duz dursun.");
  }
  if (occlusionScore < 0.55) {
    reasons.push("Yuzunuzun onunu acin.");
  }
  if (fpsScore < 0.4) {
    reasons.push("Cihaz performansi dusuk, arka plani kapatin.");
  }

  let level: QualityScore["level"] = "good";
  if (overall < 0.45) {
    level = "poor";
  } else if (overall < 0.72) {
    level = "fair";
  }

  return {
    overall: clamp(overall),
    brightnessScore,
    blurScore,
    coverageScore,
    yawScore,
    occlusionScore,
    fpsScore,
    level,
    reasons,
  };
}

export function recommendedCalibrationSeconds(
  qualityLevel: QualityScore["level"],
): number {
  switch (qualityLevel) {
    case "good":
      return 90;
    case "fair":
      return 120;
    default:
      return 180;
  }
}
