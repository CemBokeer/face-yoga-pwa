export interface MovementReferenceProfile {
  movementId: string;
  title: string;
  videoUrl: string;
  guidance: string[];
  targetFeature: "smileRatio" | "mouthOpenRatio" | "jawDropRatio" | "cheekLiftRatio";
  modelVersion: string;
}

export const MOVEMENT_REFERENCE_PROFILES: MovementReferenceProfile[] = [
  {
    movementId: "cheek-lift",
    title: "Cheek Lift - Expert Form",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    guidance: [
      "Dudak kenarlarini yumusakca yukari kaldirin.",
      "Yanaklari simetrik tutup cene kilitlenmesini engelleyin.",
      "Pozu nefes tutmadan koruyun.",
    ],
    targetFeature: "cheekLiftRatio",
    modelVersion: "landmark-rule-v2",
  },
  {
    movementId: "jaw-release",
    title: "Jaw Release - Expert Form",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    guidance: [
      "Ceneyi asagiyi kontrollu indirin.",
      "Boyun kaslarini gereksiz sıkmayin.",
      "Ritmi koruyarak tekrar edin.",
    ],
    targetFeature: "jawDropRatio",
    modelVersion: "landmark-rule-v2",
  },
];

export function getMovementReferenceProfile(movementId: string): MovementReferenceProfile | null {
  return MOVEMENT_REFERENCE_PROFILES.find((item) => item.movementId === movementId) ?? null;
}
