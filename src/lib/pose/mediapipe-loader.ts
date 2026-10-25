import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { APP_CONFIG } from "../constants";

let cachedPoseLandmarker: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (cachedPoseLandmarker) {
    return cachedPoseLandmarker;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    let visionFileset;

    // 1. Try local WASM first (venue wifi resilience)
    try {
      console.log("[mediapipe] Attempting to load WASM from local:", APP_CONFIG.localWasmPath);
      visionFileset = await FilesetResolver.forVisionTasks(APP_CONFIG.localWasmPath);
      console.log("[mediapipe] Loaded WASM locally successfully.");
    } catch (localWasmErr) {
      console.warn("[mediapipe] Local WASM load failed, falling back to CDN:", localWasmErr);
      visionFileset = await FilesetResolver.forVisionTasks(APP_CONFIG.cdnWasmPath);
      console.log("[mediapipe] Loaded WASM from CDN successfully.");
    }

    // 2. Try local model first, fallback to CDN if needed
    let modelAssetPath: string = APP_CONFIG.localModelPath;
    try {
      const response = await fetch(APP_CONFIG.localModelPath, { method: "HEAD" });
      if (!response.ok) {
        console.warn("[mediapipe] Local model not responding 200 OK, using CDN model");
        modelAssetPath = APP_CONFIG.cdnModelPath;
      }
    } catch (modelCheckErr) {
      console.warn("[mediapipe] Local model check error, using CDN fallback:", modelCheckErr);
      modelAssetPath = APP_CONFIG.cdnModelPath;
    }

    console.log("[mediapipe] Initializing PoseLandmarker with model:", modelAssetPath);

    const landmarker = await PoseLandmarker.createFromOptions(visionFileset, {
      baseOptions: {
        modelAssetPath,
        delegate: "GPU", // Will automatically fall back to CPU in browsers without WebGL/WebGPU
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    cachedPoseLandmarker = landmarker;
    console.log("[mediapipe] PoseLandmarker initialized successfully in VIDEO mode.");
    return landmarker;
  })();

  return initPromise;
}
