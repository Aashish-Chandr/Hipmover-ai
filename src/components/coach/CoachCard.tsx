"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Dumbbell,
  RefreshCw,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { AICoachResponse, SingleRepMetrics } from "@/lib/types";

interface CoachCardProps {
  isLoading: boolean;
  coachData: AICoachResponse | null;
  error: string | null;
  bestRep: SingleRepMetrics | null;
  worstRep: SingleRepMetrics | null;
  onRefresh?: () => void;
}

export function CoachCard({
  isLoading,
  coachData,
  error,
  bestRep,
  worstRep,
  onRefresh,
}: CoachCardProps) {
  const [displayedSummary, setDisplayedSummary] = useState<string>("");

  // Typewriter effect for coach summary
  useEffect(() => {
    if (!coachData?.summary) {
      setDisplayedSummary("");
      return;
    }

    const fullText = coachData.summary;
    setDisplayedSummary("");
    let charIndex = 0;

    const interval = setInterval(() => {
      charIndex += 4;
      if (charIndex >= fullText.length) {
        setDisplayedSummary(fullText);
        clearInterval(interval);
      } else {
        setDisplayedSummary(fullText.slice(0, charIndex));
      }
    }, 15);

    return () => clearInterval(interval);
  }, [coachData?.summary]);

  return (
    <div id="coach" className="w-full my-8">
      <div className="border border-hairline bg-ink-0">
        {/* Topline metadata bar */}
        <div className="border-b border-hairline px-6 py-4 flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="h-2 w-2 bg-[#00D2D3]" />
            <p className="label-mono text-[11px] text-chrome-mid">
              GEMMA 4 REASONING ENGINE
            </p>
          </div>

          <div className="flex items-center gap-3 label-mono text-[11px]">
            {coachData && (
              <span className="border border-hairline bg-ink-1 px-2.5 py-1 text-paper-0">
                MODEL: {coachData.sourceModel}
              </span>
            )}
            {coachData && (
              <span className="border border-hairline bg-ink-1 px-2.5 py-1 text-emerald-400">
                CONFIDENCE: {coachData.confidence.toUpperCase()}
              </span>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="border border-hairline px-2.5 py-1 text-paper-1 hover:border-chrome-mid hover:text-white transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                <span>RE-ANALYZE</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="p-8 md:p-12 text-center">
            <div className="mx-auto w-12 h-12 border border-hairline border-t-white animate-spin mb-4" />
            <p className="label-mono text-[11px] text-paper-1 mb-1">
              SYNTHESIZING WITH GEMMA 4 (GOOGLE GEMINI API)...
            </p>
            <p className="text-[13px] text-paper-2 font-mono">
              Feeding 33-joint pose telemetry, bottom inflection keyframes & tempo metrics into LLM
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="p-6 border-b border-hairline bg-red-950/20 text-red-200 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Completed feedback presentation */}
        {coachData && !isLoading && (
          <div className="p-6 md:p-10 space-y-8">
            {/* Headline and typewriter summary */}
            <div>
              <p className="label-mono text-[10px] text-paper-2 mb-2">SESSION ASSESSMENT</p>
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.015em] text-paper-0">
                {coachData.headline}
              </h3>
              <p className="mt-3 text-[15px] sm:text-[16px] leading-relaxed text-paper-1 font-normal max-w-[70ch]">
                {displayedSummary}
              </p>
            </div>

            {/* Strengths Grid */}
            {coachData.strengths && coachData.strengths.length > 0 && (
              <div className="border border-hairline bg-ink-1 p-6">
                <p className="label-mono text-[10px] text-chrome-mid mb-3">OBSERVED STRENGTHS</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px] text-paper-1">
                  {coachData.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 bg-emerald-400 shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Movement Fixes */}
            {coachData.top_fixes && coachData.top_fixes.length > 0 && (
              <div>
                <p className="label-mono text-[10px] text-paper-2 mb-3">PRIORITY MOVEMENT FIXES</p>
                <div className="grid gap-px bg-hairline md:grid-cols-2">
                  {coachData.top_fixes.map((fix, idx) => (
                    <div key={idx} className="bg-ink-0 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="label-mono text-[10px] text-chrome-mid">0{idx + 1}</span>
                          <span className="label-mono text-[10px] text-paper-2">FORM CORRECTION</span>
                        </div>
                        <h4 className="text-[16px] font-semibold text-paper-0 mb-2">
                          {fix.issue}
                        </h4>
                        <p className="text-[12px] font-mono text-paper-2 mb-4 leading-relaxed">
                          Evidence: {fix.evidence_from_metrics}
                        </p>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-hairline text-[12px] font-mono">
                        <div className="flex items-start gap-2 text-paper-1">
                          <span className="text-chrome-mid shrink-0">Cue:</span>
                          <span className="text-white font-medium">{fix.cue}</span>
                        </div>
                        <div className="flex items-start gap-2 text-paper-2">
                          <span className="text-chrome-mid shrink-0">Drill:</span>
                          <span className="text-paper-1">{fix.drill}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Limitations & Single Camera Perspective Note */}
            {coachData.limitations && coachData.limitations.length > 0 && (
              <div className="pt-4 border-t border-hairline flex flex-wrap items-center justify-between text-[11px] font-mono text-paper-2 gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-paper-2" />
                  <span>Verified Single Camera Lens Limitation: {coachData.limitations.join(" · ")}</span>
                </div>
                <span>FALLBACK SAFEGUARD: ACTIVE</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
