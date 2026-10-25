import { z } from "zod";

export const SingleRepMetricsSchema = z.object({
  repNumber: z.number().int().positive(),
  minKneeAngle: z.number(),
  maxKneeAngle: z.number(),
  descentDurationSec: z.number().nonnegative(),
  ascentDurationSec: z.number().nonnegative(),
  totalDurationSec: z.number().nonnegative(),
  torsoLeanAtBottomDeg: z.number(),
  headTiltAtBottomDeg: z.number().optional(),
  valgusRatioAtBottom: z.number().optional(),
  heelLiftDeltaAtBottom: z.number().optional(),
  qualityScore: z.number().min(0).max(100),
  isValidRep: z.boolean().optional(),
  notes: z.array(z.string()).optional(),
  startTimeSec: z.number().nonnegative(),
  bottomTimeSec: z.number().nonnegative(),
  endTimeSec: z.number().nonnegative(),
  keyframeBase64: z.string().optional(),
});

export const SessionMetricsSummarySchema = z.object({
  totalReps: z.number().int().nonnegative(),
  validReps: z.number().int().nonnegative(),
  subBenchmarkReps: z.number().int().nonnegative().optional(),
  avgDepthAngle: z.number().nonnegative(),
  avgDescentSec: z.number().nonnegative(),
  avgAscentSec: z.number().nonnegative(),
  avgQualityScore: z.number().min(0).max(100),
  bestRepNumber: z.number().nullable(),
  worstRepNumber: z.number().nullable(),
  durationSec: z.number().nonnegative(),
});

// Enforce max 2.5MB payload per image to protect memory and payload limits
const ImageBase64Schema = z
  .string()
  .max(3500000, "Image base64 exceeds 2.5MB maximum limit")
  .optional();

export const CoachApiRequestSchema = z.object({
  metrics_summary: SessionMetricsSummarySchema,
  per_rep_metrics: z.array(SingleRepMetricsSchema).min(1, "At least 1 repetition is required for coaching analysis"),
  best_rep_image_base64: ImageBase64Schema,
  worst_rep_image_base64: ImageBase64Schema,
});

export const TopFixItemSchema = z.object({
  issue: z.string(),
  evidence_from_metrics: z.string(),
  cue: z.string(),
  drill: z.string(),
});

export const CoachApiResponseSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  top_fixes: z.array(TopFixItemSchema),
  confidence: z.enum(["low", "medium", "high"]),
  limitations: z.array(z.string()),
  sourceModel: z.enum(["Gemma 4 31B", "Gemma 4 26B", "Rule-based fallback"]),
});

export type CoachApiRequestInput = z.infer<typeof CoachApiRequestSchema>;
export type CoachApiResponseOutput = z.infer<typeof CoachApiResponseSchema>;
