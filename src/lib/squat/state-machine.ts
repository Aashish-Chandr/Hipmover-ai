import {
  ExercisePhase,
  SingleRepMetrics,
  SessionMetricsSummary,
} from "../types";
import { SQUAT_THRESHOLDS } from "../constants";
import { computeRepQualityScore } from "./quality";

export interface StateMachineConfig {
  standingThresholdDeg?: number;
  bottomThresholdDeg?: number;
  minRepDurationSec?: number;
  emaAlpha?: number;
  minVisibility?: number;
}

export interface FrameInput {
  timestampMs: number;
  kneeAngle: number | null;
  torsoLean?: number | null;
  headTilt?: number | null;
  valgusRatio?: number | null;
  heelLiftDelta?: number | null;
  visibility?: number;
}

export class SquatStateMachine {
  private phase: ExercisePhase = "STANDING";
  private smoothedAngle: number | null = null;
  private repCounter = 0;
  private completedReps: SingleRepMetrics[] = [];

  // Configuration
  private readonly standingThreshold: number;
  private readonly bottomThreshold: number;
  private readonly minRepDurationSec: number;
  private readonly emaAlpha: number;
  private readonly minVisibility: number;

  // Current rep in-flight state
  private repStartTimeMs = 0;
  private bottomTimeMs = 0;
  private minAngleInRep = 180;
  private maxAngleInRep = 0;
  private torsoLeanAtBottom = 25; // default reasonable lean if unmeasured
  private headTiltAtBottom = 12;
  private valgusRatioAtBottom = 1.0;
  private heelLiftDeltaAtBottom = 0.0;
  private isRepInProgress = false;

  // Callbacks
  public onPhaseChange?: (newPhase: ExercisePhase, prevPhase: ExercisePhase) => void;
  public onRepComplete?: (rep: SingleRepMetrics, summary: SessionMetricsSummary) => void;
  public onBottomReached?: (repIndex: number, timestampMs: number, minAngle: number) => void;

  constructor(config?: StateMachineConfig) {
    this.standingThreshold = config?.standingThresholdDeg ?? SQUAT_THRESHOLDS.STANDING_ANGLE_MIN;
    this.bottomThreshold = config?.bottomThresholdDeg ?? SQUAT_THRESHOLDS.BOTTOM_ANGLE_MAX;
    this.minRepDurationSec = config?.minRepDurationSec ?? SQUAT_THRESHOLDS.MIN_REP_DURATION_SEC;
    this.emaAlpha = config?.emaAlpha ?? SQUAT_THRESHOLDS.EMA_ALPHA;
    this.minVisibility = config?.minVisibility ?? SQUAT_THRESHOLDS.MIN_LANDMARK_VISIBILITY;
  }

  public reset(): void {
    this.phase = "STANDING";
    this.smoothedAngle = null;
    this.repCounter = 0;
    this.completedReps = [];
    this.isRepInProgress = false;
    this.repStartTimeMs = 0;
    this.bottomTimeMs = 0;
    this.minAngleInRep = 180;
    this.maxAngleInRep = 0;
    this.torsoLeanAtBottom = 25;
    this.headTiltAtBottom = 12;
    this.valgusRatioAtBottom = 1.0;
    this.heelLiftDeltaAtBottom = 0.0;
  }

  /**
   * Process a single frame through the hysteresis state machine.
   * Returns current phase, smoothed angle, and rep count.
   */
  public processFrame(frame: FrameInput): {
    phase: ExercisePhase;
    smoothedAngle: number | null;
    repCount: number;
    newlyCompletedRep: SingleRepMetrics | null;
  } {
    const { timestampMs, kneeAngle, torsoLean, headTilt, valgusRatio, heelLiftDelta, visibility } = frame;

    // 1. Filter out low visibility or missing frames
    if (kneeAngle === null || (visibility !== undefined && visibility < this.minVisibility)) {
      return {
        phase: this.phase,
        smoothedAngle: this.smoothedAngle,
        repCount: this.repCounter,
        newlyCompletedRep: null,
      };
    }

    // 2. Exponential Moving Average (EMA) smoothing
    if (this.smoothedAngle === null) {
      this.smoothedAngle = kneeAngle;
    } else {
      this.smoothedAngle =
        this.emaAlpha * kneeAngle + (1 - this.emaAlpha) * this.smoothedAngle;
    }

    const currentAngle = Math.round(this.smoothedAngle * 10) / 10;
    const prevPhase = this.phase;
    let newlyCompletedRep: SingleRepMetrics | null = null;

    // Update in-flight angle tracking
    if (this.isRepInProgress) {
      if (currentAngle < this.minAngleInRep) {
        this.minAngleInRep = currentAngle;
        if (torsoLean !== undefined && torsoLean !== null) this.torsoLeanAtBottom = torsoLean;
        if (headTilt !== undefined && headTilt !== null) this.headTiltAtBottom = headTilt;
        if (valgusRatio !== undefined && valgusRatio !== null) this.valgusRatioAtBottom = valgusRatio;
        if (heelLiftDelta !== undefined && heelLiftDelta !== null) this.heelLiftDeltaAtBottom = heelLiftDelta;
      }
      if (currentAngle > this.maxAngleInRep) {
        this.maxAngleInRep = currentAngle;
      }
    }

    // 3. Hysteresis State Machine Transitions
    switch (this.phase) {
      case "STANDING":
        // Athlete begins bending knees below standing threshold (>160° standing)
        if (currentAngle < this.standingThreshold) {
          this.phase = "DESCENDING";
          this.isRepInProgress = true;
          this.repStartTimeMs = timestampMs;
          this.minAngleInRep = currentAngle;
          this.maxAngleInRep = currentAngle;
        }
        break;

      case "DESCENDING":
        // Squat reaches bottom depth threshold
        if (currentAngle <= this.bottomThreshold) {
          this.phase = "BOTTOM";
          this.bottomTimeMs = timestampMs;
          if (torsoLean !== undefined && torsoLean !== null) this.torsoLeanAtBottom = torsoLean;
          if (headTilt !== undefined && headTilt !== null) this.headTiltAtBottom = headTilt;
          if (valgusRatio !== undefined && valgusRatio !== null) this.valgusRatioAtBottom = valgusRatio;
          if (heelLiftDelta !== undefined && heelLiftDelta !== null) this.heelLiftDeltaAtBottom = heelLiftDelta;
          this.onBottomReached?.(this.repCounter + 1, timestampMs, this.minAngleInRep);
        } else if (currentAngle >= this.standingThreshold) {
          // Aborted rep: athlete returned to standing without reaching bottom
          this.phase = "STANDING";
          this.isRepInProgress = false;
        }
        break;

      case "BOTTOM":
        // Keep track of lowest depth achieved at bottom
        if (currentAngle < this.minAngleInRep) {
          this.minAngleInRep = currentAngle;
          this.bottomTimeMs = timestampMs;
          if (torsoLean !== undefined && torsoLean !== null) this.torsoLeanAtBottom = torsoLean;
          if (headTilt !== undefined && headTilt !== null) this.headTiltAtBottom = headTilt;
          if (valgusRatio !== undefined && valgusRatio !== null) this.valgusRatioAtBottom = valgusRatio;
          if (heelLiftDelta !== undefined && heelLiftDelta !== null) this.heelLiftDeltaAtBottom = heelLiftDelta;
        }

        // Athlete begins pushing up out of hole (with 5° hysteresis gap)
        if (currentAngle > this.bottomThreshold + 5) {
          this.phase = "ASCENDING";
        }
        break;

      case "ASCENDING":
        // Keep ascending until knees fully lock / stand up
        if (currentAngle >= this.standingThreshold) {
          // Completed repetition!
          const endTimeMs = timestampMs;
          const totalDurationSec = Math.max(0.1, (endTimeMs - this.repStartTimeMs) / 1000);
          const descentDurationSec = Math.max(0.1, (this.bottomTimeMs - this.repStartTimeMs) / 1000);
          const ascentDurationSec = Math.max(0.1, (endTimeMs - this.bottomTimeMs) / 1000);

          // Verify minimum duration to filter out sensor glitches
          if (totalDurationSec >= this.minRepDurationSec) {
            this.repCounter += 1;

            const quality = computeRepQualityScore(
              this.minAngleInRep,
              this.torsoLeanAtBottom,
              descentDurationSec,
              ascentDurationSec,
              {
                headTiltDeg: this.headTiltAtBottom,
                valgusRatio: this.valgusRatioAtBottom,
                heelLiftDelta: this.heelLiftDeltaAtBottom,
              }
            );

            newlyCompletedRep = {
              repNumber: this.repCounter,
              minKneeAngle: Math.round(this.minAngleInRep),
              maxKneeAngle: Math.round(this.maxAngleInRep),
              descentDurationSec: Math.round(descentDurationSec * 10) / 10,
              ascentDurationSec: Math.round(ascentDurationSec * 10) / 10,
              totalDurationSec: Math.round(totalDurationSec * 10) / 10,
              torsoLeanAtBottomDeg: Math.round(this.torsoLeanAtBottom),
              headTiltAtBottomDeg: Math.round(this.headTiltAtBottom),
              valgusRatioAtBottom: this.valgusRatioAtBottom,
              heelLiftDeltaAtBottom: this.heelLiftDeltaAtBottom,
              qualityScore: quality.score,
              isValidRep: quality.isValidRep,
              notes: quality.notes,
              startTimeSec: Math.round((this.repStartTimeMs / 1000) * 10) / 10,
              bottomTimeSec: Math.round((this.bottomTimeMs / 1000) * 10) / 10,
              endTimeSec: Math.round((endTimeMs / 1000) * 10) / 10,
            };

            this.completedReps.push(newlyCompletedRep);
            this.onRepComplete?.(newlyCompletedRep, this.getSessionSummary());
          }

          // Reset for next repetition
          this.phase = "STANDING";
          this.isRepInProgress = false;
          this.minAngleInRep = 180;
          this.maxAngleInRep = 0;
        } else if (currentAngle <= this.bottomThreshold) {
          // Double bounce / descended again
          this.phase = "BOTTOM";
        }
        break;
    }

    if (this.phase !== prevPhase) {
      this.onPhaseChange?.(this.phase, prevPhase);
    }

    return {
      phase: this.phase,
      smoothedAngle: currentAngle,
      repCount: this.repCounter,
      newlyCompletedRep,
    };
  }

  public getPhase(): ExercisePhase {
    return this.phase;
  }

  public getRepCount(): number {
    return this.repCounter;
  }

  public getCompletedReps(): SingleRepMetrics[] {
    return [...this.completedReps];
  }

  public attachKeyframeToRep(repNumber: number, keyframeBase64: string): void {
    const rep = this.completedReps.find((r) => r.repNumber === repNumber);
    if (rep) {
      rep.keyframeBase64 = keyframeBase64;
    }
  }

  public getSessionSummary(): SessionMetricsSummary {
    const reps = this.completedReps;
    if (reps.length === 0) {
      return {
        totalReps: 0,
        validReps: 0,
        avgDepthAngle: 0,
        avgDescentSec: 0,
        avgAscentSec: 0,
        avgQualityScore: 0,
        bestRepNumber: null,
        worstRepNumber: null,
        durationSec: 0,
      };
    }

    let totalDepth = 0;
    let totalDescent = 0;
    let totalAscent = 0;
    let totalScore = 0;
    let bestScore = -1;
    let worstScore = 999;
    let bestRepNumber: number | null = null;
    let worstRepNumber: number | null = null;

    for (const r of reps) {
      totalDepth += r.minKneeAngle;
      totalDescent += r.descentDurationSec;
      totalAscent += r.ascentDurationSec;
      totalScore += r.qualityScore;

      if (r.qualityScore > bestScore) {
        bestScore = r.qualityScore;
        bestRepNumber = r.repNumber;
      }
      if (r.qualityScore < worstScore) {
        worstScore = r.qualityScore;
        worstRepNumber = r.repNumber;
      }
    }

    const n = reps.length;
    const firstRepStart = reps[0].startTimeSec;
    const lastRepEnd = reps[n - 1].endTimeSec;

    return {
      totalReps: n,
      validReps: reps.filter((r) => r.isValidRep).length,
      subBenchmarkReps: reps.filter((r) => !r.isValidRep).length,
      avgDepthAngle: Math.round((totalDepth / n) * 10) / 10,
      avgDescentSec: Math.round((totalDescent / n) * 10) / 10,
      avgAscentSec: Math.round((totalAscent / n) * 10) / 10,
      avgQualityScore: Math.round(totalScore / n),
      bestRepNumber,
      worstRepNumber,
      durationSec: Math.round((lastRepEnd - firstRepStart) * 10) / 10,
    };
  }

  /**
   * Returns best and worst reps with keyframes for multimodal Gemma 4 coaching
   */
  public getBestAndWorstReps(): {
    bestRep: SingleRepMetrics | null;
    worstRep: SingleRepMetrics | null;
  } {
    const summary = this.getSessionSummary();
    if (!summary.bestRepNumber) return { bestRep: null, worstRep: null };

    const bestRep =
      this.completedReps.find((r) => r.repNumber === summary.bestRepNumber) || null;
    const worstRep =
      this.completedReps.find((r) => r.repNumber === summary.worstRepNumber) || null;

    return { bestRep, worstRep };
  }
}
