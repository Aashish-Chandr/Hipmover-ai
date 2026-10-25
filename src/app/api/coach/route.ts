import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  CoachApiRequestSchema,
  CoachApiResponseSchema,
  CoachApiResponseOutput,
} from "@/lib/coach/schema";
import { generateRuleBasedCoachFeedback } from "@/lib/coach/rule-based-coach";

// 45-second timeout helper for LLM generation
async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 45000
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`API request timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

function cleanJsonResponseText(rawText: string): string {
  let text = rawText.trim();
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    text = jsonMatch[1].trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  // 1. Zod input validation
  const parseResult = CoachApiRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed for coaching request",
        details: parseResult.error.issues,
      },
      { status: 400 }
    );
  }

  const payload = parseResult.data;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.warn("[/api/coach] No valid GEMINI_API_KEY found, using rule-based coach fallback");
    const fallbackResponse = generateRuleBasedCoachFeedback(payload);
    return NextResponse.json(fallbackResponse);
  }

  const primaryModel = process.env.GEMMA_PRIMARY_MODEL || "gemma-4-31b-it";
  const fallbackModel = process.env.GEMMA_FALLBACK_MODEL || "gemma-4-26b-a4b-it";

  const fullPromptText = `
System: You are an elite, encouraging biomechanics coach evaluating a full-body squat session.
You evaluate the entire closed kinetic chain across 6 fundamental pillars:
1. Knee Depth & Joint Flexion (Target <= 100° parallel or <= 90° deep)
2. Torso Posture & Spinal Lean (Target <= 40° upright angle against vertical)
3. Knee Valgus Tracking (Target ratio >= 0.90; penalize inward knee collapse towards midline)
4. Foot & Heel Grounding (Target grounded heels; penalize heel elevation/weight shifting to toes)
5. Head & Cervical Neutrality (Target neutral head alignment; penalize neck craning or excessive gaze drop)
6. Tempo & Eccentric/Concentric Control

HARD BENCHMARK: The platform enforces a 70/100 benchmark. Repetitions scoring >= 70 are VALID reps; attempts < 70 are sub-benchmark.
In your analysis, reference specific observations from the attached keyframe snapshot images and metrics (including head, torso, knees, and heels).

Output a JSON object matching this exact structure:
{
  "headline": "Encouraging high-level session headline",
  "summary": "2-3 sentences summarizing full-body depth, knee tracking, heel grounding, and tempo control.",
  "strengths": ["Clear strength grounded in metrics and visual alignment", "Another observed strength"],
  "top_fixes": [
    {
      "issue": "Specific full-body form fix (e.g. Knee Valgus, Heel Elevation, or Torso Pitch)",
      "evidence_from_metrics": "Metrics citation (e.g. Min knee angle was 89°, valgus ratio was 0.78)",
      "cue": "Actionable cue (e.g. 'Screw your feet into the floor and drive your knees outward over your pinky toes')",
      "drill": "Recommended drill (e.g. Banded goblet squats or ankle dorsiflexion stretches)"
    }
  ],
  "confidence": "high" | "medium" | "low",
  "limitations": ["Single camera perspective"]
}

Movement Session Metrics:
${JSON.stringify(payload.metrics_summary)}

Per-Rep Breakdown:
${JSON.stringify(payload.per_rep_metrics)}

Output ONLY raw JSON:
`;

  // Prepare multimodal parts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentsParts: any[] = [{ text: fullPromptText }];

  // Attach Best Rep Image Part if available
  if (payload.best_rep_image_base64) {
    const rawBase64 = payload.best_rep_image_base64.replace(
      /^data:image\/\w+;base64,/,
      ""
    );
    contentsParts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: rawBase64,
      },
    });
  }

  // Attach Worst Rep Image Part if available
  if (payload.worst_rep_image_base64) {
    const rawBase64 = payload.worst_rep_image_base64.replace(
      /^data:image\/\w+;base64,/,
      ""
    );
    contentsParts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: rawBase64,
      },
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  // Helper to attempt model generation
  const callModel = async (
    modelName: string
  ): Promise<CoachApiResponseOutput | null> => {
    console.log(`[/api/coach] Calling model: ${modelName}`);

    const response = await fetchWithTimeout(
      ai.models.generateContent({
        model: modelName,
        contents: contentsParts,
      }),
      50000
    );

    const textOutput = response.text;
    if (!textOutput) return null;

    const cleaned = cleanJsonResponseText(textOutput);
    const parsedJson = JSON.parse(cleaned);

    const sourceLabel = modelName.includes("31b") ? "Gemma 4 31B" : "Gemma 4 26B";

    const validated = CoachApiResponseSchema.safeParse({
      ...parsedJson,
      sourceModel: sourceLabel,
    });

    if (validated.success) {
      return validated.data;
    } else {
      console.warn(
        `[/api/coach] Output JSON validation failed on ${modelName}:`,
        validated.error.issues
      );
      return null;
    }
  };

  // 1. Try Primary Model
  try {
    const result = await callModel(primaryModel);
    if (result) {
      return NextResponse.json(result);
    }
  } catch (err: unknown) {
    const e = err as Error;
    console.warn(`[/api/coach] Primary model ${primaryModel} failed:`, e.message);
  }

  // 2. Try Fallback Model with 1 retry
  try {
    console.log(`[/api/coach] Retrying with fallback model: ${fallbackModel}`);
    const result = await callModel(fallbackModel);
    if (result) {
      return NextResponse.json(result);
    }
  } catch (fallbackErr: unknown) {
    const fe = fallbackErr as Error;
    console.warn(`[/api/coach] Fallback model ${fallbackModel} failed:`, fe.message);
  }

  // 3. Guaranteed Deterministic Rule-Based Fallback (UI never breaks)
  console.warn("[/api/coach] Both models failed or timed out. Activating deterministic rule-based fallback.");
  const deterministicResult = generateRuleBasedCoachFeedback(payload);
  return NextResponse.json(deterministicResult);
}
