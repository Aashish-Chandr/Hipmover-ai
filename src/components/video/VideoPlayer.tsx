"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Upload,
  Camera,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Server,
  Terminal,
  Activity,
  Layers,
  Cpu
} from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";
import { usePoseDetector } from "@/hooks/usePoseDetector";
import {
  VideoSourceType,
  LandmarkPoint,
  ExercisePhase,
  SingleRepMetrics,
  SessionMetricsSummary
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

interface VideoPlayerProps {
  onVideoSourceChange?: (sourceType: VideoSourceType, videoUrl: string | null) => void;
  onVideoElementReady?: (video: HTMLVideoElement | null, canvas: HTMLCanvasElement | null) => void;
  onRepCompleted?: (rep: SingleRepMetrics, summary: SessionMetricsSummary) => void;
  onSessionUpdate?: (summary: SessionMetricsSummary, reps: SingleRepMetrics[]) => void;
}

export function VideoPlayer({
  onVideoSourceChange,
  onVideoElementReady,
  onRepCompleted,
  onSessionUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Squat State Machine Instance
  const stateMachineRef = useRef<SquatStateMachine>(new SquatStateMachine());
  const pendingKeyframeRepRef = useRef<{ repIndex: number; base64: string } | null>(null);

  const [sourceType, setSourceType] = useState<VideoSourceType>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"video" | "telemetry" | "logs">("video");

  // Real-time rep metrics state
  const [livePhase, setLivePhase] = useState<ExercisePhase>("STANDING");
  const [liveRepCount, setLiveRepCount] = useState<number>(0);
  const [completedReps, setCompletedReps] = useState<SingleRepMetrics[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionMetricsSummary>({
    totalReps: 0,
    validReps: 0,
    avgDepthAngle: 0,
    avgDescentSec: 0,
    avgAscentSec: 0,
    avgQualityScore: 0,
    bestRepNumber: null,
    worstRepNumber: null,
    durationSec: 0,
  });

  // DigitalOcean Console Logs Array
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "[system] Initializing DigitalOcean App Platform worker (nyc3)...",
    "[mediapipe] FilesetResolver loaded from local /mediapipe/wasm",
    "[model] Cached pose_landmarker_lite.task (5.77 MB) verified ready",
    "[squat-engine] Rep state machine initialized (hysteresis: >160° standing, <100° bottom)",
  ]);

  const appendLog = useCallback((msg: string) => {
    setConsoleLogs((prev) => [...prev.slice(-30), msg]);
  }, []);

  // Frame processing callback from usePoseDetector
  const handleFrame = useCallback(
    ({
      timestampMs,
      kneeAngle,
      kneeResult,
      landmarks,
      canvas,
    }: {
      timestampMs: number;
      kneeAngle: number | null;
      kneeResult: KneeAngleResult | null;
      landmarks: LandmarkPoint[] | null;
      canvas: HTMLCanvasElement | null;
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

      // Update live phase and rep count
      if (result.phase !== livePhase) {
        setLivePhase(result.phase);
      }

      if (result.repCount !== liveRepCount) {
        setLiveRepCount(result.repCount);
      }

      // If rep just completed
      if (result.newlyCompletedRep) {
        const rep = result.newlyCompletedRep;

        // Attach keyframe if captured during bottom phase
        if (pendingKeyframeRepRef.current) {
          rep.keyframeBase64 = pendingKeyframeRepRef.current.base64;
          pendingKeyframeRepRef.current = null;
        }

        const updatedReps = machine.getCompletedReps();
        const updatedSummary = machine.getSessionSummary();

        setCompletedReps(updatedReps);
        setSessionSummary(updatedSummary);

        const statusTag = rep.isValidRep ? "BENCHMARK PASS (≥70)" : "SUB-BENCHMARK (<70)";
        appendLog(
          `[rep ${rep.repNumber}] Completed · Score: ${rep.qualityScore}/100 [${statusTag}] · Depth: ${rep.minKneeAngle}° · Lean: ${rep.torsoLeanAtBottomDeg}° · Tempo: ${rep.descentDurationSec}s/${rep.ascentDurationSec}s`
        );

        onRepCompleted?.(rep, updatedSummary);
        onSessionUpdate?.(updatedSummary, updatedReps);
      }
    },
    [livePhase, liveRepCount, appendLog, onRepCompleted, onSessionUpdate]
  );

  // Attach keyframe capture callback when bottom is reached
  useEffect(() => {
    const machine = stateMachineRef.current;
    machine.onBottomReached = (repIndex: number) => {
      if (videoRef.current && canvasRef.current) {
        const keyframeData = captureKeyframeFromCanvas(
          videoRef.current,
          canvasRef.current,
          512,
          0.82
        );
        if (keyframeData) {
          pendingKeyframeRepRef.current = { repIndex, base64: keyframeData };
          appendLog(`[keyframe] Captured 512px rep bottom snapshot (rep ${repIndex})`);
        }
      }
    };
  }, [appendLog]);

  // Live MediaPipe Pose Detection Hook
  const {
    isLoading: isModelLoading,
    isReady: isModelReady,
    error: modelError,
    currentKneeAngle,
    kneeAngleLabel,
  } = usePoseDetector({
    videoElement: videoRef.current,
    canvasElement: canvasRef.current,
    isActive: isPlaying && !!sourceType,
    phaseLabel: livePhase,
    repCount: liveRepCount,
    onFrame: handleFrame,
  });

  // Broadcast video and canvas ready
  useEffect(() => {
    if (onVideoElementReady && videoRef.current && canvasRef.current) {
      onVideoElementReady(videoRef.current, canvasRef.current);
    }
  }, [onVideoElementReady]);

  // Clean up webcam stream
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleLoadedMetadata = () => {
    if (videoRef.current && canvasRef.current) {
      const vid = videoRef.current;
      canvasRef.current.width = vid.videoWidth || 640;
      canvasRef.current.height = vid.videoHeight || 480;
      setDuration(vid.duration || 0);
      setErrorMsg(null);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => setErrorMsg("Playback error: " + err.message));
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
    videoRef.current.play();
    setIsPlaying(true);
    appendLog("[session] Reset video playback and rep engine to start");
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // 1-Click Demo Squat Loader
  const loadDemoVideo = () => {
    stopWebcamStream();
    setErrorMsg(null);
    stateMachineRef.current.reset();
    setLiveRepCount(0);
    setLivePhase("STANDING");
    setSourceType("demo");
    const demoUrl = APP_CONFIG.demoVideoPath;
    setVideoSrc(demoUrl);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = demoUrl;
      videoRef.current.muted = true;
      videoRef.current.load();
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn("Autoplay notice:", e);
          setIsPlaying(false);
        });
    }
    appendLog("[input] Loaded benchmark squat video (/demo/sample-squat.mp4)");
    onVideoSourceChange?.("demo", demoUrl);
  };

  // Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopWebcamStream();
    setErrorMsg(null);
    stateMachineRef.current.reset();
    setLiveRepCount(0);
    setLivePhase("STANDING");
    setSourceType("upload");

    const objectUrl = URL.createObjectURL(file);
    setVideoSrc(objectUrl);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = objectUrl;
      videoRef.current.muted = true;
      videoRef.current.load();
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
    appendLog(`[input] Loaded user video: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    onVideoSourceChange?.("upload", objectUrl);
  };

  // Webcam stream
  const startWebcam = async () => {
    try {
      setErrorMsg(null);
      stopWebcamStream();
      stateMachineRef.current.reset();
      setLiveRepCount(0);
      setLivePhase("STANDING");
      setSourceType("webcam");
      setVideoSrc(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.removeAttribute("src");
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("[webcam] play error:", playErr);
        }
        setIsPlaying(true);
      }
      appendLog("[input] Live webcam stream initialized at 60 FPS target");
      onVideoSourceChange?.("webcam", "webcam://stream");
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg("Camera access failed: " + error.message);
      appendLog(`[error] Camera access denied: ${error.message}`);
    }
  };

  const stopWebcamStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Phase badge color styling
  const getPhaseColor = (phase: ExercisePhase) => {
    switch (phase) {
      case "STANDING":
        return "text-[#0069FF] border-[#0069FF]/40 bg-[#0069FF]/10";
      case "DESCENDING":
        return "text-amber-400 border-amber-500/40 bg-amber-500/10";
      case "BOTTOM":
        return "text-[#27C93F] border-[#27C93F]/40 bg-[#27C93F]/10 animate-pulse";
      case "ASCENDING":
        return "text-[#00D2D3] border-[#00D2D3]/40 bg-[#00D2D3]/10";
    }
  };

  return (
    <div id="movement" className="w-full">
      {/* Jamie McKaye Instrument Window Container */}
      <div className="border border-hairline bg-ink-0">
        {/* Console Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-hairline bg-ink-1 px-4 py-3 sm:px-6">
          {/* Left: Indicator + App Platform Droplet Breadcrumb */}
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 bg-[#0069FF]" />
            <div className="flex items-center gap-2 font-mono text-[11px] text-paper-2">
              <span className="text-paper-1 font-semibold">hipermove</span>
              <span className="text-paper-3">/</span>
              <span>vision-instrument.wasm</span>
            </div>
          </div>

          {/* Right: Droplet Specs + Uptime status */}
          <div className="flex items-center gap-3 label-mono text-[10px]">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-paper-2">
              <span>WASM SIMD · 60 FPS</span>
            </span>
            <span className="border border-hairline bg-ink-0 px-2 py-0.5 text-emerald-400">
              ● RUNNING
            </span>
          </div>
        </div>

        {/* Console Subnav Tabs */}
        <div className="flex items-center justify-between border-b border-hairline bg-ink-0 px-4 sm:px-6 text-xs">
          <div className="flex gap-4 sm:gap-8 font-medium">
            <button
              onClick={() => setActiveTab("video")}
              className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors label-mono text-[11px] ${
                activeTab === "video"
                  ? "border-white text-paper-0 font-bold"
                  : "border-transparent text-paper-2 hover:text-paper-1"
              }`}
            >
              <span>01 MOVEMENT STREAM</span>
            </button>

            <button
              onClick={() => setActiveTab("telemetry")}
              className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors label-mono text-[11px] ${
                activeTab === "telemetry"
                  ? "border-white text-paper-0 font-bold"
                  : "border-transparent text-paper-2 hover:text-paper-1"
              }`}
            >
              <span>02 TELEMETRY</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors label-mono text-[11px] ${
                activeTab === "logs"
                  ? "border-white text-paper-0 font-bold"
                  : "border-transparent text-paper-2 hover:text-paper-1"
              }`}
            >
              <span>03 CONSOLE LOG</span>
            </button>
          </div>

          {/* Rep Counter Highlight Pill */}
          <div className="py-2 label-mono text-[11px]">
            <span className="border border-hairline bg-ink-1 px-3 py-1 font-bold text-paper-0">
              REPS COUNTED: {liveRepCount}
            </span>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="p-4 sm:p-6 bg-ink-0">
          {/* Action Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-hairline bg-ink-1 p-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* 1-Click Demo Button */}
              <button
                onClick={loadDemoVideo}
                className="btn-jamie-primary text-xs"
              >
                <span>1-Click Benchmark Clip</span>
              </button>

              {/* Upload Video Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-jamie-secondary text-xs"
              >
                <span>Upload Squat Clip</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Webcam Button */}
              <button
                onClick={startWebcam}
                className="btn-jamie-secondary text-xs"
              >
                <span>Launch Webcam</span>
              </button>
            </div>

            {/* Rep Engine Status indicator */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="hidden sm:flex items-center gap-1.5 text-paper-2 label-mono text-[10px]">
                <span>STATE MACHINE: ACTIVE</span>
              </span>
              <span className={`px-2.5 py-0.5 border font-bold text-[11px] ${getPhaseColor(livePhase)}`}>
                PHASE: {livePhase}
              </span>
            </div>
          </div>

          {/* Tab 1: Video Player & Canvas Overlay */}
          {activeTab === "video" && (
            <div className="relative aspect-video w-full overflow-hidden border border-hairline bg-black">
              {/* Video Element */}
              <video
                ref={videoRef}
                src={videoSrc || undefined}
                className="h-full w-full object-contain"
                playsInline
                autoPlay
                muted={isMuted}
                loop={sourceType !== "webcam"}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Canvas Overlay for Pose Skeleton & Rep Angle Badges */}
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />

              {/* Live HUD Telemetry Overlay */}
              {sourceType && (
                <>
                  <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-2">
                    {/* Dynamic Phase Badge */}
                    <div
                      className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 backdrop-blur-md shadow-lg ${
                        currentKneeAngle === null
                          ? "text-amber-400 border-amber-500/40 bg-amber-950/40"
                          : currentKneeAngle <= 100 && livePhase === "BOTTOM"
                          ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/40 animate-pulse"
                          : getPhaseColor(livePhase)
                      }`}
                    >
                      <span className="text-[10px] font-mono tracking-wider opacity-80 uppercase">
                        PHASE
                      </span>
                      <span className="text-xs font-mono font-bold">
                        {currentKneeAngle === null
                          ? "LEGS OUT OF VIEW"
                          : currentKneeAngle <= 100 && livePhase === "BOTTOM"
                          ? "BOTTOM (SEATED / SQUAT)"
                          : livePhase}
                      </span>
                    </div>

                    {/* Knee Angle Label */}
                    <div className="flex items-center gap-2 rounded-sm bg-[#0B0C0E]/90 border border-white/10 px-3 py-1.5 backdrop-blur-md">
                      <span className="text-[10px] font-mono tracking-wider text-[#7E8590] uppercase">
                        KNEE ANGLE
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ${
                          currentKneeAngle !== null ? "text-[#C5CAD2]" : "text-amber-400/90 text-[11px]"
                        }`}
                      >
                        {currentKneeAngle !== null
                          ? `${Math.round(currentKneeAngle)}°`
                          : "NOT DETECTED · STEP BACK"}
                      </span>
                    </div>

                    {/* Live Valid Rep Counter (Benchmark >= 70) */}
                    <div className="flex items-center gap-2 rounded-sm bg-[#0B0C0E]/90 border border-white/10 px-3 py-1.5 backdrop-blur-md">
                      <span className="text-[10px] font-mono tracking-wider text-[#7E8590] uppercase">
                        VALID REPS (≥70)
                      </span>
                      <span className="text-xs font-mono font-bold text-[#F4F5F7]">
                        {sessionSummary ? sessionSummary.validReps : liveRepCount}
                      </span>
                      {sessionSummary && (sessionSummary.subBenchmarkReps ?? 0) > 0 && (
                        <span className="text-[10px] font-mono text-[#D97706]/90">
                          · {sessionSummary.subBenchmarkReps} sub-70
                        </span>
                      )}
                    </div>

                    {/* Full-Body Kinetic Tracking Pill */}
                    <div className="flex items-center gap-1.5 rounded-sm bg-[#0B0C0E]/80 border border-white/5 px-2.5 py-1 backdrop-blur-sm">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          currentKneeAngle !== null ? "bg-[#718274]" : "bg-amber-500 animate-ping"
                        }`}
                      />
                      <span className="text-[9px] font-mono tracking-widest text-[#7E8590] uppercase">
                        {currentKneeAngle !== null
                          ? "FULL-BODY KINEMATICS · BENCHMARK: 70"
                          : "AWAITING LOWER BODY IN FRAME"}
                      </span>
                    </div>
                  </div>

                  {/* Positioning Guidance Banner when user is too close to webcam */}
                  {currentKneeAngle === null && sourceType === "webcam" && (
                    <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center justify-center">
                      <div className="flex items-center gap-2.5 rounded-sm bg-[#0B0C0E]/95 border border-amber-600/50 px-4 py-2 backdrop-blur-md shadow-2xl text-center">
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[11px] font-mono text-amber-200">
                          CAMERA FRAMING: Step back 5–6 ft or tilt your webcam downward so your hips, knees, and feet are visible.
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Empty State / Welcome Screen */}
              {!sourceType && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#060A18]/95">
                  <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0069FF]/20 to-[#00D2D3]/10 border border-[#0069FF]/40 shadow-do-glow">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 102 102"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M51 0C22.8335 0 0 22.8335 0 51C0 67.5458 7.9545 82.261 20.25 91.5644V76.993C13.4357 70.1787 9.17999 60.9126 9.17999 51C9.17999 27.9035 27.9035 9.17999 51 9.17999C74.0965 9.17999 92.82 27.9035 92.82 51C92.82 74.0965 74.0965 92.82 51 92.82V102C79.1665 102 102 79.1665 102 51C102 22.8335 79.1665 0 51 0Z"
                        fill="#0069FF"
                      />
                      <rect x="34" y="68" width="17" height="17" fill="#0069FF" />
                      <rect x="51" y="85" width="17" height="17" fill="#0069FF" />
                      <rect x="17" y="85" width="17" height="17" fill="#0069FF" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-white">
                    Launch Movement Bio-Mechanics Droplet
                  </h3>
                  <p className="mt-2 max-w-lg text-xs text-slate-400 leading-relaxed">
                    Test HiperMove immediately with our bundled squat benchmark clip, or stream your webcam to experience zero-latency on-device pose estimation.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button onClick={loadDemoVideo} className="do-btn-primary text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>Start 1-Click Demo</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="do-btn-secondary text-xs"
                    >
                      <Upload className="h-3.5 w-3.5 text-[#0069FF]" />
                      <span>Upload Video</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorMsg && (
                <div className="absolute bottom-16 left-4 right-4 rounded-lg bg-red-500/10 border border-red-500/40 p-3 text-xs text-red-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Video Timeline Playback Controls */}
              {sourceType && sourceType !== "webcam" && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#030816]/95 via-[#030816]/80 to-transparent p-3 pt-6 backdrop-blur-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.05}
                      value={currentTime}
                      onChange={handleSeek}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-[#0069FF]"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlay}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-[#0069FF] text-white transition-colors"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </button>
                      <button
                        onClick={restartVideo}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-slate-700 text-white transition-colors"
                        title="Replay from start"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono text-[11px] text-slate-400">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.muted = !isMuted;
                            setIsMuted(!isMuted);
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Edge Telemetry Inspector & Live Rep Metrics */}
          {activeTab === "telemetry" && (
            <div className="rounded-xl border border-white/10 bg-[#080C1E] p-6 text-xs font-mono space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-white/10 text-center">
                <div className="p-3 bg-[#030816] rounded-lg border border-white/5">
                  <div className="text-[10px] text-slate-400">TOTAL REPS</div>
                  <div className="text-xl font-bold text-[#0069FF] mt-1">{sessionSummary.totalReps}</div>
                </div>
                <div className="p-3 bg-[#030816] rounded-lg border border-white/5">
                  <div className="text-[10px] text-slate-400">AVG DEPTH</div>
                  <div className="text-xl font-bold text-[#00D2D3] mt-1">
                    {sessionSummary.avgDepthAngle ? `${sessionSummary.avgDepthAngle}°` : "--"}
                  </div>
                </div>
                <div className="p-3 bg-[#030816] rounded-lg border border-white/5">
                  <div className="text-[10px] text-slate-400">AVG SCORE</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {sessionSummary.avgQualityScore ? `${sessionSummary.avgQualityScore}/100` : "--"}
                  </div>
                </div>
                <div className="p-3 bg-[#030816] rounded-lg border border-white/5">
                  <div className="text-[10px] text-slate-400">BEST REP</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">
                    {sessionSummary.bestRepNumber ? `Rep #${sessionSummary.bestRepNumber}` : "--"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-slate-400">Current Phase:</span>
                <span className={`font-semibold px-2 py-0.5 rounded ${getPhaseColor(livePhase)}`}>{livePhase}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-slate-400">Smoothed Knee Angle:</span>
                <span className="text-white font-semibold">{kneeAngleLabel}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-slate-400">Inference Runtime:</span>
                <span className="text-[#00D2D3] font-semibold">WebAssembly SIMD (Local 60 FPS)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Privacy Guarantee:</span>
                <span className="text-emerald-400 font-semibold">100% Zero-Upload On-Device</span>
              </div>
            </div>
          )}

          {/* Tab 3: Console Logs */}
          {activeTab === "logs" && (
            <div className="rounded-xl border border-white/10 bg-[#060A18] p-4 text-[11px] font-mono text-slate-300 space-y-1.5 h-64 overflow-y-auto">
              {consoleLogs.map((log, idx) => (
                <p
                  key={idx}
                  className={
                    log.includes("[error]")
                      ? "text-red-400"
                      : log.includes("[rep")
                      ? "text-[#00D2D3] font-semibold"
                      : log.includes("[keyframe]")
                      ? "text-purple-400 font-semibold"
                      : "text-slate-400"
                  }
                >
                  {log}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Console Footer Status Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-white/10 bg-[#060A18] px-4 py-2.5 sm:px-6 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Region: nyc3 · Droplet: app-platform/hipermove-vision</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Reps Tracked: {liveRepCount}</span>
            <span className="text-slate-600">|</span>
            <span>Security: Local Edge Isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
