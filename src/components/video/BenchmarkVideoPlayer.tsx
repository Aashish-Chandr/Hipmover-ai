"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";
import { usePoseDetector } from "@/hooks/usePoseDetector";
import {
  LandmarkPoint,
  ExercisePhase,
  SingleRepMetrics,
  SessionMetricsSummary,
} from "@/lib/types";
import {
  KneeAngleResult,
  extractTorsoLean,
  extractHeadTilt,
  extractKneeValgusRatio,
  extractHeelGrounding,
} from "@/lib/squat/angle";
import { SquatStateMachine } from "@/lib/squat/state-machine";

interface BenchmarkVideoPlayerProps {
  onRepCompleted?: (rep: SingleRepMetrics, summary: SessionMetricsSummary) => void;
  onSessionUpdate?: (summary: SessionMetricsSummary, reps: SingleRepMetrics[]) => void;
}

export function BenchmarkVideoPlayer({
  onRepCompleted,
  onSessionUpdate,
}: BenchmarkVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateMachineRef = useRef<SquatStateMachine>(new SquatStateMachine());

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [livePhase, setLivePhase] = useState<ExercisePhase>("STANDING");
  const [liveRepCount, setLiveRepCount] = useState<number>(0);
  const [sessionSummary, setSessionSummary] = useState<SessionMetricsSummary | null>(null);

  const handleFrame = useCallback(
    ({
      timestampMs,
      kneeAngle,
      kneeResult,
      landmarks,
    }: {
      timestampMs: number;
      kneeAngle: number | null;
      kneeResult: KneeAngleResult | null;
      landmarks: LandmarkPoint[] | null;
    }) => {
      const machine = stateMachineRef.current;
      const torsoLean = landmarks ? extractTorsoLean(landmarks) : null;
      const headTilt = landmarks ? extractHeadTilt(landmarks) : null;
      const valgusRatio = landmarks ? extractKneeValgusRatio(landmarks) : null;
      const heelLiftDelta = landmarks ? extractHeelGrounding(landmarks) : null;
      const visibility = kneeResult?.confidence;

      const result = machine.processFrame({
        timestampMs,
        kneeAngle,
        torsoLean,
        headTilt,
        valgusRatio,
        heelLiftDelta,
        visibility,
      });

      if (result.phase !== livePhase) {
        setLivePhase(result.phase);
      }

      if (result.repCount !== liveRepCount) {
        setLiveRepCount(result.repCount);
      }

      if (result.newlyCompletedRep) {
        const rep = result.newlyCompletedRep;
        const updatedReps = machine.getCompletedReps();
        const updatedSummary = machine.getSessionSummary();
        setSessionSummary(updatedSummary);
        onRepCompleted?.(rep, updatedSummary);
        onSessionUpdate?.(updatedSummary, updatedReps);
      }
    },
    [livePhase, liveRepCount, onRepCompleted, onSessionUpdate]
  );

  const { currentKneeAngle, kneeAngleLabel } = usePoseDetector({
    videoElement: videoRef.current,
    canvasElement: canvasRef.current,
    isActive: isPlaying,
    phaseLabel: livePhase,
    repCount: liveRepCount,
    onFrame: handleFrame,
  });

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    stateMachineRef.current.reset();
    setLiveRepCount(0);
    setLivePhase("STANDING");
    videoRef.current.currentTime = 0;
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth || 1280;
      canvasRef.current.height = videoRef.current.videoHeight || 720;
    }
  };

  return (
    <div className="relative w-full overflow-hidden border border-hairline bg-[#08090B]">
      {/* 16:9 Clean Video Player Container */}
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          src={APP_CONFIG.demoVideoPath}
          className="h-full w-full object-contain"
          playsInline
          autoPlay
          muted={isMuted}
          loop
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Real-time Skeleton Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />

        {/* Live Telemetry HUD Overlay */}
        <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-2 font-poppins">
          {/* Phase Badge */}
          <div className="flex items-center gap-2 rounded-sm bg-[#0B0C0E]/90 border border-white/10 px-3 py-1.5 backdrop-blur-md">
            <span className="text-[10px] font-mono tracking-wider text-[#7E8590] uppercase">
              PHASE
            </span>
            <span
              className={`text-xs font-bold ${
                livePhase === "BOTTOM"
                  ? "text-[#718274] animate-pulse"
                  : livePhase === "DESCENDING"
                  ? "text-amber-300"
                  : "text-white"
              }`}
            >
              {livePhase}
            </span>
          </div>

          {/* Knee Angle */}
          <div className="flex items-center gap-2 rounded-sm bg-[#0B0C0E]/90 border border-white/10 px-3 py-1.5 backdrop-blur-md">
            <span className="text-[10px] font-mono tracking-wider text-[#7E8590] uppercase">
              KNEE ANGLE
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {kneeAngleLabel || (currentKneeAngle ? `${Math.round(currentKneeAngle)}°` : "--")}
            </span>
          </div>

          {/* Valid Rep Counter */}
          <div className="flex items-center gap-2 rounded-sm bg-[#0B0C0E]/90 border border-white/10 px-3 py-1.5 backdrop-blur-md">
            <span className="text-[10px] font-mono tracking-wider text-[#7E8590] uppercase">
              VALID REPS (≥70)
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {sessionSummary ? sessionSummary.validReps : liveRepCount}
            </span>
          </div>
        </div>

        {/* Click-to-Play Overlay if paused */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer backdrop-blur-[2px] transition-opacity"
          >
            <div className="flex items-center gap-3 rounded-full bg-white px-6 py-3 font-semibold text-black shadow-2xl hover:scale-105 transition-transform">
              <Play className="h-5 w-5 fill-black" />
              <span className="text-sm">Click to Play Benchmark</span>
            </div>
          </div>
        )}
      </div>

      {/* Clean Bottom Player Controls Bar */}
      <div className="flex items-center justify-between border-t border-hairline bg-[#0E1013] px-5 py-3 font-poppins text-xs text-[#C5CAD2]">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 font-semibold text-white hover:text-[#AEB4BD] transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Play Benchmark</span>
              </>
            )}
          </button>

          <button
            onClick={restartVideo}
            className="flex items-center gap-1.5 text-[#7E8590] hover:text-white transition-colors cursor-pointer ml-3"
            title="Restart clip"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restart</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-[#7E8590] hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="font-mono text-[11px] text-[#7E8590]">
            60 FPS · 33 KEYPOINTS (WASM)
          </span>
        </div>
      </div>
    </div>
  );
}
