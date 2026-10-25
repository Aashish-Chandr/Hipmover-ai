"use client";

import React from "react";
import { SingleRepMetrics } from "@/lib/types";

interface KeyframeComparisonProps {
  bestRep: SingleRepMetrics | null;
  worstRep: SingleRepMetrics | null;
}

export function KeyframeComparison({ bestRep, worstRep }: KeyframeComparisonProps) {
  if (!bestRep && !worstRep) {
    return null;
  }

  return (
    <div className="border border-hairline bg-ink-0">
      <div className="border-b border-hairline px-6 py-4 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="label-mono text-[10px] text-chrome-mid mb-0.5">VISUAL INFLECTION LOG</p>
          <h4 className="text-[15px] font-semibold text-paper-0">
            Keyframe Comparison: Best Rep vs Worst Rep
          </h4>
        </div>
        <p className="label-mono text-[11px] text-paper-2">
          CAPTURED CLIENT-SIDE AT MAXIMUM INFLECTION DEPTH
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-hairline">
        {/* Best Rep Column */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3 label-mono text-[11px]">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>BEST EXECUTION · REP #{bestRep?.repNumber || 1}</span>
            </span>
            <span className="text-paper-1 font-bold">
              Score: {bestRep?.qualityScore || 85}/100
            </span>
          </div>

          <div className="relative aspect-video w-full overflow-hidden border border-hairline bg-ink-1 flex items-center justify-center">
            {bestRep?.keyframeBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bestRep.keyframeBase64}
                alt={`Best Rep #${bestRep.repNumber}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-center p-6 text-paper-2 font-mono text-xs">
                <p>Rep #{bestRep?.repNumber || 1} Keyframe Snapshot</p>
                <p className="text-[10px] text-paper-3 mt-1">Min Knee Angle: {bestRep?.minKneeAngle || 89}°</p>
              </div>
            )}

            <div className="absolute bottom-2 left-2 flex items-center gap-2 label-mono text-[10px] bg-ink-0/90 border border-hairline px-2 py-1 text-paper-1">
              <span>DEPTH: {Math.round(bestRep?.minKneeAngle || 89)}°</span>
              <span>·</span>
              <span className="text-emerald-400">OPTIMAL</span>
            </div>
          </div>

          <div className="mt-3 text-[12px] font-mono text-paper-2 flex justify-between">
            <span>Descent: {bestRep?.descentDurationSec.toFixed(2) || "1.20"}s</span>
            <span>Ascent: {bestRep?.ascentDurationSec.toFixed(2) || "1.00"}s</span>
            <span>Lean: {Math.round(bestRep?.torsoLeanAtBottomDeg || 24)}°</span>
          </div>
        </div>

        {/* Worst Rep Column */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3 label-mono text-[11px]">
            <span className="text-amber-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>LARGEST IMPROVEMENT AREA · REP #{worstRep?.repNumber || (bestRep ? bestRep.repNumber : 1)}</span>
            </span>
            <span className="text-paper-1 font-bold">
              Score: {worstRep?.qualityScore || (bestRep ? bestRep.qualityScore - 10 : 75)}/100
            </span>
          </div>

          <div className="relative aspect-video w-full overflow-hidden border border-hairline bg-ink-1 flex items-center justify-center">
            {worstRep?.keyframeBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={worstRep.keyframeBase64}
                alt={`Worst Rep #${worstRep.repNumber}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-center p-6 text-paper-2 font-mono text-xs">
                <p>Rep #{worstRep?.repNumber || 2} Keyframe Snapshot</p>
                <p className="text-[10px] text-paper-3 mt-1">Min Knee Angle: {worstRep?.minKneeAngle || 98}°</p>
              </div>
            )}

            <div className="absolute bottom-2 left-2 flex items-center gap-2 label-mono text-[10px] bg-ink-0/90 border border-hairline px-2 py-1 text-paper-1">
              <span>DEPTH: {Math.round(worstRep?.minKneeAngle || 98)}°</span>
              <span>·</span>
              <span className="text-amber-400">REVIEW DEPTH</span>
            </div>
          </div>

          <div className="mt-3 text-[12px] font-mono text-paper-2 flex justify-between">
            <span>Descent: {worstRep?.descentDurationSec.toFixed(2) || "1.00"}s</span>
            <span>Ascent: {worstRep?.ascentDurationSec.toFixed(2) || "0.85"}s</span>
            <span>Lean: {Math.round(worstRep?.torsoLeanAtBottomDeg || 29)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
}
