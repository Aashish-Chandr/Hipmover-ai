export const APP_CONFIG = {
  name: "HiperMove",
  tagline: "AI Movement & Mobility Assistant",
  version: "1.0.0",
  hackathon: "Hacktoberfest 26 Hack Day (KodeKurrent S2 × Open Science Labs)",
  demoVideoPath: "/demo/sample-squat.mp4",
  localWasmPath: "/mediapipe/wasm",
  localModelPath: "/mediapipe/models/pose_landmarker_lite.task",
  cdnWasmPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
  cdnModelPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
} as const;

export const SQUAT_THRESHOLDS = {
  STANDING_ANGLE_MIN: 160, // Degrees knee angle considered standing/locked
  BOTTOM_ANGLE_MAX: 100, // Knee angle below which rep reaches depth
  DEEP_SQUAT_ANGLE: 90, // Excellent parallel/below-parallel squat
  MIN_REP_DURATION_SEC: 0.8, // Reject jitter/accidental movements < 0.8s
  MIN_LANDMARK_VISIBILITY: 0.5, // Ignore low-confidence frames
  EMA_ALPHA: 0.25, // Exponential moving average smoothing factor
} as const;

export const WELLNESS_DISCLAIMER =
  "HiperMove provides general movement education and wellness form feedback only. It is not medical software, does not diagnose any condition, and does not evaluate injuries. Consult a licensed physical therapist or medical physician before beginning any new training program.";
