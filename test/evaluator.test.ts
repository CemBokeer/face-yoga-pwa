import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMovementFrame } from "../lib/session/evaluator.ts";
import { MOVEMENTS } from "../lib/domain/movements.ts";
import { evaluateQuality } from "../lib/vision/quality.ts";

const movement = MOVEMENTS[0];

test("evaluator returns green when value in range and quality high", () => {
  const quality = evaluateQuality({
    brightness: 0.6,
    blur: 0.8,
    faceCoverage: 0.24,
    headYawDeg: 2,
    occlusion: 0.1,
    fps: 24,
  });

  const frame = evaluateMovementFrame({
    movement,
    measuredValue: (movement.targetMin + movement.targetMax) / 2,
    quality,
    previousPhase: "activate",
    previousStatus: "yellow",
    holdProgressSec: 1,
  });

  assert.equal(frame.statusColor, "green");
  assert.ok(frame.accuracy > 0.9);
});

test("evaluator returns yellow on low confidence", () => {
  const quality = evaluateQuality({
    brightness: 0.05,
    blur: 0.01,
    faceCoverage: 0.02,
    headYawDeg: 30,
    occlusion: 0.9,
    fps: 4,
  });

  const frame = evaluateMovementFrame({
    movement,
    measuredValue: movement.targetMax + 0.2,
    quality,
    previousPhase: "prepare",
    previousStatus: "red",
    holdProgressSec: 0,
  });

  assert.equal(frame.statusColor, "yellow");
  assert.ok(frame.errorReasons.length > 0);
});
