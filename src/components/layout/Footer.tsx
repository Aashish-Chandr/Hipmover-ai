import React from "react";
import { AlertCircle, Shield } from "lucide-react";
import { WELLNESS_DISCLAIMER } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-hairline bg-ink-0 text-paper-2">
      <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-10">
        {/* Medical & Wellness Disclaimer Box */}
        <div className="mb-14 border border-hairline bg-ink-1 p-5 md:p-6">
          <div className="flex items-start gap-3.5">
            <AlertCircle className="h-4 w-4 text-paper-1 flex-shrink-0 mt-0.5" />
            <div>
              <p className="label-mono text-[10px] text-paper-1 uppercase mb-1">
                Wellness Guidance & Biomechanical Disclaimer
              </p>
              <p className="text-[13px] text-paper-2 leading-relaxed max-w-[90ch]">
                {WELLNESS_DISCLAIMER}
              </p>
            </div>
          </div>
        </div>

        {/* Minimal 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-[13px] border-b border-hairline pb-12">
          {/* Identity */}
          <div className="md:col-span-1">
            <span className="text-[15px] font-semibold text-paper-0 tracking-tight">
              hipermove<span className="chrome-text">.ai</span>
            </span>
            <p className="mt-2 text-paper-2 text-[12px] leading-relaxed max-w-[32ch]">
              Edge WebAssembly vision and Google Gemma 4 intelligence on DigitalOcean App Platform.
            </p>
            <div className="mt-4 flex items-center gap-1.5 label-mono text-[10px] text-emerald-400">
              <Shield className="h-3 w-3" />
              <span>Zero raw video leaves device</span>
            </div>
          </div>

          {/* Architecture */}
          <div>
            <p className="label-mono mb-3 text-[11px] text-chrome-mid">architecture</p>
            <ul className="space-y-2 text-paper-1 text-[13px]">
              <li>MediaPipe PoseLandmarker (WASM)</li>
              <li>Hysteresis Rep State Machine</li>
              <li>Google Gemma 4 (31B & 26B)</li>
              <li>Next.js 14 App Platform Runtime</li>
            </ul>
          </div>

          {/* Verification & Proof */}
          <div>
            <p className="label-mono mb-3 text-[11px] text-chrome-mid">verification</p>
            <ul className="space-y-2 text-paper-1 text-[13px]">
              <li>11/11 Vitest Deterministic Tests</li>
              <li>0 ms Video Network Latency</li>
              <li>60 FPS SIMD WebAssembly Loop</li>
              <li>Automatic Rule-Based Fallback</li>
            </ul>
          </div>

          {/* Competition Attributions */}
          <div>
            <p className="label-mono mb-3 text-[11px] text-chrome-mid">attributions</p>
            <ul className="space-y-2 text-paper-1 text-[13px]">
              <li>Hacktoberfest 26 Hack Day</li>
              <li>KodeKurrent S2 × Open Science Labs</li>
              <li>Built with DigitalOcean</li>
              <li>MIT Open Source License</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-baseline justify-between gap-4 label-mono text-[11px] text-paper-2">
          <p>© 2026 HiperMove. Open-source under MIT License.</p>
          <div className="flex items-center gap-6">
            <span>REGION: NYC3</span>
            <span>RUNTIME: DOCKER / STANDALONE</span>
            <span>MODEL: GEMMA 4</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
