import assert from "node:assert/strict";
import test from "node:test";

import {
  computeSymmetryIndex,
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
