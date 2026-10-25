"use client";

import React from "react";
import { Video, Activity, Sparkles, Check } from "lucide-react";

interface StepperProps {
  currentStep: 1 | 2 | 3;
  onStepClick?: (step: 1 | 2 | 3) => void;
}

export function Stepper({ currentStep, onStepClick }: StepperProps) {
  const steps = [
    { number: 1 as const, title: "1. Select Video", desc: "Upload or 1-Click Demo", icon: Video },
    { number: 2 as const, title: "2. Pose Tracking", desc: "Edge Vision & Rep Counter", icon: Activity },
    { number: 3 as const, title: "3. Gemma 4 Coach", desc: "Multimodal AI Feedback", icon: Sparkles },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto my-6 px-4">
      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step) => {
          const Icon = step.icon;
          const isDone = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <div
              key={step.number}
              onClick={() => onStepClick?.(step.number)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                isCurrent
                  ? "bg-do-blue/10 border-do-blue shadow-do-glow text-white"
                  : isDone
                  ? "bg-do-navy-card/80 border-emerald-500/30 text-slate-200"
                  : "bg-do-navy-card/40 border-do-navy-border/60 text-slate-500 hover:border-do-navy-border"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-semibold text-sm transition-all ${
                  isCurrent
                    ? "bg-do-blue text-white shadow-sm"
                    : isDone
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-do-navy-border/40 text-slate-400"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-semibold ${isCurrent ? "text-do-blue" : isDone ? "text-emerald-400" : "text-slate-400"}`}>
                  {step.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
