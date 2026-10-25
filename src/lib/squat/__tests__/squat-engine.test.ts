import { describe, it, expect, beforeEach } from "vitest";
import { calculateAngle, extractKneeAngle } from "../angle";
import { SquatStateMachine } from "../state-machine";
import { computeRepQualityScore } from "../quality";
import { LandmarkPoint } from "../../types";

describe("HiperMove Squat Biomechanics Engine", () => {
  describe("1. Pure Angle Math", () => {
    it("correctly computes 180° for a straight joint alignment", () => {
      const a = { x: 0, y: 0 };
      const b = { x: 0, y: 1 };
      const c = { x: 0, y: 2 };
      const angle = calculateAngle(a, b, c);
      expect(angle).toBe(180);
    });

    it("correctly computes 90° for a perpendicular right angle", () => {
      const a = { x: 0, y: 1 };
      const b = { x: 0, y: 0 };
      const c = { x: 1, y: 0 };
      const angle = calculateAngle(a, b, c);
      expect(angle).toBe(90);
    });

    it("correctly computes 45° acute angle", () => {
      const a = { x: 0, y: 1 };
      const b = { x: 0, y: 0 };
      const c = { x: 1, y: 1 };
      const angle = calculateAngle(a, b, c);
      expect(Math.round(angle)).toBe(45);
    });
  });

  describe("2. Quality Score Computation", () => {
    it("verifies exponential moving average (EMA) smoothing behavior", () => {
      const smoothingMachine = new SquatStateMachine({ emaAlpha: 0.25 });
      const r1 = smoothingMachine.processFrame({ timestampMs: 0, kneeAngle: 180 });
      expect(r1.smoothedAngle).toBe(180);

      // Raw sudden drop to 140
      const r2 = smoothingMachine.processFrame({ timestampMs: 100, kneeAngle: 140 });
      // 0.25 * 140 + 0.75 * 180 = 35 + 135 = 170
      expect(r2.smoothedAngle).toBe(170);
    });

    it("awards high quality score for deep squat with good tempo and upright posture", () => {
      const score = computeRepQualityScore(85, 28, 1.8, 1.2);
      expect(score.score).toBeGreaterThanOrEqual(85);
      expect(score.depthScore).toBe(30);
      expect(score.postureScore).toBe(20);
      expect(score.tempoScore).toBe(10);
      expect(score.isValidRep).toBe(true);
    });

    it("penalizes shallow depth, valgus, and rushed tempo, falling below the 70 benchmark", () => {
      const score = computeRepQualityScore(120, 58, 0.4, 0.3, {
        valgusRatio: 0.72, // Inward knee collapse
        heelLiftDelta: 0.05, // Heels lifting
        headTiltDeg: 35, // Looking up/down
      });
      expect(score.score).toBeLessThan(50);
      expect(score.depthScore).toBeLessThan(10);
      expect(score.isValidRep).toBe(false); // Fails 70 benchmark!
    });
  });

  describe("3. Rep State Machine on Synthetic Data", () => {
    let machine: SquatStateMachine;

    beforeEach(() => {
      machine = new SquatStateMachine({
        standingThresholdDeg: 160,
        bottomThresholdDeg: 100,
        minRepDurationSec: 0.8,
        emaAlpha: 1.0, // Direct passthrough for synthetic frame testing
      });
    });

    it("counts a clean, full-depth repetition accurately", () => {
      // 1. Standing phase
      machine.processFrame({ timestampMs: 0, kneeAngle: 170 });
      machine.processFrame({ timestampMs: 200, kneeAngle: 168 });
      expect(machine.getPhase()).toBe("STANDING");

      // 2. Descending phase
      machine.processFrame({ timestampMs: 400, kneeAngle: 145 });
      expect(machine.getPhase()).toBe("DESCENDING");
      machine.processFrame({ timestampMs: 700, kneeAngle: 120 });
      machine.processFrame({ timestampMs: 1000, kneeAngle: 98 });
      expect(machine.getPhase()).toBe("BOTTOM");

      // 3. Bottom inflection
      machine.processFrame({ timestampMs: 1200, kneeAngle: 82, torsoLean: 26 });
      expect(machine.getPhase()).toBe("BOTTOM");

      // 4. Ascending phase
      machine.processFrame({ timestampMs: 1400, kneeAngle: 112 });
      expect(machine.getPhase()).toBe("ASCENDING");
      machine.processFrame({ timestampMs: 1700, kneeAngle: 135 });
      machine.processFrame({ timestampMs: 2000, kneeAngle: 152 });

      // 5. Return to standing (completing 2.0s rep)
      const res = machine.processFrame({ timestampMs: 2200, kneeAngle: 165 });
      expect(res.repCount).toBe(1);
      expect(res.phase).toBe("STANDING");
      expect(res.newlyCompletedRep).not.toBeNull();
      expect(res.newlyCompletedRep?.minKneeAngle).toBeLessThanOrEqual(90);
      expect(res.newlyCompletedRep?.qualityScore).toBeGreaterThanOrEqual(70);
    });

    it("rejects shallow squats that never reach bottom threshold", () => {
      machine.processFrame({ timestampMs: 0, kneeAngle: 170 });
      machine.processFrame({ timestampMs: 300, kneeAngle: 140 }); // descending
      expect(machine.getPhase()).toBe("DESCENDING");

      // Turns around too early at 122° (does not reach 100°)
      machine.processFrame({ timestampMs: 600, kneeAngle: 122 });
      machine.processFrame({ timestampMs: 900, kneeAngle: 140 });
      machine.processFrame({ timestampMs: 1200, kneeAngle: 165 });

      expect(machine.getRepCount()).toBe(0);
      expect(machine.getPhase()).toBe("STANDING");
    });

    it("rejects jitter / micro-oscillations around standing", () => {
      const jitterAngles = [168, 162, 166, 159, 164, 161, 167];
      for (let i = 0; i < jitterAngles.length; i++) {
        machine.processFrame({ timestampMs: i * 200, kneeAngle: jitterAngles[i] });
      }
      expect(machine.getRepCount()).toBe(0);
      expect(machine.getPhase()).toBe("STANDING");
    });

    it("handles occlusion and missing frames gracefully without crashing", () => {
      machine.processFrame({ timestampMs: 0, kneeAngle: 170 });
      machine.processFrame({ timestampMs: 300, kneeAngle: 145 });

      // 2 occluded frames with visibility < 0.5
      machine.processFrame({ timestampMs: 500, kneeAngle: 130, visibility: 0.2 });
      machine.processFrame({ timestampMs: 600, kneeAngle: null });

      // Landmark visibility recovers at bottom
      machine.processFrame({ timestampMs: 800, kneeAngle: 92, visibility: 0.85 });
      expect(machine.getPhase()).toBe("BOTTOM");

      machine.processFrame({ timestampMs: 1200, kneeAngle: 120, visibility: 0.9 });
      machine.processFrame({ timestampMs: 1600, kneeAngle: 166, visibility: 0.95 });

      expect(machine.getRepCount()).toBe(1);
    });

    it("computes accurate session summary and identifies best & worst reps", () => {
      // Rep 1: Great deep rep (80°)
      machine.processFrame({ timestampMs: 0, kneeAngle: 170 });
      machine.processFrame({ timestampMs: 400, kneeAngle: 140 });
      machine.processFrame({ timestampMs: 800, kneeAngle: 80, torsoLean: 20 });
      machine.processFrame({ timestampMs: 1200, kneeAngle: 120 });
      machine.processFrame({ timestampMs: 1600, kneeAngle: 166 });

      // Rep 2: Less optimal rep (98° depth, slower ascent)
      machine.processFrame({ timestampMs: 2000, kneeAngle: 168 });
      machine.processFrame({ timestampMs: 2400, kneeAngle: 140 });
      machine.processFrame({ timestampMs: 2800, kneeAngle: 98, torsoLean: 48 });
      machine.processFrame({ timestampMs: 3300, kneeAngle: 120 });
      machine.processFrame({ timestampMs: 4000, kneeAngle: 166 });

      const summary = machine.getSessionSummary();
      expect(summary.totalReps).toBe(2);
      expect(summary.validReps).toBe(2);
      expect(summary.bestRepNumber).toBe(1);
      expect(summary.worstRepNumber).toBe(2);

      const { bestRep, worstRep } = machine.getBestAndWorstReps();
      expect(bestRep?.repNumber).toBe(1);
      expect(worstRep?.repNumber).toBe(2);
      expect(bestRep!.qualityScore).toBeGreaterThan(worstRep!.qualityScore);
    });
  });
});
