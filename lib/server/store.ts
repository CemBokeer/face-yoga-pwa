import type {
  CalibrationFrame,
  CalibrationProfile,
  DeviceProfile,
  FairnessBucketMetrics,
  FrameEvaluation,
  SessionMetrics,
  SessionRecord,
  TelemetryFrameSample,
} from "@/lib/domain/types";
import {
  averageFeatureVector,
  computeSymmetryIndex,
  extractMovementFeatureVector,
  featureRange,
  summarizeExpression,
} from "@/lib/vision/normalization";
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

interface UserConsentRecord {
  userId: string;
  telemetryOptIn: boolean;
  consentVersion: string;
  locale: string;
  updatedAt: string;
}

interface StoredTelemetryFrame extends TelemetryFrameSample {
  userId: string;
  createdAt: string;
}

interface MemoryStore {
  calibrationRuns: Map<string, CalibrationRun>;
  calibrationProfiles: Map<string, CalibrationProfile>;
  sessionRuns: Map<string, SessionRun>;
  sessionHistory: Map<string, SessionRecord[]>;
  userConsents: Map<string, UserConsentRecord>;
  telemetryFrames: StoredTelemetryFrame[];
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
    userConsents: new Map(),
    telemetryFrames: [],
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

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function statusWeight(status: FrameEvaluation["statusColor"]): number {
  switch (status) {
    case "green":
      return 1;
    case "yellow":
      return 0.65;
    default:
      return 0.2;
  }
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
  userId: string;
  frame: CalibrationFrame;
}): { qualityLevel: "good" | "fair" | "poor"; averageScore: number } | null {
  const run = store().calibrationRuns.get(input.calibrationId);
  if (!run || run.userId !== input.userId) {
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

export function completeCalibration(
  calibrationId: string,
  userId: string,
): CalibrationProfile | null {
  const run = store().calibrationRuns.get(calibrationId);
  if (!run || run.userId !== userId) {
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

  const featureFrames = run.frames
    .filter((frame) => Array.isArray(frame.landmarks) && frame.landmarks.length > 0)
    .map((frame) => extractMovementFeatureVector(frame.landmarks!));
  const neutralFeatures = averageFeatureVector(featureFrames);
  const ranges = featureRange(featureFrames);
  const featureCoverage = clamp(featureFrames.length / Math.max(20, run.frames.length));
  const confidence = clamp(averageScore * 0.65 + featureCoverage * 0.35);

  const profile: CalibrationProfile = {
    userId: run.userId,
    createdAt: nowISO(),
    calibrationVersion: "v2",
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
    personalBaselineV2: {
      calibrationVersion: "v2",
      neutralExpressionProxy: expressionSummary.neutral,
      neutralFeatures,
      rangeOfMotion: ranges,
      confidence,
    },
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
  userId: string;
  evaluation: FrameEvaluation;
}): boolean {
  const run = store().sessionRuns.get(input.sessionId);
  if (!run || run.userId !== input.userId) {
    return false;
  }
  run.evaluations.push(input.evaluation);
  return true;
}

export function endSession(sessionId: string, userId: string): SessionMetrics | null {
  const run = store().sessionRuns.get(sessionId);
  if (!run || run.userId !== userId) {
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
      : clamp(
          movementScores.reduce((sum, item) => sum + item.averageAccuracy, 0) /
            movementScores.length,
        );

  const weightedConsistency =
    run.evaluations.length === 0
      ? 0
      : run.evaluations.reduce((sum, item) => sum + statusWeight(item.statusColor), 0) /
        run.evaluations.length;
  const consistency = clamp(weightedConsistency);
  const blendedCompletion = clamp(completionRate * 0.6 + consistency * 0.4);

  const metrics: SessionMetrics = {
    sessionId: run.id,
    userId: run.userId,
    startedAt: new Date(run.startedAt).toISOString(),
    endedAt: new Date(endedAtMs).toISOString(),
    durationSec,
    completionRate: blendedCompletion,
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
    completionRate: blendedCompletion,
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

export function getUserConsent(userId: string): UserConsentRecord {
  return (
    store().userConsents.get(userId) ?? {
      userId,
      telemetryOptIn: false,
      consentVersion: "v1",
      locale: "tr-TR",
      updatedAt: nowISO(),
    }
  );
}

export function updateUserConsent(input: {
  userId: string;
  telemetryOptIn: boolean;
  consentVersion: string;
  locale?: string;
}): UserConsentRecord {
  const next: UserConsentRecord = {
    userId: input.userId,
    telemetryOptIn: input.telemetryOptIn,
    consentVersion: input.consentVersion,
    locale: input.locale ?? "tr-TR",
    updatedAt: nowISO(),
  };
  store().userConsents.set(input.userId, next);
  return next;
}

export function appendTelemetryFrame(input: {
  userId: string;
  sample: TelemetryFrameSample;
}): boolean {
  const consent = getUserConsent(input.userId);
  if (!consent.telemetryOptIn) {
    return false;
  }

  store().telemetryFrames.unshift({
    ...input.sample,
    userId: input.userId,
    createdAt: nowISO(),
  });
  store().telemetryFrames = store().telemetryFrames.slice(0, 5000);
  return true;
}

export function getFairnessBuckets(userId: string): FairnessBucketMetrics[] {
  const rows = store().telemetryFrames.filter((item) => item.userId === userId);
  const buckets = new Map<
    string,
    { count: number; accuracy: number; confidence: number; redCount: number }
  >();

  for (const row of rows) {
    const key = `${row.deviceOrientation}:${row.distanceBucket}`;
    const current = buckets.get(key) ?? {
      count: 0,
      accuracy: 0,
      confidence: 0,
      redCount: 0,
    };
    current.count += 1;
    current.accuracy += row.accuracy;
    current.confidence += row.confidence;
    if (row.statusColor === "red") {
      current.redCount += 1;
    }
    buckets.set(key, current);
  }

  return [...buckets.entries()].map(([bucketId, value]) => ({
    bucketId,
    sampleCount: value.count,
    averageAccuracy: value.accuracy / Math.max(1, value.count),
    averageConfidence: value.confidence / Math.max(1, value.count),
    redRate: value.redCount / Math.max(1, value.count),
  }));
}
