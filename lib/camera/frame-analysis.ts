import type { QualityInput } from "@/lib/domain/types";

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function computeBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const pixelCount = data.length / 4;
  return clamp(sum / (pixelCount * 255));
}

function computeBlurScore(imageData: ImageData): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  let gradientSum = 0;
  let samples = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const right = (y * width + (x + 1)) * 4;
      const down = ((y + 1) * width + x) * 4;
      const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const gx =
        Math.abs(current - (data[right] + data[right + 1] + data[right + 2]) / 3) /
        255;
      const gy =
        Math.abs(current - (data[down] + data[down + 1] + data[down + 2]) / 3) / 255;
      gradientSum += gx + gy;
      samples += 2;
    }
  }

  if (samples === 0) {
    return 0;
  }
  return clamp((gradientSum / samples) * 9);
}

export function estimateHeadYaw(faceBox: FaceBox, frameWidth: number): number {
  const faceCenter = faceBox.x + faceBox.width / 2;
  const frameCenter = frameWidth / 2;
  const normalizedOffset = (faceCenter - frameCenter) / frameCenter;
  return normalizedOffset * 35;
}

export function buildQualityInput(params: {
  imageData: ImageData;
  faceBox: FaceBox | null;
  faceDetectionSupported?: boolean;
  fps: number;
}): QualityInput {
  const { imageData, faceBox, fps, faceDetectionSupported = true } = params;
  const brightness = computeBrightness(imageData);
  const blur = computeBlurScore(imageData);

  if (!faceBox) {
    if (!faceDetectionSupported) {
      // If the browser does not expose face detection API, avoid misleading
      // geometry-related penalties and rely on global signal quality.
      return {
        brightness,
        blur,
        faceCoverage: 0.24,
        headYawDeg: 0,
        occlusion: 0.2,
        fps,
        faceSignal: "unsupported",
      };
    }

    return {
      brightness,
      blur,
      faceCoverage: 0,
      headYawDeg: 0,
      occlusion: 0.5,
      fps,
      faceSignal: "not_detected",
    };
  }

  const frameArea = imageData.width * imageData.height;
  const faceArea = Math.max(1, faceBox.width * faceBox.height);
  const faceCoverage = clamp(faceArea / frameArea);
  const headYawDeg = estimateHeadYaw(faceBox, imageData.width);
  const occlusion = clamp(1 - blur * 0.8);

  return {
    brightness,
    blur,
    faceCoverage,
    headYawDeg,
    occlusion,
    fps,
    faceSignal: "detected",
  };
}

export function expressionProxy(faceBox: FaceBox | null): number {
  if (!faceBox) {
    return 1;
  }
  const ratio = faceBox.width / Math.max(1, faceBox.height);
  return clamp(ratio, 0.7, 1.4);
}
