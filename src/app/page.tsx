"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2,
  Play,
  Camera,
  Upload,
} from "lucide-react";
import { BenchmarkVideoPlayer } from "@/components/video/BenchmarkVideoPlayer";
import { AngleChart } from "@/components/dashboard/AngleChart";
import { RepTable } from "@/components/dashboard/RepTable";
import { CoachCard } from "@/components/coach/CoachCard";
import {
  SingleRepMetrics,
  SessionMetricsSummary,
  AICoachResponse,
} from "@/lib/types";

const DEFAULT_DEMO_SUMMARY: SessionMetricsSummary = {
  totalReps: 3,
  validReps: 3,
  subBenchmarkReps: 0,
  avgDepthAngle: 92.5,
  avgDescentSec: 1.2,
  avgAscentSec: 1.0,
  avgQualityScore: 84,
  bestRepNumber: 2,
  worstRepNumber: 1,
  durationSec: 6.3,
};

const DEFAULT_DEMO_REPS: SingleRepMetrics[] = [
  {
    repNumber: 1,
    minKneeAngle: 95.0,
    maxKneeAngle: 165.0,
    descentDurationSec: 1.1,
    ascentDurationSec: 0.9,
    totalDurationSec: 2.0,
    torsoLeanAtBottomDeg: 28.0,
    headTiltAtBottomDeg: 12.0,
    valgusRatioAtBottom: 0.94,
    heelLiftDeltaAtBottom: 0.01,
    qualityScore: 81,
    isValidRep: true,
    startTimeSec: 1.0,
    bottomTimeSec: 2.1,
    endTimeSec: 3.0,
  },
  {
    repNumber: 2,
    minKneeAngle: 89.0,
    maxKneeAngle: 168.0,
    descentDurationSec: 1.3,
    ascentDurationSec: 1.1,
    totalDurationSec: 2.4,
    torsoLeanAtBottomDeg: 24.0,
    headTiltAtBottomDeg: 10.0,
    valgusRatioAtBottom: 0.97,
    heelLiftDeltaAtBottom: 0.0,
    qualityScore: 89,
    isValidRep: true,
    startTimeSec: 3.5,
    bottomTimeSec: 4.8,
    endTimeSec: 5.9,
  },
  {
    repNumber: 3,
    minKneeAngle: 93.5,
    maxKneeAngle: 164.0,
    descentDurationSec: 1.2,
    ascentDurationSec: 1.0,
    totalDurationSec: 2.2,
    torsoLeanAtBottomDeg: 26.0,
    headTiltAtBottomDeg: 11.0,
    valgusRatioAtBottom: 0.95,
    heelLiftDeltaAtBottom: 0.01,
    qualityScore: 82,
    isValidRep: true,
    startTimeSec: 6.2,
    bottomTimeSec: 7.4,
    endTimeSec: 8.4,
  },
];

export default function HomePage() {
  const [completedReps, setCompletedReps] = useState<SingleRepMetrics[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionMetricsSummary | null>(null);
  const [coachAnalysis, setCoachAnalysis] = useState<AICoachResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  const activeReps = completedReps.length > 0 ? completedReps : DEFAULT_DEMO_REPS;
  const activeSummary = sessionSummary || DEFAULT_DEMO_SUMMARY;

  const handleRepCompleted = (rep: SingleRepMetrics, summary: SessionMetricsSummary) => {
    setCompletedReps((prev) => [...prev, rep]);
    setSessionSummary(summary);
  };

  const handleSessionUpdate = (summary: SessionMetricsSummary, reps: SingleRepMetrics[]) => {
    setSessionSummary(summary);
    setCompletedReps(reps);
  };

  const triggerCoachAnalysis = async () => {
    setCoachError(null);
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics_summary: activeSummary,
          per_rep_metrics: activeReps,
          best_rep_image_base64: activeReps[0]?.keyframeBase64,
          worst_rep_image_base64: activeReps[activeReps.length - 1]?.keyframeBase64,
        }),
      });

      if (!res.ok) {
        throw new Error(`Coaching request failed with status ${res.status}`);
      }

      const data: AICoachResponse = await res.json();
      setCoachAnalysis(data);
    } catch (err: unknown) {
      const error = err as Error;
      setCoachError(error.message || "Failed to contact coach service");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="font-poppins text-[#C5CAD2] bg-[#0B0C0E]">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION                                                          */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-6 pt-16 pb-12 md:px-10">
        <div className="max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 border border-white/10 bg-[#121418] px-3 py-1 text-xs font-mono text-[#AEB4BD]">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span>SENSORLESS BIOMECHANICS RUNTIME · 60 FPS IN-BROWSER WASM</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
            Movement didn't change. <br />
            <span className="text-[#AEB4BD]">How machines read it multiplied.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#C5CAD2] leading-relaxed max-w-2xl font-normal">
            Zero hardware required. 100% in-browser WebAssembly pose tracking at 60 FPS.
            Paired with Google Gemma 4 multimodal clinical reasoning.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/upload"
              className="bg-white text-black px-6 py-3 text-sm font-bold hover:bg-[#AEB4BD] transition-colors flex items-center gap-2 no-underline"
            >
              <Upload className="h-4 w-4" />
              <span>Go to Upload Studio</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/webcam"
              className="border border-white/20 bg-[#121418] text-white px-6 py-3 text-sm font-bold hover:border-white transition-colors flex items-center gap-2 no-underline"
            >
              <Camera className="h-4 w-4" />
              <span>Open Live Webcam</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. SCORING FORMULA AT THE START OF THE HOME PAGE                           */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-6 py-10 md:px-10 border-t border-hairline">
        <div className="border border-hairline bg-[#121418] p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-4">
            <div>
              <p className="text-[11px] font-mono tracking-widest text-[#7E8590] uppercase mb-1">
                MATHEMATICAL FOUNDATION & SCORING SPECIFICATION
              </p>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                The 100-Point Full-Body Kinematic Formula
              </h2>
            </div>
            <div className="text-xs font-mono text-white border border-white/20 px-3 py-1 bg-[#0B0C0E]">
              VALIDITY BENCHMARK: SCORE ≥ 70
            </div>
          </div>

          {/* Master Equation */}
          <div className="bg-[#0B0C0E] border border-hairline p-5 text-center font-mono text-sm sm:text-base text-white font-semibold overflow-x-auto">
            Score = W<sub>depth</sub>(30) + W<sub>torso</sub>(20) + W<sub>valgus</sub>(15) + W<sub>heel</sub>(15) + W<sub>head</sub>(10) + W<sub>tempo</sub>(10)
          </div>

          {/* 6 Pillars Quick Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
            <div className="border border-hairline bg-[#0B0C0E] p-3 space-y-1">
              <div className="text-[#7E8590] text-[10px]">01 DEPTH</div>
              <div className="font-bold text-white">30 PTS</div>
              <div className="text-[10px] text-[#AEB4BD]">Knee θ ≤ 100°</div>
            </div>

            <div className="border border-hairline bg-[#0B0C0E] p-3 space-y-1">
              <div className="text-[#7E8590] text-[10px]">02 TORSO</div>
              <div className="font-bold text-white">20 PTS</div>
              <div className="text-[10px] text-[#AEB4BD]">Spine φ ≤ 40°</div>
            </div>

            <div className="border border-hairline bg-[#0B0C0E] p-3 space-y-1">
              <div className="text-[#7E8590] text-[10px]">03 VALGUS</div>
              <div className="font-bold text-white">15 PTS</div>
              <div className="text-[10px] text-[#AEB4BD]">Knee Ratio ≥ 0.9</div>
            </div>

            <div className="border border-hairline bg-[#0B0C0E] p-3 space-y-1">
              <div className="text-[#7E8590] text-[10px]">04 HEELS</div>
              <div className="font-bold text-white">15 PTS</div>
              <div className="text-[10px] text-[#AEB4BD]">Ground Flat Δy</div>
            </div>

            <div className="border border-hairline bg-[#0B0C0E] p-3 space-y-1">
              <div className="text-[#7E8590] text-[10px]">05 HEAD</div>
              <div className="font-bold text-white">10 PTS</div>
              <div className="text-[10px] text-[#AEB4BD]">Cervical ≤ 18°</div>
            </div>

            <div className="border border-hairline bg-[#0B0C0E] p-3 space-y-1">
              <div className="text-[#7E8590] text-[10px]">06 TEMPO</div>
              <div className="font-bold text-white">10 PTS</div>
              <div className="text-[10px] text-[#AEB4BD]">Eccentric ≥ 1s</div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. WORKING 1-CLICK BENCHMARK VIDEO CLIP                                    */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-6 py-10 md:px-10 border-t border-hairline">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono tracking-widest text-[#7E8590] uppercase mb-1">
              INTERACTIVE BENCHMARK · 1-CLICK ENGINE TEST
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Working 1-Click Squat Benchmark Video
            </h2>
          </div>
          <span className="text-xs font-mono text-[#AEB4BD]">
            AUTONOMOUS WASM SIMD PIPELINE
          </span>
        </div>

        {/* Clean, distraction-free benchmark video player */}
        <BenchmarkVideoPlayer
          onRepCompleted={handleRepCompleted}
          onSessionUpdate={handleSessionUpdate}
        />
      </section>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. RESULTS DASHBOARD & ANALYSIS DOWN BELOW                                */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-6 py-12 md:px-10 border-t border-hairline space-y-10">
        {/* Continuous Angle Chart */}
        <div className="border border-hairline bg-[#121418] p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-3">
            <div>
              <p className="text-[11px] font-mono tracking-widest text-[#7E8590] uppercase mb-0.5">
                CONTINUOUS KINEMATIC TRACE
              </p>
              <h3 className="text-base font-bold text-white">
                Knee Flexion Angle Curve Over Time
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-[#AEB4BD]">
              <span>STANDING: 160°</span>
              <span className="text-white font-bold">PARALLEL: 100°</span>
            </div>
          </div>
          <AngleChart reps={activeReps} />
        </div>

        {/* Per-Rep Telemetry Breakdown Table */}
        <RepTable reps={activeReps} />

        {/* Gemma 4 Coaching Card */}
        <div className="border border-hairline bg-[#121418] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-3">
            <div>
              <p className="text-[11px] font-mono tracking-widest text-[#7E8590] uppercase mb-0.5">
                MULTIMODAL AI REASONING
              </p>
              <h3 className="text-base font-bold text-white">
                Gemma 4 Biomechanical Coaching Summary
              </h3>
            </div>
            <button
              onClick={triggerCoachAnalysis}
              disabled={isAnalyzing}
              className="bg-white text-black px-5 py-2 text-xs font-bold hover:bg-[#AEB4BD] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isAnalyzing ? "Analyzing with Gemma 4..." : "Analyze with Gemma 4"}</span>
            </button>
          </div>

          <CoachCard
            analysis={coachAnalysis}
            isLoading={isAnalyzing}
            error={coachError}
            onRetry={triggerCoachAnalysis}
          />
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 5. FULL FACTUAL EXPLANATION: "HOW WE ARE DIFFERENT & WHY WE STAND OUT"     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-6 py-16 md:px-10 border-t border-hairline space-y-12">
        <div className="max-w-3xl space-y-3">
          <p className="text-[11px] font-mono tracking-widest text-[#7E8590] uppercase">
            EMPIRICAL COMPARISON & SYSTEM ARCHITECTURE
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Full Explanation: How We Are Different & Why We Stand Out
          </h2>
          <p className="text-sm text-[#C5CAD2] leading-relaxed">
            Existing solutions either require expensive wearable sensors or run heavy 3D-CNNs on server clusters that force
            users to upload private workout footage. HiperMove solves the real-world trade-off with edge WebAssembly and multimodal reasoning.
          </p>
        </div>

        {/* Factual Comparison Matrix Table */}
        <div className="border border-hairline bg-[#121418] overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-hairline bg-[#0B0C0E] text-[#7E8590] text-[10px] uppercase tracking-wider">
                <th className="py-4 px-6 font-bold">Metric / Dimension</th>
                <th className="py-4 px-6 font-bold">Academic Papers (Fitness-AQA / RepNet)</th>
                <th className="py-4 px-6 font-bold">Wearables (WHOOP / Apple Watch)</th>
                <th className="py-4 px-6 font-bold text-white">HiperMove (Our Solution)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              <tr>
                <td className="py-4 px-6 font-bold text-white">Hardware Required</td>
                <td className="py-4 px-6 text-[#7E8590]">Server GPU (NVIDIA A100)</td>
                <td className="py-4 px-6 text-[#7E8590]">Specialized Band / Watch ($300+)</td>
                <td className="py-4 px-6 font-bold text-white">Zero. Standard Camera ($0.00)</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Video Privacy</td>
                <td className="py-4 px-6 text-[#7E8590]">High Risk (Uploads video to cloud)</td>
                <td className="py-4 px-6 text-[#7E8590]">Proprietary cloud database</td>
                <td className="py-4 px-6 font-bold text-white">100% In-Browser (Zero video leaves device)</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Latency & Speed</td>
                <td className="py-4 px-6 text-[#7E8590]">Batch queue (seconds to minutes)</td>
                <td className="py-4 px-6 text-[#7E8590]">Post-workout sync</td>
                <td className="py-4 px-6 font-bold text-white">Real-Time 60 FPS (0 ms video lag)</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Full-Body Scope</td>
                <td className="py-4 px-6 text-[#7E8590]">Black-box classification probability</td>
                <td className="py-4 px-6 text-[#7E8590]">Accelerometers only (No joint angles)</td>
                <td className="py-4 px-6 font-bold text-white">6-Pillar Closed Kinetic Chain (Head to Toe)</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">AI Reasoning</td>
                <td className="py-4 px-6 text-[#7E8590]">Cold labels (e.g. error_04: 0.82)</td>
                <td className="py-4 px-6 text-[#7E8590]">Generic rep counts</td>
                <td className="py-4 px-6 font-bold text-white">Google Gemma 4 Clinical Prescriptions</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Licensing</td>
                <td className="py-4 px-6 text-[#7E8590]">Restricted Non-Commercial</td>
                <td className="py-4 px-6 text-[#7E8590]">Closed Source</td>
                <td className="py-4 px-6 font-bold text-white">100% Permissive Open Source (MIT / Apache 2.0)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4 Architectural Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          <div className="border border-hairline bg-[#121418] p-6 space-y-2">
            <span className="font-mono text-[10px] text-[#7E8590]">PILLAR 01</span>
            <h4 className="text-sm font-bold text-white">WebAssembly 60 FPS Pose</h4>
            <p className="text-[#C5CAD2] leading-relaxed">
              Google MediaPipe Lite extracts 33 3D keypoints directly on device hardware with zero cloud transmission.
            </p>
          </div>

          <div className="border border-hairline bg-[#121418] p-6 space-y-2">
            <span className="font-mono text-[10px] text-[#7E8590]">PILLAR 02</span>
            <h4 className="text-sm font-bold text-white">Hysteresis State Machine</h4>
            <p className="text-[#C5CAD2] leading-relaxed">
              A 4-phase finite state machine with EMA noise filtering prevents false reps and measures exact eccentric/concentric tempo.
            </p>
          </div>

          <div className="border border-hairline bg-[#121418] p-6 space-y-2">
            <span className="font-mono text-[10px] text-[#7E8590]">PILLAR 03</span>
            <h4 className="text-sm font-bold text-white">Hard 70/100 Benchmark</h4>
            <p className="text-[#C5CAD2] leading-relaxed">
              Enforces clinical form quality. Only reps that satisfy depth, torso posture, knee valgus, and heel grounding are counted.
            </p>
          </div>

          <div className="border border-hairline bg-[#121418] p-6 space-y-2">
            <span className="font-mono text-[10px] text-[#7E8590]">PILLAR 04</span>
            <h4 className="text-sm font-bold text-white">Gemma 4 Multimodal Reasoner</h4>
            <p className="text-[#C5CAD2] leading-relaxed">
              Analyzes the quantitative metric ledger plus bottom inflection keyframes to prescribe real-world mobility drills.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
