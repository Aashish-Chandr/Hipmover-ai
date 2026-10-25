"use client";

import React from "react";
import { SingleRepMetrics } from "@/lib/types";

interface RepTableProps {
  reps: SingleRepMetrics[];
  onSelectRep?: (repNumber: number) => void;
}

export function RepTable({ reps }: RepTableProps) {
  if (!reps || reps.length === 0) {
    return (
      <div className="border border-hairline bg-ink-0 p-8 text-center text-paper-2 label-mono text-xs">
        NO REPETITIONS RECORDED YET · EXECUTE SQUAT BENCHMARK TO POPULATE TABLE
      </div>
    );
  }

  return (
    <div className="border border-hairline bg-ink-0">
      <div className="border-b border-hairline px-6 py-4 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="label-mono text-[10px] text-chrome-mid mb-0.5">PER-REP TELEMETRY</p>
          <h4 className="text-[15px] font-semibold text-paper-0">
            Repetition Biomechanical Breakdown
          </h4>
        </div>
        <p className="label-mono text-[11px] text-paper-2">
          {reps.length} {reps.length === 1 ? "REP" : "REPS"} RECORDED
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[12px] font-mono">
          <thead>
            <tr className="border-b border-hairline bg-ink-1 text-paper-2 text-[10px] uppercase tracking-wider">
              <th className="py-3 px-6 font-semibold">Rep #</th>
              <th className="py-3 px-6 font-semibold">Min Depth</th>
              <th className="py-3 px-6 font-semibold">Torso Lean</th>
              <th className="py-3 px-6 font-semibold">Knee Tracking</th>
              <th className="py-3 px-6 font-semibold">Heels</th>
              <th className="py-3 px-6 font-semibold">Tempo</th>
              <th className="py-3 px-6 font-semibold text-right">Full-Body Score</th>
              <th className="py-3 px-6 font-semibold text-right">Benchmark (≥70)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {reps.map((rep) => {
              const tempoRatio =
                rep.ascentDurationSec > 0
                  ? (rep.descentDurationSec / rep.ascentDurationSec).toFixed(1)
                  : "1.0";
              const isParallel = rep.minKneeAngle <= 100;
              const isPassing = rep.isValidRep || rep.qualityScore >= 70;
              const valgusText = rep.valgusRatioAtBottom
                ? rep.valgusRatioAtBottom >= 0.90
                  ? "NEUTRAL"
                  : "MEDIAL CAVE"
                : "STABLE";
              const heelText =
                rep.heelLiftDeltaAtBottom && rep.heelLiftDeltaAtBottom > 0.03
                  ? "LIFTED"
                  : "GROUNDED";

              return (
                <tr
                  key={rep.repNumber}
                  className="hover:bg-ink-1/60 transition-colors"
                >
                  <td className="py-3.5 px-6 font-bold text-paper-0">
                    #{rep.repNumber.toString().padStart(2, "0")}
                  </td>

                  <td className="py-3.5 px-6">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold border ${
                        rep.minKneeAngle <= 90
                          ? "bg-stone-800 border-stone-600 text-[#C5CAD2]"
                          : rep.minKneeAngle <= 100
                          ? "bg-neutral-800 border-neutral-600 text-[#C5CAD2]"
                          : "bg-amber-950/40 border-amber-800/40 text-amber-300"
                      }`}
                    >
                      {Math.round(rep.minKneeAngle)}°
                    </span>
                  </td>

                  <td className="py-3.5 px-6 text-paper-1">
                    {Math.round(rep.torsoLeanAtBottomDeg)}°
                  </td>

                  <td className="py-3.5 px-6">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 border ${
                        valgusText === "NEUTRAL" || valgusText === "STABLE"
                          ? "border-[#718274]/50 text-[#C5CAD2] bg-[#718274]/10"
                          : "border-amber-700/50 text-amber-300 bg-amber-950/30"
                      }`}
                    >
                      {valgusText}
                    </span>
                  </td>

                  <td className="py-3.5 px-6">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 border ${
                        heelText === "GROUNDED"
                          ? "border-[#8A879E]/50 text-[#C5CAD2] bg-[#8A879E]/10"
                          : "border-amber-700/50 text-amber-300 bg-amber-950/30"
                      }`}
                    >
                      {heelText}
                    </span>
                  </td>

                  <td className="py-3.5 px-6 text-paper-2">
                    {tempoRatio}:1 ({rep.descentDurationSec.toFixed(1)}s/{rep.ascentDurationSec.toFixed(1)}s)
                  </td>

                  <td className="py-3.5 px-6 text-right font-bold">
                    <span
                      className={
                        isPassing ? "text-[#C5CAD2]" : "text-amber-400"
                      }
                    >
                      {rep.qualityScore}
                    </span>
                    <span className="text-paper-2 text-[10px]"> / 100</span>
                  </td>

                  <td className="py-3.5 px-6 text-right">
                    <span
                      className={`label-mono text-[9px] px-2 py-0.5 border ${
                        isPassing
                          ? "border-[#718274]/60 text-[#C5CAD2] bg-[#718274]/15"
                          : "border-amber-600/50 text-amber-400 bg-amber-950/20"
                      }`}
                    >
                      {isPassing ? "PASS (≥70)" : "SUB-BENCHMARK"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
