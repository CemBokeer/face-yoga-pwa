import type { SessionPhase } from "../domain/types";

export interface TransitionInput {
  previousPhase: SessionPhase;
  inTargetRange: boolean;
  holdProgressSec: number;
}

export function nextSessionPhase(input: TransitionInput): SessionPhase {
  if (input.previousPhase === "prepare") {
    return input.inTargetRange ? "activate" : "prepare";
  }

  if (input.previousPhase === "activate") {
    return input.inTargetRange ? "hold" : "activate";
  }

  if (input.previousPhase === "hold") {
    return input.holdProgressSec >= 1 ? "release" : "hold";
  }

  return input.inTargetRange ? "activate" : "prepare";
}
