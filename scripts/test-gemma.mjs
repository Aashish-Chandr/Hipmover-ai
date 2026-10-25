import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function run() {
  const prompt = `
System: You are an encouraging exercise coach. Use ONLY the provided measurements. Never diagnose. Output a JSON object with this structure:
{
  "headline": "Great squat depth and tempo",
  "summary": "Short 1-sentence summary of the squat session.",
  "strengths": ["Strong depth", "Solid tempo"],
  "top_fixes": [{ "issue": "Knee cave", "evidence_from_metrics": "Knee angle 84 deg", "cue": "Push knees out", "drill": "Banded squats" }],
  "confidence": "high",
  "limitations": ["Single camera angle"]
}

User Metrics: Total reps: 2, Avg Depth: 86.5 deg, Descent: 1.8s, Ascent: 1.3s, Quality Score: 88.
Output ONLY raw JSON:
`;

  console.log("Measuring generation time on gemma-4-26b-a4b-it...");
  const start = Date.now();
  const res = await ai.models.generateContent({
    model: "gemma-4-26b-a4b-it",
    contents: prompt,
  });
  console.log(`Finished in ${Date.now() - start}ms:`);
  console.log(res.text);
}

run();
