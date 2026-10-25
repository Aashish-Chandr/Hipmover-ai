# HiperMove — Hackathon Submission Pack

## Target Prizes
1. **Best Use of Gemma 4** (KodeKurrent S2 × Open Science Labs)
2. **Best Open-Source AI Project (Build with DigitalOcean)**

---

## 1. 3-Minute Video Recording Script

### Scene 1: The Problem & The Thesis (0:00 - 0:40)
- **Visual:** Open on the hero section of HiperMove (`http://localhost:3000`).
- **Narrator:**
  > "Exercise apps today either force users to buy wearable sensors or stream private video of their living rooms to external servers. We built **HiperMove**—an edge-first movement biomechanics assistant for Hacktoberfest 26.
  >
  > Our thesis is simple: *Movement didn't change. How machines read it multiplied.* By shifting pose estimation entirely into the client browser via WebAssembly SIMD, we achieve 60 FPS real-time tracking with zero raw video upload. We then pair that with Google Gemma 4 on DigitalOcean App Platform for personalized, encouraging coaching."

### Scene 2: 1-Click Movement Instrument in Action (0:40 - 1:30)
- **Visual:** Click "1-Click Benchmark Clip". Watch the video play, the glowing cyan skeleton overlay track joints, and the real-time knee angle badge count Rep 1 at bottom parallel inflection.
- **Narrator:**
  > "Watch our movement instrument. In one click, our benchmark squat clip runs client-side. Notice the HUD: MediaPipe tracks 33 3D keypoints in WebAssembly.
  >
  > Our pure TypeScript hysteresis engine filters noisy frames with EMA smoothing, identifies the bottom inflection point at 89.2°, and captures a 512px keyframe precisely when parallel depth is reached."

### Scene 3: Biomechanical Dashboard & Rep Breakdown (1:30 - 2:00)
- **Visual:** Scroll to the Results Dashboard (`#dashboard`). Point out the SVG Knee Flexion Curve with inflection markers, the per-rep breakdown table, and the side-by-side keyframe comparator.
- **Narrator:**
  > "Every repetition is logged into our kinematic ledger. We visualize the flexion curve over time, descent/ascent tempo ratios, torso lean, and multi-factor quality scoring. You can also inspect the exact bottom inflection keyframe alongside your best and worst reps."

### Scene 4: Gemma 4 Multimodal Reasoning (2:00 - 2:40)
- **Visual:** Click "Analyze with Gemma 4 AI Coach". Watch the skeleton loader pulse, followed by the typewriter reveal of Gemma 4's structured feedback.
- **Narrator:**
  > "Now, we feed our quantitative telemetry and downscaled keyframes into **Google Gemma 4** via the Gemini API.
  >
  > Notice the depth of the reasoning: Gemma 4 cites exact metrics from our session—identifying our consistent 1.2s descent and suggesting a specific pause squat drill to improve depth consistency. If network latency ever spikes, our automatic rule-based fallback guarantees 100% demo uptime."

### Scene 5: DigitalOcean Architecture & Wrap-up (2:40 - 3:00)
- **Visual:** Scroll to the Machine Lens (`#machine-lens`) showing the `.do/app.yaml` manifest and Dockerfile.
- **Narrator:**
  > "HiperMove is fully open-source under the MIT license, packaged with a multi-stage standalone Dockerfile, and deployed on DigitalOcean App Platform in region NYC3.
  >
  > HiperMove: Privacy at the edge, intelligence with Gemma 4, and scale with DigitalOcean. Thank you!"

---

## 2. 10-Point Pre-Submission Checklist

- [x] **1. Working Core**: MediaPipe PoseLandmarker running in WebAssembly SIMD at 60 FPS.
- [x] **2. Hysteresis State Machine**: >160° standing, <100° bottom, EMA alpha 0.4.
- [x] **3. Keyframe Extraction**: Automatic 512px downscaled JPEG capture at minimum knee angle.
- [x] **4. Multimodal Gemma 4**: `@google/genai` integration with `gemma-4-26b-a4b-it` and `gemma-4-31b-it`.
- [x] **5. Guaranteed Fallback**: Deterministic rule-based engine prevents any demo failure.
- [x] **6. Test Suite**: 11 / 11 Vitest tests passing (`npm test`).
- [x] **7. Production Build**: Standalone Next.js 14 compilation with zero errors (`npm run build`).
- [x] **8. DigitalOcean Specification**: `.do/app.yaml` and multi-stage `Dockerfile` configured.
- [x] **9. Bespoke UI/UX**: Jamie McKaye-inspired minimalist, high-contrast obsidian aesthetic.
- [x] **10. Privacy & Medical Disclaimers**: Prominently featured across UI, footer, and README.
