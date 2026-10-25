export type VideoSourceType = "demo" | "upload" | "webcam" | null;

export type ExercisePhase = "STANDING" | "DESCENDING" | "BOTTOM" | "ASCENDING";

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PoseFrameData {
  timestampMs: number;
  kneeAngle: number;
  phase: ExercisePhase;
  hipAngle?: number;
  torsoLean?: number;
  isOccluded: boolean;
  landmarks?: LandmarkPoint[];
}

export interface SingleRepMetrics {
  repNumber: number;
  minKneeAngle: number; // Lowest knee angle achieved (depth)
  maxKneeAngle: number;
  descentDurationSec: number;
  ascentDurationSec: number;
  totalDurationSec: number;
  torsoLeanAtBottomDeg: number;
  headTiltAtBottomDeg?: number;
  valgusRatioAtBottom?: number;
  heelLiftDeltaAtBottom?: number;
  qualityScore: number; // 0 to 100
  isValidRep: boolean; // true if qualityScore >= 70 (benchmark threshold)
  notes?: string[];
  startTimeSec: number;
  bottomTimeSec: number;
  endTimeSec: number;
  keyframeBase64?: string; // 512px JPEG at rep bottom
}

export interface SessionMetricsSummary {
  totalReps: number;
  validReps: number; // Reps that scored >= 70 benchmark
  subBenchmarkReps?: number; // Attempts that scored < 70
  avgDepthAngle: number;
  avgDescentSec: number;
  avgAscentSec: number;
  avgQualityScore: number;
  bestRepNumber: number | null;
  worstRepNumber: number | null;
  durationSec: number;
}

export interface TopFixItem {
  issue: string;
  evidence_from_metrics: string;
  cue: string;
  drill: string;
}

export interface AICoachResponse {
  headline: string;
  summary: string;
  strengths: string[];
  top_fixes: TopFixItem[];
  confidence: "low" | "medium" | "high";
  limitations: string[];
  sourceModel: "Gemma 4 31B" | "Gemma 4 26B" | "Rule-based fallback";
}

export interface CoachApiRequestPayload {
  metrics_summary: SessionMetricsSummary;
  per_rep_metrics: SingleRepMetrics[];
  best_rep_image_base64?: string;
  worst_rep_image_base64?: string;
}
