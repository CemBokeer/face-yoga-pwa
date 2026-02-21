import assert from "node:assert/strict";
import test from "node:test";

import {
  computeSymmetryIndex,
  extractMovementFeatureVector,
  featureRange,
  normalizeLandmarks,
  summarizeExpression,
} from "../lib/vision/normalization.ts";

test("normalizeLandmarks normalizes values by face dimensions", () => {
  const normalized = normalizeLandmarks(
    [
      { x: 50, y: 25, z: 10 },
      { x: 100, y: 50, z: 20 },
    ],
    100,
    50,
  );

  assert.equal(normalized[0].x, 0.5);
  assert.equal(normalized[0].y, 0.5);
  assert.equal(normalized[1].x, 1);
  assert.equal(normalized[1].y, 1);
});

test("computeSymmetryIndex approaches one for balanced values", () => {
  const symmetry = computeSymmetryIndex([1, 1.02, 1.01], [1, 1.01, 1.02]);
  assert.ok(symmetry > 0.95);
});

test("summarizeExpression returns neutral and deviation", () => {
  const summary = summarizeExpression([1, 1.1, 0.9, 1.05, 0.95]);
  assert.ok(summary.neutral > 0.9 && summary.neutral < 1.1);
  assert.ok(summary.deviation > 0);
});

test("extractMovementFeatureVector is deterministic", () => {
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: -0.3, y: -0.1, z: 0 },
    { x: 0.3, y: -0.1, z: 0 },
    { x: 0, y: 0.12, z: 0 },
    { x: 0, y: 0.5, z: 0 },
    { x: -0.2, y: 0.2, z: 0 },
    { x: 0.2, y: 0.2, z: 0 },
    { x: 0, y: 0.18, z: 0 },
    { x: 0, y: 0.26, z: 0 },
    { x: -0.25, y: 0.18, z: 0 },
    { x: 0.25, y: 0.18, z: 0 },
  ];
  const first = extractMovementFeatureVector(points);
  const second = extractMovementFeatureVector(points);
  assert.deepEqual(first, second);
});

test("featureRange has safety minimum", () => {
  const ranges = featureRange([
    {
      smileRatio: 0.4,
      mouthOpenRatio: 0.2,
      jawDropRatio: 0.3,
      cheekLiftRatio: 0.5,
      symmetryScore: 0.9,
    },
  ]);
  assert.equal(ranges.smileRatio, 0.05);
  assert.equal(ranges.cheekLiftRatio, 0.05);
});
