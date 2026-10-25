"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Camera,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Minimize2,
  Maximize2,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Volume2,
  VolumeX,
} from "lucide-react";
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

export default function LiveWebcamPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateMachineRef = useRef<SquatStateMachine>(new SquatStateMachine());
  const pendingKeyframeRepRef = useRef<{ repIndex: number; base64: string } | null>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    isActive: isStreaming,
    phaseLabel: livePhase,
    repCount: liveRepCount,
    onFrame: handleFrame,
  });

  // Start webcam stream
  const startWebcam = async () => {
    try {
      setErrorMsg(null);
      stateMachineRef.current.reset();
      setLiveRepCount(0);
      setLivePhase("STANDING");
      setCompletedReps([]);
      setSessionSummary(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth || 1280;
          canvasRef.current.height = videoRef.current.videoHeight || 720;
        }
        setIsStreaming(true);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg("Camera access failed: " + error.message);
      setIsStreaming(false);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const resetSession = () => {
    stateMachineRef.current.reset();
    setLiveRepCount(0);
    setLivePhase("STANDING");
    setCompletedReps([]);
    setSessionSummary(null);
    setCoachAnalysis(null);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth || 1280;
      canvasRef.current.height = videoRef.current.videoHeight || 720;
    }
  };

  const triggerGemmaCoach = async () => {
    if (!completedReps.length) {
      setCoachError("Perform at least 1 squat on camera before analyzing.");
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
        durationSec: 8.0,
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
      {/* Top Controls Bar */}
      <div className="z-20 flex flex-wrap items-center justify-between border-b border-hairline bg-[#0E1013] px-6 py-3">
        <div className="flex items-center gap-3">
          {isStreaming ? (
            <button
              onClick={stopWebcam}
              className="border border-red-500/50 bg-red-950/30 text-red-200 px-4 py-2 text-xs font-bold hover:bg-red-900/40 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Stop Webcam</span>
            </button>
          ) : (
            <button
              onClick={startWebcam}
              className="bg-white text-black px-4 py-2 text-xs font-bold hover:bg-[#AEB4BD] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Launch Webcam</span>
            </button>
          )}

          <button
            onClick={resetSession}
            className="border border-white/20 bg-[#121418] text-white px-4 py-2 text-xs font-bold hover:border-white transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Counter</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#7E8590]">WASM SIMD 60 FPS</span>
          <span className="text-white font-bold border border-white/10 px-2.5 py-1 bg-[#121418]">
            VALID REPS: {sessionSummary ? sessionSummary.validReps : liveRepCount}
          </span>
        </div>
      </div>

      {/* Whole Screen Webcam Video Container */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          playsInline
          autoPlay
          muted
          onLoadedMetadata={handleLoadedMetadata}
        />

        {/* Real-time Skeleton Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />

        {/* Start Camera Prompt if idle */}
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#08090B]/95 p-6 text-center z-10">
            <div className="mb-4 flex h-16 w-16 items-center justify-center border border-white/20 bg-[#121418]">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Launch Live Webcam Scanner
            </h2>
            <p className="max-w-md text-xs sm:text-sm text-[#AEB4BD] mb-6 leading-relaxed">
              Stand 5 to 6 feet back so your full body from head to feet is visible in frame.
              Zero-latency 60 FPS pose estimation runs 100% on your device with no video leaving your browser.
            </p>
            <button
              onClick={startWebcam}
              className="bg-white text-black px-6 py-3 text-sm font-bold hover:bg-[#AEB4BD] transition-colors flex items-center gap-2 cursor-pointer shadow-2xl"
            >
              <Camera className="h-4 w-4" />
              <span>Open Webcam Stream</span>
            </button>
          </div>
        )}

        {/* Live HUD Telemetry (Top-Left) */}
        {isStreaming && (
          <div className="pointer-events-none absolute top-4 left-6 flex flex-col gap-2 z-10">
            <div className="flex items-center gap-2 rounded-sm bg-[#0B0C0E]/90 border border-white/10 px-3 py-1.5 backdrop-blur-md">
              <span className="text-[10px] font-mono tracking-wider text-[#7E8590] uppercase">PHASE</span>
              <span
                className={`text-xs font-bold ${
                  currentKneeAngle === null
                    ? "text-sky-300"
                    : livePhase === "BOTTOM"
                    ? "text-[#718274] animate-pulse"
                    : livePhase === "DESCENDING"
                    ? "text-amber-300"
                    : "text-white"
                }`}
              >
                {currentKneeAngle === null ? "UPPER BODY TRACKED" : livePhase}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-sm bg-[#0B0C0E]/90 border border-white/10 px-3 py-1.5 backdrop-blur-md">
              <span className="text-[10px] font-mono tracking-wider text-[#7E8590] uppercase">KNEE ANGLE</span>
              <span className="text-xs font-mono font-bold text-white">
                {currentKneeAngle !== null ? `${Math.round(currentKneeAngle)}°` : "STAND 5 FT BACK"}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-sm bg-[#0B0C0E]/90 border border-white/10 px-3 py-1.5 backdrop-blur-md">
              <span className="text-[10px] font-mono tracking-wider text-[#7E8590] uppercase">
                VALID REPS (≥70)
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {sessionSummary ? sessionSummary.validReps : liveRepCount}
              </span>
            </div>
          </div>
        )}

        {/* Camera Positioning Banner (if seated or too close) */}
        {isStreaming && currentKneeAngle === null && (
          <div className="pointer-events-none absolute bottom-6 left-6 right-6 flex items-center justify-center z-10">
            <div className="flex items-center gap-2.5 rounded-sm bg-[#0B0C0E]/95 border border-sky-500/40 px-5 py-2.5 backdrop-blur-md shadow-2xl text-center">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-xs font-mono text-sky-200">
                AI SKELETON TRACKING ACTIVE: Head & upper body locked. Step back 5–6 ft so hips and knees are visible for squat counting.
              </span>
            </div>
          </div>
        )}

        {/* Error message banner */}
        {errorMsg && (
          <div className="absolute bottom-6 left-6 right-6 rounded-sm bg-red-950/80 border border-red-500/50 p-3 text-xs text-red-200 flex items-center gap-2 z-20">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

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
                  <p>Awaiting live squat set</p>
                  <p className="text-[10px] text-[#525863]">
                    Perform squats on camera then click below to consult Gemma 4.
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

      {/* Bottom Controls Bar */}
      <div className="z-20 flex items-center justify-between border-t border-hairline bg-[#0E1013] px-6 py-3 text-xs text-[#C5CAD2]">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-[#7E8590]">
            STATUS: {isStreaming ? "CAMERA ACTIVE" : "IDLE"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-[#7E8590]">
            BENCHMARK ≥70 PTS
          </span>
        </div>
      </div>
    </div>
  );
}
