/**
 * Keyframe snapshot capture helper:
 * Renders video + skeleton overlay to an offscreen canvas resized to max 512px,
 * returning a lightweight base64 JPEG string for multimodal Gemma 4 processing.
 */
export function captureKeyframeFromCanvas(
  videoElement: HTMLVideoElement,
  skeletonCanvas: HTMLCanvasElement,
  maxDimension = 512,
  quality = 0.82
): string | null {
  try {
    const width = videoElement.videoWidth || skeletonCanvas.width || 640;
    const height = videoElement.videoHeight || skeletonCanvas.height || 480;

    if (width <= 0 || height <= 0) return null;

    // Calculate scaled dimensions keeping aspect ratio
    let targetWidth = width;
    let targetHeight = height;

    if (targetWidth > targetHeight) {
      if (targetWidth > maxDimension) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      }
    } else {
      if (targetHeight > maxDimension) {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = targetWidth;
    offscreen.height = targetHeight;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    // 1. Draw raw video frame
    ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

    // 2. Composite skeleton overlay on top
    ctx.drawImage(skeletonCanvas, 0, 0, targetWidth, targetHeight);

    // 3. Export as base64 JPEG
    return offscreen.toDataURL("image/jpeg", quality);
  } catch (err) {
    console.warn("[keyframe] Error capturing keyframe snapshot:", err);
    return null;
  }
}
