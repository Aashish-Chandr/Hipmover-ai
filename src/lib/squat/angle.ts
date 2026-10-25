import { LandmarkPoint } from "../types";

/**
 * Calculates the interior angle in degrees at vertex B formed by points A-B-C.
 * Returns angle in degrees [0, 180].
 */
export function calculateAngle(
  a: LandmarkPoint,
  b: LandmarkPoint,
  c: LandmarkPoint
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return Math.round(angle * 10) / 10;
}

/**
 * MediaPipe landmark indices for lower body:
 * 11: Left Shoulder, 12: Right Shoulder
 * 23: Left Hip,      24: Right Hip
 * 25: Left Knee,     26: Right Knee
 * 27: Left Ankle,    28: Right Ankle
 */
export const LANDMARK_INDEX = {
  // Head & Cervical (0-8)
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  // Shoulders & Chest (11-12)
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  // Hips & Pelvis (23-24)
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  // Knees (25-26)
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  // Ankles (27-28)
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  // Heels (29-30)
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  // Toes / Foot Index (31-32)
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export interface KneeAngleResult {
  angle: number;
  side: "left" | "right" | "both";
  confidence: number;
  leftAngle?: number;
  rightAngle?: number;
  activeKneePoint?: LandmarkPoint;
}

/**
 * Computes knee angle = angle(hip, knee, ankle).
 * Evaluates visibility; uses more-visible side, or averages both if visibility is close.
 */
export function extractKneeAngle(
  landmarks: LandmarkPoint[]
): KneeAngleResult | null {
  if (!landmarks || landmarks.length < 29) {
    return null;
  }

  const leftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const leftKnee = landmarks[LANDMARK_INDEX.LEFT_KNEE];
  const leftAnkle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];

  const rightHip = landmarks[LANDMARK_INDEX.RIGHT_HIP];
  const rightKnee = landmarks[LANDMARK_INDEX.RIGHT_KNEE];
  const rightAnkle = landmarks[LANDMARK_INDEX.RIGHT_ANKLE];

  const leftVis =
    ((leftHip?.visibility ?? 0) +
      (leftKnee?.visibility ?? 0) +
      (leftAnkle?.visibility ?? 0)) /
    3;

  const rightVis =
    ((rightHip?.visibility ?? 0) +
      (rightKnee?.visibility ?? 0) +
      (rightAnkle?.visibility ?? 0)) /
    3;

  const minThreshold = 0.4;
  const leftValid = leftVis >= minThreshold;
  const rightValid = rightVis >= minThreshold;

  if (!leftValid && !rightValid) {
    return null;
  }

  let leftAngle: number | undefined;
  if (leftValid) {
    leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  }

  let rightAngle: number | undefined;
  if (rightValid) {
    rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  }

  // If both are visible and within similar confidence, average them
  if (leftValid && rightValid && leftAngle !== undefined && rightAngle !== undefined) {
    if (Math.abs(leftVis - rightVis) < 0.2) {
      const avgAngle = Math.round(((leftAngle + rightAngle) / 2) * 10) / 10;
      return {
        angle: avgAngle,
        side: "both",
        confidence: (leftVis + rightVis) / 2,
        leftAngle,
        rightAngle,
        activeKneePoint: leftVis >= rightVis ? leftKnee : rightKnee,
      };
    }
  }

  // Otherwise return the more visible side
  if (leftValid && (!rightValid || leftVis > rightVis) && leftAngle !== undefined) {
    return {
      angle: leftAngle,
      side: "left",
      confidence: leftVis,
      leftAngle,
      activeKneePoint: leftKnee,
    };
  }

  if (rightValid && rightAngle !== undefined) {
    return {
      angle: rightAngle,
      side: "right",
      confidence: rightVis,
      rightAngle,
      activeKneePoint: rightKnee,
    };
  }

  return null;
}

/**
 * Computes torso lean relative to vertical axis (0° = straight vertical upright).
 */
export function extractTorsoLean(
  landmarks: LandmarkPoint[]
): number | null {
  if (!landmarks || landmarks.length < 25) return null;

  const leftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const rightHip = landmarks[LANDMARK_INDEX.RIGHT_HIP];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;

  // Midpoint shoulder and hip
  const midShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
  const midHip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  };

  const dx = midShoulder.x - midHip.x;
  const dy = midHip.y - midShoulder.y; // inverted Y in screen coords

  const radians = Math.atan2(Math.abs(dx), Math.max(dy, 0.001));
  const degrees = (radians * 180.0) / Math.PI;

  return Math.round(degrees * 10) / 10;
}

/**
 * Computes head / cervical spine tilt relative to vertical neck axis (0° = neutral upright gaze).
 */
export function extractHeadTilt(
  landmarks: LandmarkPoint[]
): number | null {
  if (!landmarks || landmarks.length < 13) return null;

  const nose = landmarks[LANDMARK_INDEX.NOSE];
  const leftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];

  if (!nose || !leftShoulder || !rightShoulder) return null;

  const midShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };

  const dx = nose.x - midShoulder.x;
  const dy = midShoulder.y - nose.y;

  const radians = Math.atan2(Math.abs(dx), Math.max(dy, 0.001));
  const degrees = (radians * 180.0) / Math.PI;

  return Math.round(degrees * 10) / 10;
}

/**
 * Computes Knee Valgus ratio = knee width / ankle width in frontal plane.
 * Ratio >= 0.90 indicates stable knee tracking over ankles.
 * Ratio < 0.80 indicates inward knee cave (valgus collapse).
 * Returns 1.0 (neutral) if side-view makes frontal separation unreliable.
 */
export function extractKneeValgusRatio(
  landmarks: LandmarkPoint[]
): number | null {
  if (!landmarks || landmarks.length < 29) return null;

  const leftKnee = landmarks[LANDMARK_INDEX.LEFT_KNEE];
  const rightKnee = landmarks[LANDMARK_INDEX.RIGHT_KNEE];
  const leftAnkle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];
  const rightAnkle = landmarks[LANDMARK_INDEX.RIGHT_ANKLE];

  if (!leftKnee || !rightKnee || !leftAnkle || !rightAnkle) return null;

  const kneeVis = ((leftKnee.visibility ?? 1) + (rightKnee.visibility ?? 1)) / 2;
  const ankleVis = ((leftAnkle.visibility ?? 1) + (rightAnkle.visibility ?? 1)) / 2;

  // If one side is occluded (pure profile view), return 1.0 (neutral baseline)
  if (kneeVis < 0.4 || ankleVis < 0.4) {
    return 1.0;
  }

  const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
  const ankleWidth = Math.abs(leftAnkle.x - rightAnkle.x);

  if (ankleWidth < 0.04) {
    // Narrow stance or profile view
    return 1.0;
  }

  const ratio = Math.round((kneeWidth / ankleWidth) * 100) / 100;
  return ratio;
}

/**
 * Computes heel elevation relative to toes (dorsiflexion restriction).
 * In image coordinates (Y increases downward), if heel is lifted off floor,
 * y(heel) < y(toe).
 * Returns positive value in normalized coordinates if heel is elevated.
 */
export function extractHeelGrounding(
  landmarks: LandmarkPoint[]
): number | null {
  if (!landmarks || landmarks.length < 33) return null;

  const leftHeel = landmarks[LANDMARK_INDEX.LEFT_HEEL];
  const rightHeel = landmarks[LANDMARK_INDEX.RIGHT_HEEL];
  const leftToe = landmarks[LANDMARK_INDEX.LEFT_FOOT_INDEX];
  const rightToe = landmarks[LANDMARK_INDEX.RIGHT_FOOT_INDEX];

  if (!leftHeel || !rightHeel || !leftToe || !rightToe) return null;

  const leftDelta = (leftToe.y - leftHeel.y);
  const rightDelta = (rightToe.y - rightHeel.y);

  // Return the maximum heel lift detected across either foot
  const maxLift = Math.max(0, leftDelta, rightDelta);
  return Math.round(maxLift * 1000) / 1000;
}

export interface FullBodyKinematics {
  kneeAngle: KneeAngleResult | null;
  torsoLeanDeg: number | null;
  headTiltDeg: number | null;
  valgusRatio: number | null;
  heelLiftDelta: number | null;
}

/**
 * Extracts all 5 full-body movement features in a single call.
 */
export function extractFullBodyKinematics(
  landmarks: LandmarkPoint[]
): FullBodyKinematics {
  return {
    kneeAngle: extractKneeAngle(landmarks),
    torsoLeanDeg: extractTorsoLean(landmarks),
    headTiltDeg: extractHeadTilt(landmarks),
    valgusRatio: extractKneeValgusRatio(landmarks),
    heelLiftDelta: extractHeelGrounding(landmarks),
  };
}

