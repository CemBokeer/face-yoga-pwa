import type { DeviceProfile, Point3D, QualityInput } from "@/lib/domain/types";

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseDeviceProfile(value: unknown): DeviceProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const platform = asString(record.platform);
  const userAgent = asString(record.userAgent);
  const videoWidth = asNumber(record.videoWidth);
  const videoHeight = asNumber(record.videoHeight);
  if (!platform || !userAgent || videoWidth === null || videoHeight === null) {
    return null;
  }
  return { platform, userAgent, videoWidth, videoHeight };
}

export function parseQualityInput(value: unknown): QualityInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const brightness = asNumber(record.brightness);
  const blur = asNumber(record.blur);
  const faceCoverage = asNumber(record.faceCoverage);
  const headYawDeg = asNumber(record.headYawDeg);
  const occlusion = asNumber(record.occlusion);
  const fps = asNumber(record.fps);
  if (
    brightness === null ||
    blur === null ||
    faceCoverage === null ||
    headYawDeg === null ||
    occlusion === null ||
    fps === null
  ) {
    return null;
  }
  const faceSignal =
    record.faceSignal === "detected" ||
    record.faceSignal === "not_detected" ||
    record.faceSignal === "unsupported"
      ? record.faceSignal
      : undefined;
  return { brightness, blur, faceCoverage, headYawDeg, occlusion, fps, faceSignal };
}

export function parseNumber(value: unknown): number | null {
  return asNumber(value);
}

function parsePoint3D(value: unknown): Point3D | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const x = asNumber(record.x);
  const y = asNumber(record.y);
  const z = asNumber(record.z);
  if (x === null || y === null || z === null) {
    return null;
  }
  return { x, y, z };
}

export function parseLandmarks(value: unknown): Point3D[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const points: Point3D[] = [];
  for (const item of value) {
    const point = parsePoint3D(item);
    if (!point) {
      return null;
    }
    points.push(point);
  }
  return points;
}

export function parseDistanceBucket(value: unknown): "near" | "mid" | "far" | null {
  if (value === "near" || value === "mid" || value === "far") {
    return value;
  }
  return null;
}
