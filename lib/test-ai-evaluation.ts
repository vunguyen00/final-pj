import { ollamaService } from "@/lib/ai";
import { getSpeakingExamTypeForLanguageCode } from "@/lib/test-rules";
import {
  averageScoreKeys,
  capScoreRecord,
  detectLikelyIeltsWritingTask,
  getGeneralWritingEvidenceCap,
  getIeltsWritingEvidenceCap,
  getSpeakingEvidenceCap,
  hasExplicitWritingStructure,
  roundToHalf,
} from "@/lib/ai-score-calibration";

export type TestAiFeedback = {
  mode: "WRITING" | "SPEAKING";
  scoreOnly?: boolean;
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
  examType?: string;
  scoreOnly?: boolean;
};

export type TestAiAnswerResult = {
  normalizedScore: number;
  aiEvaluation: TestAiFeedback;
  failed?: boolean;
  failureReason?: "invalid_response" | "service_unavailable";
};

export function isTestAiAnswerCorrect(result: TestAiAnswerResult) {
  if (result.aiEvaluation.mode === "SPEAKING") {
    return result.aiEvaluation.onTopic === true;
  }

  return result.normalizedScore >= 7;
}

class AiEvaluationResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiEvaluationResponseError";
  }
}

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

function toScoreOnlyFeedback(feedback: TestAiFeedback): TestAiFeedback {
  return {
    mode: feedback.mode,
    scoreOnly: true,
    language: feedback.language,
    overallScore: feedback.overallScore,
    taskRelevance: feedback.taskRelevance,
    onTopic: feedback.onTopic,
    offTopicReason: "",
    detailedComment: "",
    sampleAnswer: "",
    criteria: feedback.criteria,
    band: feedback.band
      ? { ...feedback.band, rationale: "" }
      : undefined,
    summary: "",
    strengths: [],
    weaknesses: [],
    feedback: [],
    suggestions: [],
    corrections: [],
    pronunciationErrors: [],
    grammarErrors: [],
    vocabularyErrors: [],
    fluencyIssues: [],
    practiceMethods: [],
  };
}

function sourceFeedbackText(source: Record<string, unknown>) {
  const values = [
    source.summary,
    source.detailedComment,
    source.detailed_comment,
    source.offTopicReason,
    source.off_topic_reason,
    ...(Array.isArray(source.weaknesses) ? source.weaknesses : []),
    ...(Array.isArray(source.feedback) ? source.feedback : []),
  ];
  return values.map((value) => String(value || "")).join(" ").toLowerCase();
}

function hasAnySignal(value: string, signals: string[]) {
  return signals.some((signal) => value.includes(signal));
}

function calibrateTestScore(input: {
  answer: string;
  mode: "WRITING" | "SPEAKING";
  prompt?: string;
  relevance: number;
  reportedScore: number;
  criteria: Record<string, number>;
  source: Record<string, unknown>;
}) {
  const relevanceCap =
    input.relevance <= 20
      ? 1.5
      : input.relevance <= 40
        ? 3
        : input.relevance <= 60
          ? 5
          : 10;
  let evidenceCap = 10;
  let criteria = { ...input.criteria };

  if (input.mode === "WRITING") {
    const taskType = detectLikelyIeltsWritingTask(input.prompt || "");
    evidenceCap = taskType
      ? getIeltsWritingEvidenceCap(input.answer, taskType)
      : getGeneralWritingEvidenceCap(input.answer);

    if (taskType) {
      const feedbackText = sourceFeedbackText(input.source);
      const paragraphCount = input.answer
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean).length;
      const modelFoundMissingStructure = hasAnySignal(feedbackText, [
        "missing conclusion",
        "no conclusion",
        "lacks a conclusion",
        "lack of a formal concluding",
        "missing overview",
        "no overview",
        "lacks an overview",
        "unclear position",
        "position is unclear",
        "thiếu kết luận",
        "không có kết luận",
        "thiếu overview",
        "không có overview",
        "quan điểm chưa rõ",
        "lập trường chưa rõ",
      ]);
      const locallyMissingStructure =
        !hasExplicitWritingStructure(input.answer, taskType) &&
        (taskType === "task_1" || paragraphCount < 4);

      if (modelFoundMissingStructure || locallyMissingStructure) {
        evidenceCap = Math.min(evidenceCap, 6.5);
        if (Number.isFinite(criteria.task_response)) {
          criteria.task_response = Math.min(criteria.task_response, 5);
        }
      }
    }
  } else {
    evidenceCap = getSpeakingEvidenceCap(input.answer);
    if (Number.isFinite(criteria.pronunciation)) {
      criteria.pronunciation = Math.min(criteria.pronunciation, 6);
    }
  }

  criteria = capScoreRecord(criteria, Math.min(evidenceCap, relevanceCap));
  const relevantCriteria =
    input.mode === "WRITING"
      ? ["task_response", "coherence", "vocabulary", "grammar"]
      : ["fluency", "vocabulary", "grammar", "pronunciation"];
  const criteriaAverage = averageScoreKeys(criteria, relevantCriteria);
  const normalizedScore = roundToHalf(
    Math.min(
      input.reportedScore,
      criteriaAverage ?? input.reportedScore,
      evidenceCap,
      relevanceCap,
    ),
  );

  return { criteria, normalizedScore };
}

function extractFirstJsonObject(input: string) {
  const start = input.indexOf("{");
  if (start < 0) return input;

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = start; index < input.length; index += 1) {
    const character = input[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (character === "\\") {
        escaping = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) return input.slice(start, index + 1);
    }
  }

  return input.slice(start);
}

function parseBatchResponse(raw: string, inputs: TestAiAnswerInput[]) {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractFirstJsonObject(cleaned)) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AiEvaluationResponseError(`AI returned malformed JSON: ${message}`);
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).results)
  ) {
    throw new AiEvaluationResponseError("AI response does not contain a results array.");
  }

  const parsedResults = ((parsed as Record<string, unknown>).results as unknown[]).filter(
    (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
  );
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
    const rawBand = (source.band || {}) as Record<string, unknown>;
    const rawCriteria = (source.criteria || {}) as Record<string, unknown>;
    const parsedCriteria = Object.fromEntries(
      Object.entries(rawCriteria).map(([key, value]) => [key, clampScore(value)]),
    );
    const { criteria, normalizedScore } = calibrateTestScore({
      answer: input.answer,
      mode,
      prompt: input.prompt,
      relevance,
      reportedScore: clampScore(
        source.overallScore ?? source.overall_score ?? source.overall,
      ),
      criteria: parsedCriteria,
      source,
    });
    const reportedOnTopic = booleanValue(source.onTopic ?? source.on_topic, relevance >= 60);
    const onTopic = reportedOnTopic && relevance >= 60;

    const aiEvaluation: TestAiFeedback = {
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
        level: `${normalizedScore.toFixed(1)}/10`,
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
    };

    results.set(input.questionId, {
      normalizedScore,
      aiEvaluation: input.scoreOnly
        ? toScoreOnlyFeedback(aiEvaluation)
        : aiEvaluation,
    });
  }

  return results;
}

function buildEvaluationMessages(
  payload: Array<Record<string, unknown>>,
  retryingInvalidJson = false,
) {
  const retryInstruction = retryingInvalidJson
    ? "\nA previous attempt was invalid JSON. Regenerate the full response from scratch. Escape all double quotes and line breaks inside string values."
    : "";

  return [
    {
      role: "system" as const,
      content: `You are a strict language examiner. Grade every submitted answer independently.
Return only compact valid JSON. Criteria and overall scores use a 0-10 scale. Task relevance uses a 0-100 scale.
Task relevance is mandatory. If the answer does not address the requested topic or required points, set onTopic=false, explain why, and score it very low.
Completely unrelated answers: relevance <=20 and overall <=1.5. Mostly unrelated answers: relevance <=40 and overall <=3. Partly off-topic answers: relevance <=60 and overall <=5.
Calibrate conservatively. A score of 5 is limited, 6 is competent with noticeable limitations, 7 requires consistently developed ideas and flexible language, 8 requires precise wide-ranging language and strong control, and 9-10 must be rare and exceptional. Start at 5 and increase only when the answer demonstrates concrete evidence for the higher level.
For writing, calculate overallScore from task_response, coherence, vocabulary, and grammar. IELTS-like Task 2 responses below 250 words must not exceed 6.5. A missing conclusion or unclear position limits task_response to 5.
For speaking transcripts, calculate overallScore from fluency, vocabulary, grammar, and pronunciation. A basic or repetitive response should normally remain at 6 or below. A transcript below 150 words must not exceed 6.5. Without acoustic audio analysis, pronunciation must not exceed 6.
Speaking transcripts may come from browser automatic speech recognition. Isolated misspellings, homophones, missing punctuation, or contextually improbable substitutions may be recognition errors. Infer an intended word only when the prompt and surrounding sentence provide strong evidence. Do not penalize that isolated token as a definite learner error, but do not excuse repeated misuse, broken grammar, or plausible learner mistakes. If uncertain, label it as a possible recognition error. Transcript spelling alone is not pronunciation evidence.
For speaking, set onTopic=true whenever the answer addresses the requested topic, even if grammar, pronunciation, fluency, or the overall score is weak.
When an input has scoreOnly=true, calculate all numeric scores normally but set every comment string, sampleAnswer, correction, and feedback array to empty. Do not provide explanations or improvement advice.
Unless scoreOnly=true, always provide a detailedComment with actionable feedback and a sampleAnswer that correctly answers the original prompt. For WRITING use about 120-180 words. For SPEAKING use a natural model response of about 80-120 words.
Use at most two items per feedback array and at most one correction. Keep the JSON concise.${retryInstruction}`,
    },
    {
      role: "user" as const,
      content: `Evaluate these test answers:
${JSON.stringify(payload)}

Return exactly:
{"results":[{"questionId":"id","language":"language","overallScore":0,"taskRelevance":0,"onTopic":true,"offTopicReason":"","criteria":{"grammar":0,"vocabulary":0,"coherence":0,"task_response":0,"fluency":0,"pronunciation":0},"band":{"system":"system","level":"level","rationale":"short"},"summary":"short","detailedComment":"clear grading comment","strengths":["short"],"weaknesses":["short"],"feedback":["short"],"suggestions":["short"],"corrections":[{"original":"text","improved":"text","reason":"short"}],"sampleAnswer":"complete model answer that directly answers the prompt"}]}`,
    },
  ];
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
          scoreOnly: Boolean(input.scoreOnly),
        }));
      let parsedResults: Map<string, TestAiAnswerResult> | null = null;
      let lastResponseError: AiEvaluationResponseError | null = null;

      for (let responseAttempt = 1; responseAttempt <= 2; responseAttempt += 1) {
        const raw = await ollamaService.chat(
          buildEvaluationMessages(payload, responseAttempt > 1),
          { maxOutputTokens: 1200 },
        );

        try {
          const parsed = parseBatchResponse(raw, chunk);
          const missingResult = chunk.some((input) => !parsed.has(input.questionId));
          if (missingResult) {
            throw new AiEvaluationResponseError("AI returned an incomplete evaluation.");
          }
          parsedResults = parsed;
          break;
        } catch (error) {
          if (!(error instanceof AiEvaluationResponseError)) throw error;
          lastResponseError = error;
          console.warn("Invalid test AI response.", {
            responseAttempt,
            responseLength: raw.length,
            error: error.message,
            retrying: responseAttempt < 2,
          });
        }
      }

      if (!parsedResults) {
        throw lastResponseError || new AiEvaluationResponseError("AI returned an invalid evaluation.");
      }

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
      const invalidResponse = error instanceof AiEvaluationResponseError;
      for (const input of chunk) {
        results.set(
          input.questionId,
          failedEvaluation(
            input,
            invalidResponse
              ? "AI returned an invalid evaluation."
              : "Could not evaluate this answer.",
            invalidResponse ? "invalid_response" : "service_unavailable",
          ),
        );
      }
    }
  }

  return results;
}

function failedEvaluation(
  input: TestAiAnswerInput,
  summary: string,
  failureReason: TestAiAnswerResult["failureReason"] = "service_unavailable",
): TestAiAnswerResult {
  return {
    normalizedScore: 0,
    failed: true,
    failureReason,
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
