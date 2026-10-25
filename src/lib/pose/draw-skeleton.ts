import { LandmarkPoint } from "../types";
import { KneeAngleResult } from "../squat/angle";

// MediaPipe 33 pose landmark connections
export const POSE_CONNECTIONS: [number, number][] = [
  // Face / Head
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  // Shoulders & Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Arms
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Legs (Lower Body)
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

export interface DrawSkeletonOptions {
  kneeAngleResult?: KneeAngleResult | null;
  phaseLabel?: string;
  repCount?: number;
  currentScore?: number | null;
  valgusRatio?: number | null;
  heelLiftDelta?: number | null;
  headTiltDeg?: number | null;
}

/**
 * 7 Anatomical Landmark Groups - Distinct, Non-Bright, Crisp & Highly Visible:
 * 1. Head (0-8): Muted Sky Slate (#93C5FD, stroke #1E3A8A)
 * 2. Shoulders (11-12): Pure Platinum White (#F3F4F6, stroke #111827)
 * 3. Hips / Pelvis (23-24): Muted Warm Titanium (#FCD34D, stroke #78350F)
 * 4. Knees (25-26): Muted Emerald Sage (#6EE7B7, stroke #064E3B)
 * 5. Ankles (27-28): Muted Lilac Quartz (#C4B5FD, stroke #4C1D95)
 * 6. Heels (29-30): Muted Coral Rust (#FCA5A5, stroke #7F1D1D)
 * 7. Toes (31-32): Crisp Silver Pewter (#E2E8F0, stroke #334155)
 * 8. Arms / Wrists (13-22): Crisp Muted Silver (#CBD5E1, stroke #1E293B)
 */
function getLandmarkColor(idx: number): { fill: string; stroke: string; radius: number } {
  // Head (0-8: nose, eyes, ears)
  if (idx <= 8) {
    return { fill: "#93C5FD", stroke: "#0F172A", radius: 5.5 };
  }
  // Mouth (9-10)
  if (idx === 9 || idx === 10) {
    return { fill: "#93C5FD", stroke: "#0F172A", radius: 4.5 };
  }
  // Shoulders (11-12)
  if (idx === 11 || idx === 12) {
    return { fill: "#F3F4F6", stroke: "#0B0C0E", radius: 7.5 };
  }
  // Arms / Elbows / Wrists (13-22)
  if (idx >= 13 && idx <= 22) {
    return { fill: "#CBD5E1", stroke: "#0B0C0E", radius: 6.0 };
  }
  // Hips (23-24)
  if (idx === 23 || idx === 24) {
    return { fill: "#FCD34D", stroke: "#0B0C0E", radius: 7.5 };
  }
  // Knees (25-26)
  if (idx === 25 || idx === 26) {
    return { fill: "#6EE7B7", stroke: "#0B0C0E", radius: 8.5 };
  }
  // Ankles (27-28)
  if (idx === 27 || idx === 28) {
    return { fill: "#C4B5FD", stroke: "#0B0C0E", radius: 7.5 };
  }
  // Heels (29-30)
  if (idx === 29 || idx === 30) {
    return { fill: "#FCA5A5", stroke: "#0B0C0E", radius: 6.5 };
  }
  // Toes (31-32)
  if (idx === 31 || idx === 32) {
    return { fill: "#E2E8F0", stroke: "#0B0C0E", radius: 6.5 };
  }
  return { fill: "#94A3B8", stroke: "#0B0C0E", radius: 5.0 };
}

function getConnectionStyle(startIdx: number, endIdx: number): { strokeStyle: string; lineWidth: number } {
  // Head connections (0-10)
  if (startIdx <= 10 && endIdx <= 10) {
    return { strokeStyle: "rgba(147, 197, 253, 0.85)", lineWidth: 2.5 };
  }
  // Shoulder line (11-12)
  if (startIdx === 11 && endIdx === 12) {
    return { strokeStyle: "rgba(243, 244, 246, 0.95)", lineWidth: 4.0 };
  }
  // Spine / Torso (11-23, 12-24, 23-24)
  if (
    (startIdx === 11 && endIdx === 23) ||
    (startIdx === 12 && endIdx === 24) ||
    (startIdx === 23 && endIdx === 24)
  ) {
    return { strokeStyle: "rgba(252, 211, 77, 0.85)", lineWidth: 3.5 };
  }
  // Arms (11-13, 13-15, etc.)
  if ((startIdx >= 11 && startIdx <= 22) && (endIdx >= 11 && endIdx <= 22)) {
    return { strokeStyle: "rgba(203, 213, 225, 0.85)", lineWidth: 3.0 };
  }
  // Thighs (23-25, 24-26)
  if ((startIdx === 23 && endIdx === 25) || (startIdx === 24 && endIdx === 26)) {
    return { strokeStyle: "rgba(110, 231, 183, 0.9)", lineWidth: 4.0 };
  }
  // Shins (25-27, 26-28)
  if ((startIdx === 25 && endIdx === 27) || (startIdx === 26 && endIdx === 28)) {
    return { strokeStyle: "rgba(196, 181, 253, 0.9)", lineWidth: 4.0 };
  }
  // Heels & Feet (27-32)
  if (startIdx >= 27 && endIdx >= 27) {
    return { strokeStyle: "rgba(252, 165, 165, 0.85)", lineWidth: 3.0 };
  }
  return { strokeStyle: "rgba(148, 163, 184, 0.75)", lineWidth: 2.5 };
}

// Checks if landmark is visible or in-bounds
function isPointVisible(pt?: LandmarkPoint, isHead: boolean = false): boolean {
  if (!pt) return false;
  if (pt.x < -0.1 || pt.x > 1.1 || pt.y < -0.1 || pt.y > 1.1) return false;

  // MediaPipe often sets low visibility for facial landmarks in Pose Landmarker
  // so we use a very permissive check for head keypoints
  if (isHead) {
    return pt.visibility === undefined || pt.visibility >= 0.05;
  }

  // For body joints, accept anything above 0.2
  return pt.visibility === undefined || pt.visibility >= 0.2;
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkPoint[],
  canvasWidth: number,
  canvasHeight: number,
  options?: DrawSkeletonOptions
): void {
  ctx.save();
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (!landmarks || landmarks.length === 0) {
    ctx.restore();
    return;
  }

  // 1. Draw Connection Lines with distinct group styles
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const p1 = landmarks[startIdx];
    const p2 = landmarks[endIdx];

    const isStartHead = startIdx <= 10;
    const isEndHead = endIdx <= 10;

    if (!isPointVisible(p1, isStartHead) || !isPointVisible(p2, isEndHead)) continue;

    const x1 = p1.x * canvasWidth;
    const y1 = p1.y * canvasHeight;
    const x2 = p2.x * canvasWidth;
    const y2 = p2.y * canvasHeight;

    const style = getConnectionStyle(startIdx, endIdx);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = style.lineWidth;
    ctx.strokeStyle = style.strokeStyle;
    ctx.stroke();
  }

  // 2. Draw Landmark Joints with high-contrast outlines and distinct colors
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    const isHead = i <= 10;
    if (!isPointVisible(pt, isHead)) continue;

    const x = pt.x * canvasWidth;
    const y = pt.y * canvasHeight;

    const style = getLandmarkColor(i);

    // Dark drop ring / contrast border
    ctx.beginPath();
    ctx.arc(x, y, style.radius + 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(11, 12, 14, 0.85)";
    ctx.fill();

    // Solid colored joint circle
    ctx.beginPath();
    ctx.arc(x, y, style.radius, 0, 2 * Math.PI);
    ctx.fillStyle = style.fill;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = style.stroke;
    ctx.stroke();
  }

  // 3. Draw Knee Angle Badge on Active Knee when detected
  const kneeRes = options?.kneeAngleResult;
  if (kneeRes && kneeRes.activeKneePoint) {
    const kx = kneeRes.activeKneePoint.x * canvasWidth;
    const ky = kneeRes.activeKneePoint.y * canvasHeight;

    const roundedAngle = Math.round(kneeRes.angle);
    const labelText = `${roundedAngle}°`;
    ctx.font = "bold 14px ui-monospace, SFMono-Regular, monospace";
    const textMetrics = ctx.measureText(labelText);
    const textWidth = textMetrics.width;

    const boxWidth = textWidth + 22;
    const boxHeight = 28;
    const boxX = Math.min(canvasWidth - boxWidth - 12, Math.max(12, kx + 18));
    const boxY = Math.min(canvasHeight - boxHeight - 12, Math.max(12, ky - 14));

    // Pointer line
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(boxX, boxY + boxHeight / 2);
    ctx.strokeStyle = "rgba(243, 244, 246, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Badge background
    ctx.fillStyle = "rgba(11, 12, 14, 0.95)";
    ctx.strokeStyle = roundedAngle <= 100 ? "#6EE7B7" : "#E2E8F0";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
    ctx.fill();
    ctx.stroke();

    // Badge text
    ctx.fillStyle = roundedAngle <= 100 ? "#6EE7B7" : "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, boxX + boxWidth / 2, boxY + boxHeight / 2);
  }

  // 4. If upper body is detected but lower body is out of view (e.g. sitting at desk)
  // Draw an indicator tag near the neck/shoulders so user knows upper body tracking is active
  if (!kneeRes && landmarks[11] && landmarks[12] && isPointVisible(landmarks[11]) && isPointVisible(landmarks[12])) {
    const midShoulderX = ((landmarks[11].x + landmarks[12].x) / 2) * canvasWidth;
    const midShoulderY = ((landmarks[11].y + landmarks[12].y) / 2) * canvasHeight;

    const tagText = "UPPER BODY TRACKED · STEP BACK 5 FT FOR SQUATS";
    ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    const textMetrics = ctx.measureText(tagText);
    const tagWidth = textMetrics.width + 16;
    const tagHeight = 22;
    const tagX = Math.min(canvasWidth - tagWidth - 10, Math.max(10, midShoulderX - tagWidth / 2));
    const tagY = Math.max(10, midShoulderY - 35);

    ctx.fillStyle = "rgba(11, 12, 14, 0.9)";
    ctx.strokeStyle = "rgba(147, 197, 253, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#93C5FD";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tagText, tagX + tagWidth / 2, tagY + tagHeight / 2);
  }

  ctx.restore();
}
