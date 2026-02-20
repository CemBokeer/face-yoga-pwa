import type {
  CalibrationFrame,
  CalibrationProfile,
  DeviceProfile,
  FrameEvaluation,
  SessionMetrics,
  SessionRecord,
} from "@/lib/domain/types";
import { computeSymmetryIndex, summarizeExpression } from "@/lib/vision/normalization";
import { evaluateQuality, recommendedCalibrationSeconds } from "@/lib/vision/quality";

interface CalibrationRun {
  id: string;
  userId: string;
  startedAt: number;
  deviceProfile: DeviceProfile;
  frames: CalibrationFrame[];
}

interface SessionRun {
  id: string;
  userId: string;
  startedAt: number;
  movementIds: string[];
  evaluations: FrameEvaluation[];
}

interface MemoryStore {
  calibrationRuns: Map<string, CalibrationRun>;
  calibrationProfiles: Map<string, CalibrationProfile>;
  sessionRuns: Map<string, SessionRun>;
  sessionHistory: Map<string, SessionRecord[]>;
}

declare global {
  var __faceYogaStore: MemoryStore | undefined;
}

function createStore(): MemoryStore {
  return {
    calibrationRuns: new Map(),
    calibrationProfiles: new Map(),
    sessionRuns: new Map(),
    sessionHistory: new Map(),
  };
}

function store(): MemoryStore {
  if (!globalThis.__faceYogaStore) {
    globalThis.__faceYogaStore = createStore();
  }
  return globalThis.__faceYogaStore;
}

function nowISO(): string {
  return new Date().toISOString();
}

export function startCalibration(input: {
  userId: string;
  deviceProfile: DeviceProfile;
}): {
  calibrationId: string;
  targetDurationSec: number;
  startedAt: string;
} {
  const id = crypto.randomUUID();
  const run: CalibrationRun = {
    id,
    userId: input.userId,
    startedAt: Date.now(),
    deviceProfile: input.deviceProfile,
    frames: [],
  };
  store().calibrationRuns.set(id, run);
  return {
    calibrationId: id,
    targetDurationSec: 90,
    startedAt: nowISO(),
  };
}

export function addCalibrationFrame(input: {
  calibrationId: string;
  frame: CalibrationFrame;
}): { qualityLevel: "good" | "fair" | "poor"; averageScore: number } | null {
  const run = store().calibrationRuns.get(input.calibrationId);
  if (!run) {
    return null;
  }

  run.frames.push(input.frame);
  const qualityScores = run.frames.map((frame) => evaluateQuality(frame.quality));
  const averageScore =
    qualityScores.reduce((sum, score) => sum + score.overall, 0) /
    Math.max(1, qualityScores.length);
  const aggregateLevel =
    averageScore < 0.45 ? "poor" : averageScore < 0.72 ? "fair" : "good";

  return {
    qualityLevel: aggregateLevel,
    averageScore,
  };
}

export function completeCalibration(calibrationId: string): CalibrationProfile | null {
  const run = store().calibrationRuns.get(calibrationId);
  if (!run) {
    return null;
  }

  const qualityScores = run.frames.map((frame) => evaluateQuality(frame.quality));
  const averageScore =
    qualityScores.reduce((sum, score) => sum + score.overall, 0) /
    Math.max(1, qualityScores.length);
  const aggregateLevel =
    averageScore < 0.45 ? "poor" : averageScore < 0.72 ? "fair" : "good";

  const expressionSeries = run.frames.map((frame) => frame.expressionProxy);
  const expressionSummary = summarizeExpression(expressionSeries);
  const left = expressionSeries.map((value) => value * 0.99);
  const right = expressionSeries.map((value) => value * 1.01);

  const profile: CalibrationProfile = {
    userId: run.userId,
    createdAt: nowISO(),
    qualityStats: {
      averageScore,
      sampleCount: run.frames.length,
      recommendedDurationSec: recommendedCalibrationSeconds(aggregateLevel),
    },
    baselineGeometry: {
      neutralExpressionProxy: expressionSummary.neutral,
      expressionStdDev: expressionSummary.deviation,
    },
    symmetry: {
      index: computeSymmetryIndex(left, right),
    },
    deviceProfile: run.deviceProfile,
  };

  store().calibrationProfiles.set(run.userId, profile);
  store().calibrationRuns.delete(calibrationId);
  return profile;
}

export function getCalibrationProfile(userId: string): CalibrationProfile | null {
  return store().calibrationProfiles.get(userId) ?? null;
}

export function startSession(input: {
  userId: string;
  movementIds: string[];
}): { sessionId: string; startedAt: string } {
  const sessionId = crypto.randomUUID();
  const run: SessionRun = {
    id: sessionId,
    userId: input.userId,
    startedAt: Date.now(),
    movementIds: input.movementIds,
    evaluations: [],
  };
  store().sessionRuns.set(sessionId, run);

  return { sessionId, startedAt: nowISO() };
}

export function appendSessionEvaluation(input: {
  sessionId: string;
  evaluation: FrameEvaluation;
}): boolean {
  const run = store().sessionRuns.get(input.sessionId);
  if (!run) {
    return false;
  }
  run.evaluations.push(input.evaluation);
  return true;
}

export function endSession(sessionId: string): SessionMetrics | null {
  const run = store().sessionRuns.get(sessionId);
  if (!run) {
    return null;
  }

  const endedAtMs = Date.now();
  const durationSec = Math.floor((endedAtMs - run.startedAt) / 1000);
  const scoresByMovement = new Map<
    string,
    { scoreSum: number; frameCount: number; greenCount: number }
  >();

  for (const evaluation of run.evaluations) {
    const current = scoresByMovement.get(evaluation.movementId) ?? {
      scoreSum: 0,
      frameCount: 0,
      greenCount: 0,
    };
    current.scoreSum += evaluation.accuracy;
    current.frameCount += 1;
    if (evaluation.statusColor === "green") {
      current.greenCount += 1;
    }
    scoresByMovement.set(evaluation.movementId, current);
  }

  const movementScores = [...scoresByMovement.entries()].map(([movementId, item]) => ({
    movementId,
    averageAccuracy: item.scoreSum / Math.max(1, item.frameCount),
    repCount: item.greenCount,
  }));

  const completionRate =
    movementScores.length === 0
      ? 0
      : movementScores.reduce((sum, item) => sum + item.averageAccuracy, 0) /
        movementScores.length;

  const consistency =
    run.evaluations.length === 0
      ? 0
      : run.evaluations.filter((item) => item.statusColor === "green").length /
        run.evaluations.length;

  const metrics: SessionMetrics = {
    sessionId: run.id,
    userId: run.userId,
    startedAt: new Date(run.startedAt).toISOString(),
    endedAt: new Date(endedAtMs).toISOString(),
    durationSec,
    completionRate,
    consistency,
    movementScores,
  };

  const history = store().sessionHistory.get(run.userId) ?? [];
  history.unshift({
    sessionId: run.id,
    userId: run.userId,
    startedAt: metrics.startedAt,
    endedAt: metrics.endedAt,
    durationSec: metrics.durationSec,
    averageAccuracy:
      movementScores.reduce((sum, item) => sum + item.averageAccuracy, 0) /
      Math.max(1, movementScores.length),
    completionRate,
    movementScores,
  });
  store().sessionHistory.set(run.userId, history.slice(0, 200));
  store().sessionRuns.delete(sessionId);

  return metrics;
}

export function getSessions(userId: string): SessionRecord[] {
  return store().sessionHistory.get(userId) ?? [];
}

export function getMovementHistory(userId: string): Array<{
  movementId: string;
  sessions: number;
  averageAccuracy: number;
}> {
  const sessions = getSessions(userId);
  const buckets = new Map<string, { count: number; score: number }>();

  for (const session of sessions) {
    const movementScores = session.movementScores ?? [];
    if (movementScores.length === 0) {
      const current = buckets.get("session-general") ?? { count: 0, score: 0 };
      current.count += 1;
      current.score += session.averageAccuracy;
      buckets.set("session-general", current);
      continue;
    }

    for (const score of movementScores) {
      const current = buckets.get(score.movementId) ?? { count: 0, score: 0 };
      current.count += 1;
      current.score += score.averageAccuracy;
      buckets.set(score.movementId, current);
    }
  }

  return [...buckets.entries()].map(([movementId, value]) => ({
    movementId,
    sessions: value.count,
    averageAccuracy: value.score / Math.max(1, value.count),
  }));
}
