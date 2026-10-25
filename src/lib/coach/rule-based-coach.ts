import {
  CoachApiRequestInput,
  CoachApiResponseOutput,
  TopFixItemSchema,
} from "./schema";

/**
 * Deterministic rule-based fallback generator:
 * Produces structured coaching feedback grounded strictly in numeric metrics
 * when external LLM calls exceed timeout or fail.
 */
export function generateRuleBasedCoachFeedback(
  input: CoachApiRequestInput
): CoachApiResponseOutput {
  const { metrics_summary, per_rep_metrics } = input;
  const { totalReps, avgDepthAngle, avgQualityScore, avgDescentSec, avgAscentSec } =
    metrics_summary;

  const strengths: string[] = [];
  const top_fixes: Array<{
    issue: string;
    evidence_from_metrics: string;
    cue: string;
    drill: string;
  }> = [];
  const limitations: string[] = [
    "Analysis generated via deterministic biomechanical heuristics (fallback mode).",
    "Evaluated from single 2D camera angle; 3D rotational mechanics may vary.",
  ];

  // 1. Analyze Depth
  if (avgDepthAngle <= 95) {
    strengths.push(
      `Outstanding squat depth: achieved an average minimum knee angle of ${avgDepthAngle}°, hitting full parallel or below.`
    );
  } else if (avgDepthAngle <= 105) {
    strengths.push(
      `Solid working depth: maintained an average knee angle of ${avgDepthAngle}°, reaching parallel threshold.`
    );
    top_fixes.push({
      issue: "Slight depth cutoff on lower reps",
      evidence_from_metrics: `Average lowest knee flexion was ${avgDepthAngle}°, leaving slight room before hip crease passes below the knee.`,
      cue: "Sit between your heels and open your hips at the bottom.",
      drill: "Goblet squats with a 2-second isometric pause in the bottom position.",
    });
  } else {
    top_fixes.push({
      issue: "Shallow squat depth",
      evidence_from_metrics: `Knee angle averaged ${avgDepthAngle}°, which is above parallel (>100°).`,
      cue: "Drive knees out in line with your toes and descend until thighs are parallel to the floor.",
      drill: "Box squats targeting a 12-to-14 inch target to build consistent depth awareness.",
    });
  }

  // 2. Analyze Tempo
  const totalTempo = avgDescentSec + avgAscentSec;
  if (avgDescentSec >= 1.0 && avgDescentSec <= 3.5) {
    strengths.push(
      `Controlled eccentric phase: descending pace averaged ${avgDescentSec}s, showing good muscular tension and control.`
    );
  } else if (avgDescentSec < 1.0) {
    top_fixes.push({
      issue: "Rushed descent / dive-bombing into the hole",
      evidence_from_metrics: `Descent duration averaged only ${avgDescentSec}s, risking loss of pelvic stability.`,
      cue: "Pull yourself down with your hip flexors under a 3-second count.",
      drill: "Tempo squats using a strict 3-0-1-0 tempo cadence.",
    });
  }

  // 3. Analyze Consistency across Reps
  if (per_rep_metrics.length >= 2) {
    const depths = per_rep_metrics.map((r) => r.minKneeAngle);
    const variance = Math.max(...depths) - Math.min(...depths);
    if (variance <= 8) {
      strengths.push(
        `High repetition consistency: depth varied by only ${variance}° across all ${totalReps} recorded reps.`
      );
    } else {
      top_fixes.push({
        issue: "Repetition-to-repetition inconsistency",
        evidence_from_metrics: `Depth varied by ${variance}° between best and worst reps.`,
        cue: "Take a consistent breath and brace your core before every single repetition.",
        drill: "Paused bodyweight squats focusing on identical bottom depth feel.",
      });
    }
  }

  // Fallback top fix if athlete was nearly flawless
  if (top_fixes.length === 0) {
    top_fixes.push({
      issue: "Progressive overload preparation",
      evidence_from_metrics: `Maintained a high form score of ${avgQualityScore}/100 with consistent depth and tempo.`,
      cue: "Keep maintaining firm foot tripod contact (big toe, pinky toe, heel).",
      drill: "Add subtle dumbbell resistance or pause work to challenge endurance.",
    });
  }

  const headline =
    avgQualityScore >= 80
      ? `Strong, Consistent Squat Mechanics (${avgQualityScore}/100 Quality Score)`
      : avgQualityScore >= 65
      ? `Solid Foundation with Actionable Depth & Tempo Opportunities`
      : `Promising Movement Session — Focus on Controlled Depth`;

  const summary = `You completed ${totalReps} squat repetitions with an average depth of ${avgDepthAngle}° and average quality score of ${avgQualityScore}/100. Your eccentric descent averaged ${avgDescentSec}s and concentric ascent averaged ${avgAscentSec}s. With attention to steady hip tracking and consistent depth, your movement quality will continue to elevate.`;

  return {
    headline,
    summary,
    strengths,
    top_fixes,
    confidence: per_rep_metrics.length >= 3 ? "high" : "medium",
    limitations,
    sourceModel: "Rule-based fallback",
  };
}
