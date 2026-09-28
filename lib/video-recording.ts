const PREFERRED_RECORDING_TYPES = [
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const;

export function selectPreferredRecordingMimeType(
  isTypeSupported: (mimeType: string) => boolean,
) {
  return PREFERRED_RECORDING_TYPES.find(isTypeSupported) ?? null;
}

export function getRecordedVideoFileDetails(
  recorderMimeType: string,
  recordedAt = new Date(),
  movementSlug = "squat",
) {
  const baseMimeType = recorderMimeType.toLowerCase().split(";")[0];
  const mimeType = baseMimeType === "video/mp4" ? "video/mp4" : "video/webm";
  const extension = mimeType === "video/mp4" ? "mp4" : "webm";
  const timestamp = recordedAt.toISOString().replace(/[:.]/g, "-");

  return {
    mimeType,
    fileName: `${movementSlug}-recording-${timestamp}.${extension}`,
  };
}

export function formatRecordingDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.min(30, Math.floor(seconds)));
  return `0:${safeSeconds.toString().padStart(2, "0")}`;
}
