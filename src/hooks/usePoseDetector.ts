"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { getPoseLandmarker } from "@/lib/pose/mediapipe-loader";
import { drawSkeleton } from "@/lib/pose/draw-skeleton";
import { extractKneeAngle, KneeAngleResult } from "@/lib/squat/angle";
import { LandmarkPoint } from "@/lib/types";

// Module-level global monotonic timestamp counter for the singleton MediaPipe C++ WASM runtime
// This guarantees detectForVideo NEVER receives a decreasing timestamp, even across loops or video switches
let globalMonotonicTimestamp = 1000;

interface UsePoseDetectorProps {
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
  isActive: boolean;
  phaseLabel?: string;
  repCount?: number;
  onFrame?: (data: {
    timestampMs: number;
    kneeAngle: number | null;
    kneeResult: KneeAngleResult | null;
    landmarks: LandmarkPoint[] | null;
    canvas: HTMLCanvasElement | null;
  }) => void;
}

export function usePoseDetector({
  videoElement,
  canvasElement,
  isActive,
  phaseLabel,
  repCount = 0,
  onFrame,
}: UsePoseDetectorProps) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastObservedVideoTimeRef = useRef<number>(-1);
  const lastFrameProcessTimeRef = useRef<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentKneeAngle, setCurrentKneeAngle] = useState<number | null>(null);
  const [detectedLandmarks, setDetectedLandmarks] = useState<LandmarkPoint[] | null>(null);

  // 1. Initialize PoseLandmarker once
  useEffect(() => {
    let isCancelled = false;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);
        const landmarker = await getPoseLandmarker();
        if (!isCancelled) {
          landmarkerRef.current = landmarker;
          setIsReady(true);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const e = err as Error;
          console.error("[usePoseDetector] Init error:", e);
          setError("Failed to initialize pose landmarker: " + e.message);
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Detection Loop
  const processFrame = useCallback(() => {
    const video = videoElement;
    const canvas = canvasElement;
    const landmarker = landmarkerRef.current;

    if (!isActive || !video || !canvas || !landmarker || video.paused || video.ended) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const isWebcam = Boolean(video.srcObject);
    const now = performance.now();

    // Check if new frame is ready to process
    let isNewFrame = false;
    if (isWebcam) {
      if (now - lastFrameProcessTimeRef.current >= 15) { // Target ~60 FPS
        isNewFrame = true;
      }
    } else {
      if (video.currentTime !== lastObservedVideoTimeRef.current) {
        isNewFrame = true;
        lastObservedVideoTimeRef.current = video.currentTime;
      }
    }

    if (isNewFrame && video.readyState >= 2 && video.videoWidth > 0) {
      lastFrameProcessTimeRef.current = now;

      // Advance global monotonic integer timestamp (never decreases, even across loops/switches)
      const targetTime = Math.round(now);
      globalMonotonicTimestamp = Math.max(targetTime, globalMonotonicTimestamp + 1);
      const detectionTimestamp = globalMonotonicTimestamp;

      try {
        // Sync canvas internal resolution with video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          const results = landmarker.detectForVideo(video, detectionTimestamp);
          const firstPose = results.landmarks?.[0];

          if (firstPose && firstPose.length > 0) {
            const landmarks: LandmarkPoint[] = firstPose.map((pt) => ({
              x: pt.x,
              y: pt.y,
              z: pt.z,
              visibility: pt.visibility,
            }));

            // Extract knee angle
            const kneeRes = extractKneeAngle(landmarks);
            const angleVal = kneeRes ? kneeRes.angle : null;

            setCurrentKneeAngle(angleVal);
            setDetectedLandmarks(landmarks);

            // Draw skeleton & HUD on canvas
            drawSkeleton(ctx, landmarks, canvas.width, canvas.height, {
              kneeAngleResult: kneeRes,
              phaseLabel,
              repCount,
            });

            // Notify parent listener (e.g. rep state machine)
            const repTimestampMs = isWebcam ? now : video.currentTime * 1000;
            onFrame?.({
              timestampMs: repTimestampMs,
              kneeAngle: angleVal,
              kneeResult: kneeRes,
              landmarks,
              canvas,
            });
          } else {
            // No pose detected in this frame: clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setCurrentKneeAngle(null);
            setDetectedLandmarks(null);
          }
        }
      } catch (err) {
        console.warn("[usePoseDetector] Frame detection warning:", err);
      }
    }

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [isActive, videoElement, canvasElement, phaseLabel, repCount, onFrame]);

  // 3. Start/Stop frame loop when active state changes
  useEffect(() => {
    if (isActive && isReady) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    } else {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      // Clear canvas if deactivated
      if (canvasElement) {
        const ctx = canvasElement.getContext("2d");
        ctx?.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }
    }

    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isActive, isReady, processFrame, canvasElement]);

  return {
    isLoading,
    isReady,
    error,
    currentKneeAngle,
    kneeAngleLabel: currentKneeAngle !== null ? `${Math.round(currentKneeAngle)}°` : "--",
    detectedLandmarks,
  };
}
