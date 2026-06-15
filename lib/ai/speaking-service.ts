import { ollamaService } from "./ollama-service";
import { detectLanguageFromText, sanitizeEssay, validateEssay } from "./validators";
import { validatePromptSafety } from "./prompt-builder";
import { SpeakingEvaluationResponse, SpeakingExamType } from "./types";
import type {
  SpeakingLanguage,
  SpeakingTask,
} from "@/lib/speaking-languages";

const SPEAKING_SYSTEM_PROMPT = `You are a strict multilingual speaking examiner.

Grade the response like a real language-speaking examiner. Follow the requested scoring system when one is provided; otherwise use a strict general speaking rubric.

Be strict but constructive. Mention limitations if transcript is incomplete or acoustic analysis is unavailable.
Treat task relevance as a hard scoring requirement. A fluent answer that does not answer the speaking task must receive a low overall score.
Return ONLY valid JSON.`;

const SPEAKING_PROMPT_SYSTEM = `You create realistic speaking practice prompts.
Return ONLY valid JSON with two string fields: "topic" and "prompt".
Do not include scores, feedback, markdown fences, or commentary outside the JSON.`;

const IELTS_CRITERIA = ["fluency", "vocabulary", "grammar", "pronunciation"] as const;
const HSK_CRITERIA = ["pronunciation", "vocabulary_grammar", "fluency", "content"] as const;

function scoreScaleForExam(exam: "IELTS" | "HSK"): SpeakingEvaluationResponse["score_scale"] {
  return exam === "IELTS" ? "BAND_0_9" : "SCORE_0_100";
}

function criterionMax(exam: "IELTS" | "HSK") {
  return exam === "IELTS" ? 9 : 100;
}

function clampScore(value: unknown, max: number) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(max, score));
}

function normalizeToTen(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(10, (value / max) * 10));
}

function examEvaluationGuide(exam: "IELTS" | "HSK") {
  if (exam === "IELTS") {
    return `
Exam: IELTS Speaking
Criteria and scale:
- fluency: 0-9
- vocabulary: 0-9
- grammar: 0-9
- pronunciation: 0-9
Overall: 0-9 (band score)`;
  }

  return `
Exam: HSKK Speaking
Criteria and scale:
- pronunciation: 0-100
- vocabulary_grammar: 0-100
- fluency: 0-100
- content: 0-100
Overall: 0-100`;
}

function speakingPrompt(input: {
  exam: "IELTS" | "HSK";
  prompt?: string;
  transcript: string;
  conversation?: string;
  durationSeconds?: number | null;
  audioAvailable: boolean;
}) {
  const expectedCriteria = input.exam === "IELTS" ? IELTS_CRITERIA.join(", ") : HSK_CRITERIA.join(", ");

  return `Evaluate this speaking submission and return ONLY valid JSON.

<SPEAKING_TASK>
${input.prompt?.trim() || "No specific speaking task provided. Infer the speaking task from the transcript."}
</SPEAKING_TASK>

<EXAM_RUBRIC>
${examEvaluationGuide(input.exam)}
</EXAM_RUBRIC>

<AUDIO_CONTEXT>
Audio saved: ${input.audioAvailable ? "yes" : "no"}
Duration seconds: ${input.durationSeconds ?? "unknown"}
Important: if there is no speech-to-text confidence or audio acoustic analysis, infer pronunciation/fluency only from transcript and duration. Do not invent exact phonetic evidence.
The transcript may contain isolated browser speech-recognition errors such as misspellings, homophones, missing punctuation, or an improbable substituted word. Infer the intended word only when the task and surrounding sentence strongly support it. Do not count that isolated token as a definite learner error. Do not excuse repeated misuse or malformed grammar, and label ambiguous cases as possible recognition errors. Transcript spelling alone is not pronunciation evidence.
</AUDIO_CONTEXT>

<CONVERSATION_LOG>
${input.conversation?.trim() || "No detailed turn-by-turn log provided."}
</CONVERSATION_LOG>

<TRANSCRIPT>
${input.transcript}
</TRANSCRIPT>

Relevance rules:
- task_relevance is 0-100 and measures whether the response directly answers the requested topic and required points.
- A clearly unrelated, memorized, evasive, or random answer must have task_relevance <= 20.
- A mostly unrelated answer with only a superficial topic mention must have task_relevance <= 40.
- Do not reward fluency, grammar, or vocabulary enough to produce a high overall score when task relevance is low.

Return JSON in exactly this format:
{
  "language": "English|Japanese|Korean|Chinese|Vietnamese",
  "exam": "${input.exam}",
  "score_scale": "${scoreScaleForExam(input.exam)}",
  "criteria_scores": {
    "${expectedCriteria.split(", ")[0]}": <number>,
    "${expectedCriteria.split(", ")[1]}": <number>,
    "${expectedCriteria.split(", ")[2]}": <number>,
    "${expectedCriteria.split(", ")[3]}": <number>
  },
  "overall": <number in exam scale>,
  "normalized_overall": <0-10>,
  "task_relevance": <0-100>,
  "band": {
    "system": "${input.exam}",
    "level": "<example: 6.5 or HSKK Intermediate>",
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

function relevanceScoreCap(exam: "IELTS" | "HSK", relevance: number) {
  if (relevance <= 20) return exam === "IELTS" ? 2.5 : 25;
  if (relevance <= 40) return exam === "IELTS" ? 4 : 45;
  if (relevance <= 60) return exam === "IELTS" ? 5.5 : 65;
  return criterionMax(exam);
}

function parseSpeakingResponse(raw: string, examType: "IELTS" | "HSK"): SpeakingEvaluationResponse | null {
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
    const exam = examType;
    const max = criterionMax(exam);
    const expectedCriteria = exam === "IELTS" ? IELTS_CRITERIA : HSK_CRITERIA;
    const rawCriteria = (source.criteria_scores || {}) as Record<string, unknown>;

    const parsedCriteriaScores = Object.fromEntries(
      expectedCriteria.map((criterion) => {
        const legacyValue = (() => {
          if (criterion === "fluency") return source.fluency_coherence;
          if (criterion === "vocabulary") return source.lexical_resource;
          if (criterion === "vocabulary_grammar") return source.lexical_resource ?? source.grammar;
          if (criterion === "grammar") return source.grammar;
          if (criterion === "pronunciation") return source.pronunciation;
          if (criterion === "content") return source.task_response ?? source.content;
          return 0;
        })();
        return [criterion, clampScore(rawCriteria[criterion] ?? legacyValue, max)];
      }),
    ) as Record<string, number>;

    const taskRelevance = clampScore(source.task_relevance ?? source.relevance ?? 100, 100);
    const scoreCap = relevanceScoreCap(exam, taskRelevance);
    const criteriaScores = Object.fromEntries(
      Object.entries(parsedCriteriaScores).map(([criterion, score]) => [criterion, Math.min(score, scoreCap)]),
    ) as Record<string, number>;
    const criteriaValues = Object.values(criteriaScores);
    const uncappedOverall = clampScore(
      source.overall ?? (criteriaValues.length ? criteriaValues.reduce((sum, item) => sum + item, 0) / criteriaValues.length : 0),
      max,
    );
    const overallRaw = Math.min(uncappedOverall, scoreCap);
    const normalizedOverall = Math.min(
      normalizeScore(source.normalized_overall ?? normalizeToTen(overallRaw, max)),
      normalizeToTen(scoreCap, max),
    );

    const fluencyValue = exam === "IELTS" ? criteriaScores.fluency ?? 0 : normalizeToTen(criteriaScores.fluency ?? 0, 100);
    const pronunciationValue =
      exam === "IELTS" ? criteriaScores.pronunciation ?? 0 : normalizeToTen(criteriaScores.pronunciation ?? 0, 100);
    const lexicalValue =
      exam === "IELTS"
        ? criteriaScores.vocabulary ?? 0
        : normalizeToTen(criteriaScores.vocabulary_grammar ?? 0, 100);
    const grammarValue =
      exam === "IELTS"
        ? criteriaScores.grammar ?? 0
        : normalizeToTen(criteriaScores.vocabulary_grammar ?? 0, 100);

    return {
      exam,
      score_scale: scoreScaleForExam(exam),
      criteria_scores: criteriaScores,
      language: String(source.language || "English") as SpeakingEvaluationResponse["language"],
      fluency_coherence: normalizeScore(fluencyValue),
      pronunciation: normalizeScore(pronunciationValue),
      lexical_resource: normalizeScore(lexicalValue),
      grammar: normalizeScore(grammarValue),
      overall: overallRaw,
      normalized_overall: normalizedOverall,
      task_relevance: taskRelevance,
      band: {
        system: (source.band as { system?: "IELTS" | "HSK" } | undefined)?.system || exam,
        level:
          taskRelevance <= 60
            ? exam === "IELTS"
              ? overallRaw.toFixed(1)
              : `HSKK ${Math.round(overallRaw)}`
            : String(
                (source.band as { level?: unknown } | undefined)?.level ||
                  (exam === "IELTS" ? overallRaw.toFixed(1) : "HSKK Intermediate"),
              ),
        score: Math.min(clampScore((source.band as { score?: unknown } | undefined)?.score ?? overallRaw, max), scoreCap),
        rationale:
          taskRelevance <= 60
            ? `Score capped because task relevance was ${Math.round(taskRelevance)}/100.`
            : String((source.band as { rationale?: unknown } | undefined)?.rationale || ""),
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
      practice_methods: normalizeArray(source.practice_methods, ["shadowing", "pronunciation drills", "topic vocabulary expansion"]),
    };
  } catch (error) {
    console.error("Failed to parse speaking response:", error);
    return null;
  }
}

export class SpeakingService {
  async evaluateSpeaking(input: {
    transcript: string;
    examType: SpeakingExamType;
    prompt?: string;
    conversation?: string;
    durationSeconds?: number | null;
    audioAvailable?: boolean;
  }): Promise<SpeakingEvaluationResponse> {
    if (input.examType === "JLPT") {
      throw new Error("JLPT does not include a speaking section.");
    }

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
          exam: input.examType,
          prompt: input.prompt,
          transcript,
          conversation: input.conversation,
          durationSeconds: input.durationSeconds,
          audioAvailable: Boolean(input.audioAvailable),
        }),
      },
    ]);

    const parsed = parseSpeakingResponse(raw, input.examType);
    if (!parsed) {
      throw new Error("Failed to get valid speaking AI response");
    }

    return { ...parsed, language };
  }

  async generatePracticePrompt(input: {
    language: SpeakingLanguage;
    task: SpeakingTask;
    topic?: string;
    randomTopic?: boolean;
  }): Promise<{ topic: string; prompt: string }> {
    const requestedTopic = String(input.topic || "")
      .replace(/[\r\n<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    const topicInstruction =
      input.randomTopic || !requestedTopic
        ? "Choose one varied, practical topic suitable for a language learner."
        : `Use this requested topic: ${requestedTopic}`;
    const targetLanguages: Record<SpeakingLanguage, string> = {
      ENGLISH: "English",
      CHINESE: "Simplified Chinese",
      JAPANESE: "Japanese",
      KOREAN: "Korean",
    };
    const taskGuides: Record<SpeakingTask, string> = {
      1: "Create 4 concise personal questions that can each be answered briefly.",
      2: "Create one long-turn speaking task asking the learner to describe an experience, with 3-4 points to cover.",
      3: "Create 4 discussion questions that move from causes and effects to comparison and personal opinion.",
    };
    const targetLanguage = targetLanguages[input.language];
    const formatInstruction = taskGuides[input.task];

    const raw = await ollamaService.chat(
      [
        { role: "system", content: SPEAKING_PROMPT_SYSTEM },
        {
          role: "user",
          content: `Target language: ${targetLanguage}
Speaking task: ${input.task}
${topicInstruction}
${formatInstruction}

Write both the topic and the complete prompt entirely in ${targetLanguage}.
The prompt must be ready to show directly to the learner. Keep it under 180 words.`,
        },
      ],
      { maxOutputTokens: 700 },
    );
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(
      start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned,
    ) as { topic?: unknown; prompt?: unknown };
    const topic = String(parsed.topic || requestedTopic || "General speaking")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
    const prompt = String(parsed.prompt || "").trim().slice(0, 1800);

    if (!prompt) {
      throw new Error("AI returned an empty speaking prompt.");
    }

    return { topic, prompt };
  }
}

export const speakingService = new SpeakingService();
