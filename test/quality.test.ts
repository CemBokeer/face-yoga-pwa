import assert from "node:assert/strict";
import test from "node:test";

import { evaluateQuality, recommendedCalibrationSeconds } from "../lib/vision/quality.ts";

test("evaluateQuality returns good score for strong signal", () => {
  const score = evaluateQuality({
    brightness: 0.6,
    blur: 0.8,
    faceCoverage: 0.24,
    headYawDeg: 3,
    occlusion: 0.1,
    fps: 24,
  });

  assert.equal(score.level, "good");
  assert.ok(score.overall > 0.72);
});

test("evaluateQuality flags poor signal", () => {
  const score = evaluateQuality({
    brightness: 0.12,
    blur: 0.2,
    faceCoverage: 0.06,
    headYawDeg: 28,
    occlusion: 0.8,
    fps: 7,
  });

  assert.equal(score.level, "poor");
  assert.ok(score.reasons.length > 0);
});

test("recommendedCalibrationSeconds scales with quality", () => {
  assert.equal(recommendedCalibrationSeconds("good"), 90);
  assert.equal(recommendedCalibrationSeconds("fair"), 120);
  assert.equal(recommendedCalibrationSeconds("poor"), 180);
});
