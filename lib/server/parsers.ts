import type { DeviceProfile, QualityInput } from "@/lib/domain/types";

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
  return { brightness, blur, faceCoverage, headYawDeg, occlusion, fps };
}

export function parseNumber(value: unknown): number | null {
  return asNumber(value);
}
