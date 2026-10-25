"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Upload,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Minimize2,
  Maximize2,
  CheckCircle2,
  Activity,
  Volume2,
  VolumeX,
} from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";
import { usePoseDetector } from "@/hooks/usePoseDetector";
import {
  SingleRepMetrics,
  SessionMetricsSummary,
  AICoachResponse,
  LandmarkPoint,
  ExercisePhase,
} from "@/lib/types";
import {
  KneeAngleResult,
  extractTorsoLean,
  extractHeadTilt,
  extractKneeValgusRatio,
  extractHeelGrounding,
} from "@/lib/squat/angle";
import { SquatStateMachine } from "@/lib/squat/state-machine";
import { captureKeyframeFromCanvas } from "@/lib/squat/keyframe";

export default function UploadStudioPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stateMachineRef = useRef<SquatStateMachine>(new SquatStateMachine());
  const pendingKeyframeRepRef = useRef<{ repIndex: number; base64: string } | null>(null);

  const [videoSrc, setVideoSrc] = useState<string>(APP_CONFIG.demoVideoPath);
  const [videoTitle, setVideoTitle] = useState<string>("1-Click Benchmark Squat Clip");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [livePhase, setLivePhase] = useState<ExercisePhase>("STANDING");
  const [liveRepCount, setLiveRepCount] = useState<number>(0);

  const [completedReps, setCompletedReps] = useState<SingleRepMetrics[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionMetricsSummary | null>(null);

  // Gemma 4 Hover Card State (floating top-right with minimize toggle)
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [coachAnalysis, setCoachAnalysis] = useState<AICoachResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [coachError, setCoachError] = useState<string | null>(null);

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

      if (result.phase !== livePhase) setLivePhase(result.phase);
      if (result.repCount !== liveRepCount) setLiveRepCount(result.repCount);

      if (result.newlyCompletedRep) {
        const rep = result.newlyCompletedRep;
        if (pendingKeyframeRepRef.current) {
          rep.keyframeBase64 = pendingKeyframeRepRef.current.base64;
          pendingKeyframeRepRef.current = null;
        }

        const updatedReps = machine.getCompletedReps();
        const updatedSummary = machine.getSessionSummary();
        setCompletedReps(updatedReps);
        setSessionSummary(updatedSummary);
      }
    },
    [livePhase, liveRepCount]
  );

  useEffect(() => {
    const machine = stateMachineRef.current;
    machine.onBottomReached = (repIndex: number) => {
      if (videoRef.current && canvasRef.current) {
        const keyframeData = captureKeyframeFromCanvas(videoRef.current, canvasRef.current, 512, 0.82);
        if (keyframeData) {
          pendingKeyframeRepRef.current = { repIndex, base64: keyframeData };
        }
      }
    };
  }, []);

  const { currentKneeAngle, kneeAngleLabel } = usePoseDetector({
    videoElement: videoRef.current,
    canvasElement: canvasRef.current,
    isActive: isPlaying,
    phaseLabel: livePhase,
    repCount: liveRepCount,
    onFrame: handleFrame,
  });

  const loadBenchmarkClip = () => {
    stateMachineRef.current.reset();
    setLiveRepCount(0);
    setLivePhase("STANDING");
    setCompletedReps([]);
    setSessionSummary(null);
    setCoachAnalysis(null);
    setVideoTitle("1-Click Benchmark Squat Clip");
    setVideoSrc(APP_CONFIG.demoVideoPath);

    if (videoRef.current) {
      videoRef.current.src = APP_CONFIG.demoVideoPath;
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stateMachineRef.current.reset();
    setLiveRepCount(0);
    setLivePhase("STANDING");
    setCompletedReps([]);
    setSessionSummary(null);
    setCoachAnalysis(null);

    const objectUrl = URL.createObjectURL(file);
    setVideoTitle(file.name);
    setVideoSrc(objectUrl);

    if (videoRef.current) {
      videoRef.current.src = objectUrl;
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
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

  const triggerGemmaCoach = async () => {
    if (!completedReps.length) {
      setCoachError("Play the video to record at least 1 repetition before analyzing.");
      return;
    }
    setCoachError(null);
    setIsAnalyzing(true);

    try {
      const summaryPayload = sessionSummary || {
        totalReps: completedReps.length,
        validReps: completedReps.filter((r) => r.isValidRep).length,
        avgDepthAngle: Math.round(completedReps.reduce((a, b) => a + b.minKneeAngle, 0) / completedReps.length),
        avgDescentSec: 1.2,
        avgAscentSec: 1.0,
        avgQualityScore: Math.round(completedReps.reduce((a, b) => a + b.qualityScore, 0) / completedReps.length),
        bestRepNumber: 1,
        worstRepNumber: completedReps.length,
        durationSec: 6.0,
      };

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics_summary: summaryPayload,
          per_rep_metrics: completedReps,
          best_rep_image_base64: completedReps[0]?.keyframeBase64,
          worst_rep_image_base64: completedReps[completedReps.length - 1]?.keyframeBase64,
        }),
      });

      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
      const data: AICoachResponse = await res.json();
      setCoachAnalysis(data);
      setIsMinimized(false);
    } catch (err: unknown) {
      const error = err as Error;
      setCoachError(error.message || "Failed to contact coach service");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-65px)] w-full bg-[#08090B] font-poppins flex flex-col">
      {/* Top Controls Bar: Side-by-side 1-Click Benchmark and Upload Option */}
      <div className="z-20 flex flex-wrap items-center justify-between border-b border-hairline bg-[#0E1013] px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={loadBenchmarkClip}
            className="bg-white text-black px-4 py-2 text-xs font-bold hover:bg-[#AEB4BD] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-black" />
            <span>1-Click Benchmark Video</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="border border-white/20 bg-[#121418] text-white px-4 py-2 text-xs font-bold hover:border-white transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Squat Video</span>
          </button>

          <span className="hidden sm:inline font-mono text-xs text-[#7E8590] ml-2">
            Active: <span className="text-white font-medium">{videoTitle}</span>
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#7E8590]">WASM SIMD 60 FPS</span>
          <span className="text-white font-bold border border-white/10 px-2.5 py-1 bg-[#121418]">
            VALID REPS: {sessionSummary ? sessionSummary.validReps : liveRepCount}
          </span>
        </div>
      </div>

      {/* Whole Screen Video Container */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src={videoSrc}
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

        {/* Live HUD Telemetry (Top-Left) */}
        <div className="pointer-events-none absolute top-4 left-6 flex flex-col gap-2 z-10">
          <div className="flex items-center gap-2 rounded-sm bg-[#0B0C0E]/90 border border-white/10 px-3 py-1.5 backdrop-blur-md">
            <span className="text-[10px] font-mono tracking-wider text-[#7E8590] uppercase">PHASE</span>
            <span className="text-xs font-bold text-white">{livePhase}</span>
          </div>

          <div className="flex items-center gap-2 rounded-sm bg-[#0B0C0E]/90 border border-white/10 px-3 py-1.5 backdrop-blur-md">
            <span className="text-[10px] font-mono tracking-wider text-[#7E8590] uppercase">KNEE ANGLE</span>
            <span className="text-xs font-mono font-bold text-white">
              {kneeAngleLabel || (currentKneeAngle ? `${Math.round(currentKneeAngle)}°` : "--")}
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* GEMMA 4 ANALYSIS CARD — HOVERING OVER THE TOP ON THE RIGHT SIDE    */}
        {/* WITH MINIMIZE / EXPAND TOGGLE OPTION                              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="absolute top-4 right-6 z-30 max-w-sm w-full transition-all duration-200">
          {isMinimized ? (
            /* Minimized Floating Pill */
            <div className="flex items-center justify-end">
              <button
                onClick={() => setIsMinimized(false)}
                className="flex items-center gap-2 bg-[#0B0C0E]/95 border border-white/20 px-4 py-2.5 shadow-2xl backdrop-blur-md text-white hover:border-white transition-all cursor-pointer rounded-sm"
              >
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-xs font-bold">Gemma 4 Analysis</span>
                <Maximize2 className="h-3.5 w-3.5 text-[#7E8590] ml-1" />
              </button>
            </div>
          ) : (
            /* Expanded Floating Analysis Card */
            <div className="border border-white/20 bg-[#0B0C0E]/95 backdrop-blur-xl p-5 shadow-2xl space-y-4 rounded-sm text-xs">
              {/* Header with Minimize Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-white" />
                  <span className="font-bold text-white tracking-wide">Gemma 4 Biomechanics</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="text-[#7E8590] hover:text-white p-1 cursor-pointer transition-colors"
                    title="Minimize"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {coachError && (
                <div className="border border-amber-600/40 bg-amber-950/20 p-2 text-amber-200 text-[11px]">
                  {coachError}
                </div>
              )}

              {coachAnalysis ? (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">{coachAnalysis.headline}</h4>
                    <p className="text-[#C5CAD2] text-[11px] leading-relaxed">{coachAnalysis.summary}</p>
                  </div>

                  {coachAnalysis.strengths?.length > 0 && (
                    <div className="border-t border-white/10 pt-2 space-y-1">
                      <div className="font-mono text-[10px] text-[#7E8590] uppercase">Strengths</div>
                      {coachAnalysis.strengths.map((str, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-[#C5CAD2]">
                          <CheckCircle2 className="h-3 w-3 text-[#718274] shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {coachAnalysis.top_fixes?.length > 0 && (
                    <div className="border-t border-white/10 pt-2 space-y-2">
                      <div className="font-mono text-[10px] text-amber-300 uppercase">Corrective Cues & Drills</div>
                      {coachAnalysis.top_fixes.map((fix, i) => (
                        <div key={i} className="border border-white/10 bg-[#121418] p-2 space-y-1 text-[11px]">
                          <div className="font-bold text-white">{fix.issue}</div>
                          <div className="text-amber-200"><span className="text-[#7E8590]">Cue:</span> {fix.cue}</div>
                          <div className="text-[#AEB4BD]"><span className="text-[#7E8590]">Drill:</span> {fix.drill}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-[#7E8590] space-y-1.5 font-mono text-[11px]">
                  <Activity className="h-5 w-5 mx-auto text-[#7E8590]" />
                  <p>Awaiting video analysis</p>
                  <p className="text-[10px] text-[#525863]">
                    Click below to generate Gemma 4 coaching from recorded reps.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={triggerGemmaCoach}
                disabled={isAnalyzing}
                className="w-full bg-white text-black py-2 text-xs font-bold hover:bg-[#AEB4BD] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 fill-black" />
                <span>{isAnalyzing ? "Analyzing with Gemma 4..." : "Analyze with Gemma 4"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Player Controls */}
      <div className="z-20 flex items-center justify-between border-t border-hairline bg-[#0E1013] px-6 py-3 text-xs text-[#C5CAD2]">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 font-bold text-white hover:text-[#AEB4BD] transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={restartVideo}
            className="flex items-center gap-1.5 text-[#7E8590] hover:text-white transition-colors cursor-pointer"
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
            BENCHMARK ≥70 PTS
          </span>
        </div>
      </div>
    </div>
  );
}
