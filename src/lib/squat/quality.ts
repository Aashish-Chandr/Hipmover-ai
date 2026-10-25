/**
 * Full-Body Squat Biomechanics Scoring Engine (0 - 100)
 * Evaluates all 6 kinematic chain pillars:
 * 1. Knee Depth & Range of Motion (Max 30 pts) [Landmarks 23-28]
 * 2. Torso Posture & Spinal Angle  (Max 20 pts) [Landmarks 11-12, 23-24]
 * 3. Knee Valgus / Lateral Tracking (Max 15 pts) [Landmarks 25-28]
 * 4. Foot & Heel Grounding        (Max 15 pts) [Landmarks 29-32]
 * 5. Head & Cervical Alignment    (Max 10 pts) [Landmarks 0-8, 11-12]
 * 6. Tempo & Movement Control     (Max 10 pts)
 * 
 * HARD BENCHMARK: A repetition is only valid and counted on frontend if score >= 70.
 */

export const SQUAT_BENCHMARK_SCORE = 70;

export interface FullBodyScoreOptions {
  headTiltDeg?: number;
  valgusRatio?: number;
  heelLiftDelta?: number;
}

export interface QualityScoreBreakdown {
  score: number; // 0 - 100
  isValidRep: boolean; // score >= 70
  depthScore: number; // 0 - 30
  postureScore: number; // 0 - 20 (torso lean)
  valgusScore: number; // 0 - 15 (knee tracking)
  heelScore: number; // 0 - 15 (heel grounding)
  headScore: number; // 0 - 10 (cervical neutrality)
  tempoScore: number; // 0 - 10 (eccentric/concentric control)
  notes: string[];
  failedCriteria: string[];
}

export function computeRepQualityScore(
  minKneeAngle: number,
  torsoLeanDeg: number,
  descentSec: number,
  ascentSec: number,
  options?: FullBodyScoreOptions
): QualityScoreBreakdown {
  const notes: string[] = [];
  const failedCriteria: string[] = [];

  // 1. Depth Score (0 - 30 pts) [Landmarks 23-28]
  let depthScore = 0;
  if (minKneeAngle <= 90) {
    depthScore = 30; // Full depth parallel/below parallel
    notes.push("Full depth achieved (<=90°)");
  } else if (minKneeAngle <= 100) {
    depthScore = 25; // Parallel squat
    notes.push("Parallel depth achieved (90°-100°)");
  } else if (minKneeAngle <= 110) {
    depthScore = 16; // Slightly shallow
    notes.push("Slightly shallow depth (100°-110°)");
    failedCriteria.push("Squat depth was slightly above parallel");
  } else if (minKneeAngle <= 125) {
    depthScore = 8; // Partial squat
    notes.push("Partial squat depth (110°-125°)");
    failedCriteria.push("Incomplete squat depth (>110°)");
  } else {
    depthScore = 2;
    notes.push("Very shallow depth (>125°)");
    failedCriteria.push("Missed parallel squat depth entirely");
  }

  // 2. Torso Posture & Spine (0 - 20 pts) [Landmarks 11-12, 23-24]
  let postureScore = 0;
  if (torsoLeanDeg <= 30) {
    postureScore = 20; // Very upright torso
    notes.push("Upright spinal alignment");
  } else if (torsoLeanDeg <= 42) {
    postureScore = 16; // Standard healthy forward pitch
    notes.push("Stable torso posture");
  } else if (torsoLeanDeg <= 55) {
    postureScore = 10; // Noticeable forward lean
    notes.push("Noticeable forward torso pitch");
    failedCriteria.push("Torso pitched too far forward (>42°)");
  } else {
    postureScore = 3; // Excessive collapse
    notes.push("Excessive spinal forward collapse");
    failedCriteria.push("Severe forward chest collapse (>55°)");
  }

  // 3. Knee Valgus / Lateral Tracking (0 - 15 pts) [Landmarks 25-28]
  const valgusRatio = options?.valgusRatio ?? 1.0;
  let valgusScore = 0;
  if (valgusRatio >= 0.90) {
    valgusScore = 15; // Solid knee tracking outside/stacked over ankles
    notes.push("Optimal knee tracking over feet");
  } else if (valgusRatio >= 0.80) {
    valgusScore = 10; // Slight inward drift
    notes.push("Minor knee medial drift");
    failedCriteria.push("Knees drifted slightly inward");
  } else {
    valgusScore = 3; // Knee valgus collapse
    notes.push("Knee valgus collapse detected");
    failedCriteria.push("Knee valgus: knees caved inward toward midline");
  }

  // 4. Foot & Heel Grounding (0 - 15 pts) [Landmarks 29-32]
  const heelLiftDelta = options?.heelLiftDelta ?? 0.0;
  let heelScore = 0;
  if (heelLiftDelta <= 0.02) {
    heelScore = 15; // Heels planted flat on floor
    notes.push("Heels firmly planted");
  } else if (heelLiftDelta <= 0.04) {
    heelScore = 9; // Slight heel elevation
    notes.push("Slight heel elevation at bottom");
    failedCriteria.push("Heels lifted slightly off floor (ankle stiffness)");
  } else {
    heelScore = 3; // Severe heel lift / weight shifted to toes
    notes.push("Significant heel lift off floor");
    failedCriteria.push("Significant heel lift: weight shifted to toes");
  }

  // 5. Head & Cervical Alignment (0 - 10 pts) [Landmarks 0-8, 11-12]
  const headTilt = options?.headTiltDeg ?? 10.0;
  let headScore = 0;
  if (headTilt <= 18) {
    headScore = 10; // Neutral cervical spine
    notes.push("Neutral cervical spine & eye gaze");
  } else if (headTilt <= 28) {
    headScore = 7;
    notes.push("Slight head tilt / non-neutral gaze");
  } else {
    headScore = 2;
    notes.push("Excessive head extension or chest drop");
    failedCriteria.push("Head/cervical spine out of neutral alignment");
  }

  // 6. Tempo & Movement Control (0 - 10 pts)
  let tempoScore = 0;
  const isDescentControlled = descentSec >= 0.9 && descentSec <= 4.0;
  const isAscentControlled = ascentSec >= 0.7 && ascentSec <= 3.5;

  if (isDescentControlled && isAscentControlled) {
    tempoScore = 10;
    notes.push("Controlled eccentric & concentric tempo");
  } else if (isDescentControlled || isAscentControlled) {
    tempoScore = 6;
    if (!isDescentControlled) notes.push("Descent was rushed or hesitant");
    if (!isAscentControlled) notes.push("Ascent was rushed or struggled");
  } else {
    tempoScore = 2;
    notes.push("Uncontrolled or ballistic repetition tempo");
    failedCriteria.push("Rushed or ballistic tempo");
  }

  const rawTotal = depthScore + postureScore + valgusScore + heelScore + headScore + tempoScore;
  const clampedScore = Math.max(0, Math.min(100, Math.round(rawTotal)));
  const isValidRep = clampedScore >= SQUAT_BENCHMARK_SCORE;

  return {
    score: clampedScore,
    isValidRep,
    depthScore,
    postureScore,
    valgusScore,
    heelScore,
    headScore,
    tempoScore,
    notes,
    failedCriteria,
  };
}
