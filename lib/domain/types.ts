export type StatusColor = "green" | "red" | "yellow";

export interface DeviceProfile {
  platform: string;
  userAgent: string;
  videoWidth: number;
  videoHeight: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface QualityInput {
  brightness: number;
  blur: number;
  faceCoverage: number;
  headYawDeg: number;
  occlusion: number;
  fps: number;
  faceSignal?: "detected" | "not_detected" | "unsupported";
}

export interface QualityScore {
  overall: number;
  brightnessScore: number;
  blurScore: number;
  coverageScore: number;
  yawScore: number;
  occlusionScore: number;
  fpsScore: number;
  level: "good" | "fair" | "poor";
  reasons: string[];
}

export interface CalibrationFrame {
  timestamp: number;
  quality: QualityInput;
  expressionProxy: number;
}

export interface CalibrationProfile {
  userId: string;
  createdAt: string;
  qualityStats: {
    averageScore: number;
    sampleCount: number;
    recommendedDurationSec: number;
  };
  baselineGeometry: {
    neutralExpressionProxy: number;
    expressionStdDev: number;
  };
  symmetry: {
    index: number;
  };
  deviceProfile: DeviceProfile;
}

export interface MovementDefinition {
  id: string;
  name: string;
  description: string;
  targetMin: number;
  targetMax: number;
  holdSec: number;
  reps: number;
  restSec: number;
}

export interface FrameEvaluation {
  movementId: string;
  statusColor: StatusColor;
  accuracy: number;
  confidence: number;
  errorReasons: string[];
  audioCue: string;
  visualCue: string;
  phase: SessionPhase;
}

export type SessionPhase = "prepare" | "activate" | "hold" | "release";

export interface SessionMetrics {
  sessionId: string;
  userId: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  completionRate: number;
  consistency: number;
  movementScores: Array<{
    movementId: string;
    averageAccuracy: number;
    repCount: number;
  }>;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  averageAccuracy: number;
  completionRate: number;
  movementScores?: Array<{
    movementId: string;
    averageAccuracy: number;
    repCount: number;
  }>;
}
