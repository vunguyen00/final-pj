import { ollamaService } from "@/lib/ai";
import { getSpeakingExamTypeForLanguageCode } from "@/lib/test-rules";

export type TestAiFeedback = {
  mode: "WRITING" | "SPEAKING";
  language: string;
  overallScore: number;
  taskRelevance?: number;
  onTopic?: boolean;
  offTopicReason?: string;
  detailedComment?: string;
  sampleAnswer?: string;
  criteria?: Record<string, number>;
  band?: { system: string; level: string; score: number; rationale: string };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  feedback?: string[];
  suggestions: string[];
  corrections?: Array<{ original: string; improved: string; reason: string }>;
  pronunciationErrors?: string[];
  grammarErrors?: string[];
  vocabularyErrors?: string[];
  fluencyIssues?: string[];
  practiceMethods?: string[];
};

export type TestAiAnswerInput = {
  questionId: string;
  mode: "WRITING" | "SPEAKING";
  answer: string;
  prompt?: string;
  languageCode?: string | null;
  examType?: "IELTS" | "HSK";
};

export type TestAiAnswerResult = {
  normalizedScore: number;
  aiEvaluation: TestAiFeedback;
  failed?: boolean;
};

function clampScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0;
}

function clampPercent(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 100;
  return Math.max(0, Math.min(100, score <= 10 ? score * 10 : score));
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 4);
}

function correctionArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 2).map((item) => {
    const correction = item as Record<string, unknown>;
    return {
      original: String(correction.original || correction.sentence || ""),
      improved: String(correction.improved || correction.correction || ""),
      reason: String(correction.reason || ""),
    };
  }).filter((item) => item.original || item.improved);
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function parseBatchResponse(raw: string, inputs: TestAiAnswerInput[]) {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as {
    results?: Array<Record<string, unknown>>;
  };
  const parsedResults = parsed.results || [];
  const sourceById = new Map(
    parsedResults.map((item) => [String(item.questionId || item.question_id || ""), item]),
  );
  const results = new Map<string, TestAiAnswerResult>();

  for (const input of inputs) {
    const inputIndex = inputs.findIndex((item) => item.questionId === input.questionId);
    const source = sourceById.get(input.questionId) || parsedResults[inputIndex];
    if (!source) continue;

    const mode = input.mode;
    const relevance = clampPercent(source.taskRelevance ?? source.task_relevance ?? 100);
    const relevanceCap = relevance <= 20 ? 1.5 : relevance <= 40 ? 3 : relevance <= 60 ? 5 : 10;
    const normalizedScore = Math.min(
      clampScore(source.overallScore ?? source.overall_score ?? source.overall),
      relevanceCap,
    );
    const rawBand = (source.band || {}) as Record<string, unknown>;
    const rawCriteria = (source.criteria || {}) as Record<string, unknown>;
    const criteria = Object.fromEntries(
      Object.entries(rawCriteria).map(([key, value]) => [key, clampScore(value)]),
    );
    const reportedOnTopic = booleanValue(source.onTopic ?? source.on_topic, relevance >= 60);
    const onTopic = reportedOnTopic && relevance >= 60;

    results.set(input.questionId, {
      normalizedScore,
      aiEvaluation: {
        mode,
        language: String(source.language || "Unknown"),
        overallScore: normalizedScore,
        taskRelevance: relevance,
        onTopic,
        offTopicReason: String(
          source.offTopicReason ??
          source.off_topic_reason ??
          (onTopic ? "" : "The answer does not sufficiently address the original prompt."),
        ),
        detailedComment: String(source.detailedComment ?? source.detailed_comment ?? source.summary ?? ""),
        sampleAnswer: String(source.sampleAnswer ?? source.sample_answer ?? ""),
        criteria,
        band: {
          system: String(rawBand.system || (mode === "SPEAKING" ? "GENERAL_SPEAKING" : "GENERAL_WRITING")),
          level: String(rawBand.level || `${normalizedScore.toFixed(1)}/10`),
          score: normalizedScore,
          rationale: String(rawBand.rationale || ""),
        },
        summary: String(source.summary || "AI evaluation completed."),
        strengths: stringArray(source.strengths),
        weaknesses: stringArray(source.weaknesses),
        feedback: stringArray(source.feedback),
        suggestions: stringArray(source.suggestions),
        corrections: correctionArray(source.corrections),
        pronunciationErrors: stringArray(source.pronunciationErrors ?? source.pronunciation_errors),
        grammarErrors: stringArray(source.grammarErrors ?? source.grammar_errors),
        vocabularyErrors: stringArray(source.vocabularyErrors ?? source.vocabulary_errors),
        fluencyIssues: stringArray(source.fluencyIssues ?? source.fluency_issues),
        practiceMethods: stringArray(source.practiceMethods ?? source.practice_methods),
      },
    });
  }

  return results;
}

export async function evaluateTestAiAnswers(inputs: TestAiAnswerInput[]) {
  const results = new Map<string, TestAiAnswerResult>();
  if (!inputs.length) return results;

  for (let index = 0; index < inputs.length; index += 1) {
    const chunk = inputs.slice(index, index + 1);
    try {
      const payload = chunk.map((input) => ({
        questionId: input.questionId,
        mode: input.mode,
        exam:
          input.mode === "SPEAKING"
            ? input.examType || getSpeakingExamTypeForLanguageCode(input.languageCode)
            : "GENERAL_WRITING",
        prompt: input.prompt || "",
        answer: input.answer,
      }));
      const raw = await ollamaService.chat(
        [
          {
            role: "system",
            content: `You are a strict language examiner. Grade every submitted answer independently.
Return only compact valid JSON. Criteria and overall scores use a 0-10 scale. Task relevance uses a 0-100 scale.
Task relevance is mandatory. If the answer does not address the requested topic or required points, set onTopic=false, explain why, and score it very low.
Completely unrelated answers: relevance <=20 and overall <=1.5. Mostly unrelated answers: relevance <=40 and overall <=3. Partly off-topic answers: relevance <=60 and overall <=5.
For writing, consider task response, grammar, vocabulary, and coherence.
For speaking transcripts, consider relevance, fluency, grammar, vocabulary, and pronunciation only when supported by transcript evidence.
Always provide a detailedComment with actionable feedback after grading.
Always provide a sampleAnswer that correctly answers the original prompt in the expected language. For WRITING use about 120-180 words. For SPEAKING use a natural model response of about 80-120 words.
Use at most two items per feedback array and at most one correction. Keep the JSON concise.`,
          },
          {
            role: "user",
            content: `Evaluate these test answers:
${JSON.stringify(payload)}

Return exactly:
{"results":[{"questionId":"id","language":"language","overallScore":0,"taskRelevance":0,"onTopic":true,"offTopicReason":"","criteria":{"grammar":0,"vocabulary":0,"coherence":0,"task_response":0,"fluency":0,"pronunciation":0},"band":{"system":"system","level":"level","rationale":"short"},"summary":"short","detailedComment":"clear grading comment","strengths":["short"],"weaknesses":["short"],"feedback":["short"],"suggestions":["short"],"corrections":[{"original":"text","improved":"text","reason":"short"}],"sampleAnswer":"complete model answer that directly answers the prompt"}]}`,
          },
        ],
        { maxOutputTokens: 1200 },
      );

      const parsedResults = parseBatchResponse(raw, chunk);
      for (const input of chunk) {
        const parsed = parsedResults.get(input.questionId);
        if (parsed) {
          results.set(input.questionId, parsed);
          continue;
        }
        results.set(input.questionId, failedEvaluation(input, "AI returned an incomplete evaluation."));
      }
    } catch (error) {
      console.error("Error evaluating test AI answer chunk:", error);
      for (const input of chunk) {
        results.set(input.questionId, failedEvaluation(input, "Could not evaluate this answer."));
      }
    }
  }

  return results;
}

function failedEvaluation(input: TestAiAnswerInput, summary: string): TestAiAnswerResult {
  return {
    normalizedScore: 0,
    failed: true,
    aiEvaluation: {
      mode: input.mode,
      language: "Unknown",
      overallScore: 0,
      summary,
      strengths: [],
      weaknesses: ["AI evaluation is temporarily unavailable."],
      feedback: [],
      suggestions: ["Please try submitting the test again."],
      corrections: [],
    },
  };
}

export async function evaluateWritingAnswer(essayText: string, taskPrompt?: string): Promise<{
  normalizedScore: number;
  aiEvaluation: TestAiFeedback;
}> {
  const result = (await evaluateTestAiAnswers([
    {
      questionId: "writing",
      mode: "WRITING",
      answer: essayText,
      prompt: taskPrompt,
    },
  ])).get("writing");

  return result ?? {
    normalizedScore: 0,
    aiEvaluation: {
      mode: "WRITING",
      language: "Unknown",
      overallScore: 0,
      summary: "Could not evaluate writing answer.",
      strengths: [],
      weaknesses: ["AI evaluation is temporarily unavailable."],
      feedback: [],
      suggestions: [],
      corrections: [],
    },
  };
}

export async function evaluateSpeakingAnswer(input: {
  transcript: string;
  prompt?: string;
  languageCode?: string | null;
}): Promise<{
  normalizedScore: number;
  aiEvaluation: TestAiFeedback;
}> {
  const result = (await evaluateTestAiAnswers([
    {
      questionId: "speaking",
      mode: "SPEAKING",
      answer: input.transcript,
      prompt: input.prompt,
      languageCode: input.languageCode,
    },
  ])).get("speaking");

  return result ?? {
    normalizedScore: 0,
    aiEvaluation: {
      mode: "SPEAKING",
      language: "Unknown",
      overallScore: 0,
      summary: "Could not evaluate speaking answer.",
      strengths: [],
      weaknesses: ["AI evaluation is temporarily unavailable."],
      feedback: [],
      suggestions: [],
    },
  };
}
