import type {
  FrameEvaluation,
  MovementDefinition,
  QualityScore,
  SessionPhase,
  StatusColor,
} from "../domain/types";
import { nextSessionPhase } from "./state-machine.ts";

export interface EvaluateFrameInput {
  movement: MovementDefinition;
  measuredValue: number;
  quality: QualityScore;
  previousPhase: SessionPhase;
  previousStatus: StatusColor;
  holdProgressSec: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function valueAccuracy(
  value: number,
  targetMin: number,
  targetMax: number,
  previousStatus: StatusColor,
): number {
  const center = (targetMin + targetMax) / 2;
  const halfBand = Math.max((targetMax - targetMin) / 2, 0.001);
  const hysteresis = previousStatus === "green" ? 0.02 : 0;
  const delta = Math.abs(value - center);
  return clamp(1 - Math.max(0, delta - hysteresis) / halfBand);
}

export function evaluateMovementFrame(
  input: EvaluateFrameInput,
): FrameEvaluation {
  const tolerance =
    input.previousStatus === "green" || input.previousStatus === "yellow"
      ? 0.03
      : 0.015;
  const inTargetRange =
    input.measuredValue >= input.movement.targetMin - tolerance &&
    input.measuredValue <= input.movement.targetMax + tolerance;
  const accuracy = valueAccuracy(
    input.measuredValue,
    input.movement.targetMin,
    input.movement.targetMax,
    input.previousStatus,
  );
  const confidence = clamp(
    Math.max(
      input.quality.overall * 0.85 + input.quality.blurScore * 0.15,
      input.quality.overall * 0.75,
    ),
  );

  const phase = nextSessionPhase({
    previousPhase: input.previousPhase,
    inTargetRange,
    holdProgressSec: input.holdProgressSec / input.movement.holdSec,
  });

  const errors = [...input.quality.reasons];
  if (!inTargetRange) {
    errors.push("Hareket acisini hedefe yaklastirin.");
  }

  let statusColor: StatusColor = "green";
  if (input.previousPhase === "prepare" && !inTargetRange) {
    statusColor = "yellow";
  } else if (confidence < 0.28) {
    statusColor = "yellow";
    if (!errors.includes("Olcum guveni dusuk.")) {
      errors.push("Olcum guveni dusuk.");
    }
  } else if (!inTargetRange) {
    statusColor = accuracy < 0.4 ? "red" : "yellow";
  } else if (accuracy < 0.45) {
    statusColor = "red";
  } else if (accuracy < 0.65) {
    statusColor = "yellow";
  }

  const hasFormError = errors.some((item) => item.includes("Hareket acisini"));
  const hasLowConfidenceError = errors.includes("Olcum guveni dusuk.");

  const audioCue =
    statusColor === "green"
      ? "Harika, formu koru."
      : statusColor === "red"
        ? "Hafifce duzelt, referans videoyu takip et."
        : hasFormError
          ? "Iyi gidiyor, hareket acisini biraz daha ayarla."
          : hasLowConfidenceError
            ? "Hareketi yavas ve kontrollu surdur."
            : "Ritmi koru, formu nazikce hizala.";

  const visualCue =
    statusColor === "green"
      ? "Dogru form"
      : statusColor === "red"
        ? "Form duzeltme gerekli"
        : input.previousPhase === "prepare"
          ? "Hazirlik: referans pozisyona gelin"
          : hasFormError
            ? "Formu biraz daha hizalayin"
            : "Hareketi kontrollu surdur";

  return {
    movementId: input.movement.id,
    statusColor,
    accuracy,
    confidence,
    errorReasons: errors.slice(0, 3),
    audioCue,
    visualCue,
    phase,
  };
}
