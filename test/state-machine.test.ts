import assert from "node:assert/strict";
import test from "node:test";

import { nextSessionPhase } from "../lib/session/state-machine.ts";

test("state machine transitions from prepare to activate when target hit", () => {
  const phase = nextSessionPhase({
    previousPhase: "prepare",
    inTargetRange: true,
    holdProgressSec: 0,
  });
  assert.equal(phase, "activate");
});

test("state machine goes to hold after activate in range", () => {
  const phase = nextSessionPhase({
    previousPhase: "activate",
    inTargetRange: true,
    holdProgressSec: 0,
  });
  assert.equal(phase, "hold");
});

test("state machine releases after hold progress reaches threshold", () => {
  const phase = nextSessionPhase({
    previousPhase: "hold",
    inTargetRange: true,
    holdProgressSec: 1,
  });
  assert.equal(phase, "release");
});
