import { ollamaService } from "./ollama-service";
import { detectLanguageFromText, sanitizeEssay, validateEssay } from "./validators";
import { validatePromptSafety } from "./prompt-builder";
import { SpeakingEvaluationResponse } from "./types";

const SPEAKING_SYSTEM_PROMPT = `You are a strict multilingual speaking examiner.

Grade the response like a real certification examiner. Use IELTS speaking criteria for English, HSK-style spoken proficiency for Chinese, and a practical GENERAL level for other languages.

Score each criterion from 0-10:
- fluency_coherence: flow, hesitation, coherence, linking words
- pronunciation: clarity, likely pronunciation issues, stress, intonation
- lexical_resource: range, precision, repetition, topic vocabulary
- grammar: accuracy, sentence range, tense/control

Return ONLY valid JSON. Be strict but constructive. Mention limitations if audio notes or transcript are incomplete.`;

function speakingPrompt(input: {
  prompt?: string;
  transcript: string;
  durationSeconds?: number | null;
  audioAvailable: boolean;
}) {
  return `Evaluate this speaking submission and return ONLY valid JSON.

<SPEAKING_TASK>
${input.prompt?.trim() || "No specific speaking task provided. Infer the speaking task from the transcript."}
</SPEAKING_TASK>

<AUDIO_CONTEXT>
Audio saved: ${input.audioAvailable ? "yes" : "no"}
Duration seconds: ${input.durationSeconds ?? "unknown"}
Important: if there is no speech-to-text confidence or audio acoustic analysis, infer pronunciation/fluency only from transcript and duration. Do not invent exact phonetic evidence.
</AUDIO_CONTEXT>

<TRANSCRIPT>
${input.transcript}
</TRANSCRIPT>

Return JSON in exactly this format:
{
  "language": "English|Japanese|Korean|Chinese|Vietnamese",
  "fluency_coherence": <0-10>,
  "pronunciation": <0-10>,
  "lexical_resource": <0-10>,
  "grammar": <0-10>,
  "overall": <0-10>,
  "band": {
    "system": "IELTS|HSK|GENERAL",
    "level": "<example: 6.5 | HSK 4 | Intermediate>",
    "score": <numeric band score>,
    "rationale": "<why this band>"
  },
  "summary": "<1-2 sentence examiner overview>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "pronunciation_errors": ["<specific pronunciation issue or evidence-based limitation>"],
  "grammar_errors": ["<specific grammar issue>"],
  "vocabulary_errors": ["<specific vocabulary issue>"],
  "fluency_issues": ["<hesitation/repetition/linking issue>"],
  "feedback": ["<detailed feedback1>", "<detailed feedback2>", "<detailed feedback3>"],
  "suggestions": ["<specific improvement1>", "<specific improvement2>", "<specific improvement3>"],
  "practice_methods": ["shadowing with 30-second chunks", "minimal-pair pronunciation drills", "topic vocabulary notebook"]
}`;
}

function normalizeArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length ? items : fallback;
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return fallback;
}

function normalizeScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0;
}

function parseSpeakingResponse(raw: string): SpeakingEvaluationResponse | null {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  try {
    const source = JSON.parse(json) as Record<string, unknown>;
    const fluency = normalizeScore(source.fluency_coherence);
    const pronunciation = normalizeScore(source.pronunciation);
    const lexical = normalizeScore(source.lexical_resource);
    const grammar = normalizeScore(source.grammar);
    const overall = normalizeScore(source.overall || (fluency + pronunciation + lexical + grammar) / 4);

    return {
      language: String(source.language || "English") as SpeakingEvaluationResponse["language"],
      fluency_coherence: fluency,
      pronunciation,
      lexical_resource: lexical,
      grammar,
      overall,
      band: {
        system: (source.band as { system?: "IELTS" | "HSK" | "GENERAL" } | undefined)?.system || "GENERAL",
        level: String((source.band as { level?: unknown } | undefined)?.level || "Intermediate"),
        score: Number((source.band as { score?: unknown } | undefined)?.score ?? overall),
        rationale: String((source.band as { rationale?: unknown } | undefined)?.rationale || ""),
      },
      summary: String(source.summary || "Speaking evaluation completed."),
      strengths: normalizeArray(source.strengths, ["The answer communicates a relevant message."]),
      weaknesses: normalizeArray(source.weaknesses, ["Improve fluency, pronunciation control, and language range."]),
      pronunciation_errors: normalizeArray(source.pronunciation_errors, [
        "Audio acoustic analysis is limited; use the saved recording for self-review with the feedback.",
      ]),
      grammar_errors: normalizeArray(source.grammar_errors, ["Review sentence accuracy and verb control."]),
      vocabulary_errors: normalizeArray(source.vocabulary_errors, ["Use more precise topic vocabulary and reduce repetition."]),
      fluency_issues: normalizeArray(source.fluency_issues, ["Add linking words and reduce pauses between ideas."]),
      feedback: normalizeArray(source.feedback, ["Focus on fluency, pronunciation clarity, vocabulary range, and grammar accuracy."]),
      suggestions: normalizeArray(source.suggestions, [
        "Practise shadowing short native-speaker clips.",
        "Record and compare pronunciation for difficult words.",
        "Build topic vocabulary before answering.",
      ]),
      practice_methods: normalizeArray(source.practice_methods, [
        "shadowing",
        "pronunciation drills",
        "topic vocabulary expansion",
      ]),
    };
  } catch (error) {
    console.error("Failed to parse speaking response:", error);
    return null;
  }
}

export class SpeakingService {
  async evaluateSpeaking(input: {
    transcript: string;
    prompt?: string;
    durationSeconds?: number | null;
    audioAvailable?: boolean;
  }): Promise<SpeakingEvaluationResponse> {
    const validation = validateEssay(input.transcript);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid speaking transcript");
    }

    const transcript = sanitizeEssay(input.transcript);
    if (!validatePromptSafety(transcript)) {
      throw new Error("Speaking transcript contains suspicious patterns");
    }

    const language = detectLanguageFromText(transcript) as SpeakingEvaluationResponse["language"];
    const raw = await ollamaService.chat([
      { role: "system", content: SPEAKING_SYSTEM_PROMPT },
      {
        role: "user",
        content: speakingPrompt({
          prompt: input.prompt,
          transcript,
          durationSeconds: input.durationSeconds,
          audioAvailable: Boolean(input.audioAvailable),
        }),
      },
    ]);

    const parsed = parseSpeakingResponse(raw);
    if (!parsed) {
      throw new Error("Failed to get valid speaking AI response");
    }

    return { ...parsed, language };
  }
}

export const speakingService = new SpeakingService();
