import type { MovementDefinition } from "./types";

export const MOVEMENTS: MovementDefinition[] = [
  {
    id: "cheek-lift",
    name: "Cheek Lift",
    description:
      "Gulume kaslarini kontrollu sekilde yukari tasiyin ve tutun.",
    targetMin: 0.97,
    targetMax: 1.08,
    holdSec: 6,
    reps: 6,
    restSec: 4,
  },
  {
    id: "jaw-release",
    name: "Jaw Release",
    description: "Cene kaslarini gevsetip ritmik sekilde ac-kapa.",
    targetMin: 0.9,
    targetMax: 1.08,
    holdSec: 4,
    reps: 8,
    restSec: 3,
  },
];

export function getMovementById(id: string): MovementDefinition | undefined {
  return MOVEMENTS.find((movement) => movement.id === id);
}
