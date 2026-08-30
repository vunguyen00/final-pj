import { geminiService } from "@/lib/ai";
import { getCertificateRubric, weightedScoreFromCriteria } from "@/lib/ai-rubrics";
import { getSpeakingExamTypeForLanguageCode } from "@/lib/test-rules";
import { normalizeFeedbackTextItems } from "@/lib/ai-feedback-normalization";
import { parseAiJsonObject } from "@/lib/ai-json-repair";
import {
  getSampleAnswerCompletenessError,
  getWritingSampleAnswerWordRange,
} from "@/lib/test-ai-sample-answer";
import {
  averageScoreKeys,
  capScoreRecord,
  detectLikelyIeltsWritingTask,
  getClassroomSpeakingEvidenceCap,
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
  totalScore?: number;
  taskRelevance?: number;
  onTopic?: boolean;
  offTopicReason?: string;
  detailedComment?: string;
  sampleAnswer?: string;
  criteria?: Record<string, number>;
  criteriaScores?: Record<string, number>;
  criteriaFeedback?: Record<string, TestAiCriterionFeedback>;
  majorErrors?: string[];
  improvementsNeeded?: string[];
  certificateFit?: string;
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

export type TestAiCriterionFeedback = {
  score: number;
  shortComment: string;
  detailedFeedback: string;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  examplesFromAnswer: string[];
  correctedExamples: string[];
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

export function getTestAiScoreRatio(result: TestAiAnswerResult) {
  const totalScore = Number(result.aiEvaluation.totalScore);
  if (Number.isFinite(totalScore) && totalScore > 0) {
    return Math.max(0, Math.min(100, totalScore)) / 100;
  }

  const normalizedScore = Number(result.normalizedScore);
  return Number.isFinite(normalizedScore)
    ? Math.max(0, Math.min(10, normalizedScore)) / 10
    : 0;
}

class AiEvaluationResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiEvaluationResponseError";
  }
}

const TEST_AI_TOTAL_OUTPUT_BUDGET = Math.max(
  256,
  Number(process.env.TEST_AI_TOTAL_OUTPUT_BUDGET) || 12_000,
);

function clampScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0;
}

function clampPercent(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 100;
  return Math.max(0, Math.min(100, score <= 10 ? score * 10 : score));
}

function clampCriterionPercent(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, score <= 10 ? score * 10 : score));
}

const feedbackLabelPrefixPattern =
  /^(?:strengths?|weaknesses?|areas?\s+to\s+improve|detailed\s+feedback|feedback|suggestions?|errors?|major\s+errors?|improvements?\s+needed|sample\s+answer|model\s+answer|pronunciation\s+errors?|grammar\s+errors?|vocabulary\s+errors?|fluency\s+issues?|practice\s+methods?)\s*[:：\-–]\s*/i;

function cleanFeedbackText(value: unknown) {
  return String(value).trim().replace(feedbackLabelPrefixPattern, "").trim();
}

function stringArray(value: unknown) {
  const items: string[] = [];
  for (const item of normalizeFeedbackTextItems(value)) {
    const trimmed = cleanFeedbackText(item);
    if (trimmed) items.push(trimmed);
    if (items.length >= 6) break;
  }
  return items;
}

function correctionArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  const corrections: Array<{ original: string; improved: string; reason: string }> = [];
  for (const item of value) {
    const correction = item as Record<string, unknown>;
    const parsed = {
      original: String(correction.original || correction.sentence || ""),
      improved: String(correction.improved || correction.correction || ""),
      reason: String(correction.reason || ""),
    };
    if (parsed.original || parsed.improved) corrections.push(parsed);
    if (corrections.length >= 4) break;
  }
  return corrections;
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function criterionSpecificFallback(source: Record<string, unknown>, key: string) {
  if (key === "grammar") return source.grammarErrors ?? source.grammar_errors;
  if (key === "vocabulary") return source.vocabularyErrors ?? source.vocabulary_errors;
  if (key === "pronunciation") return source.pronunciationErrors ?? source.pronunciation_errors;
  if (key === "fluency") return source.fluencyIssues ?? source.fluency_issues;
  return source.majorErrors ?? source.major_errors ?? source.weaknesses;
}

function criterionFeedbackMap(
  source: Record<string, unknown>,
  rubric: ReturnType<typeof getCertificateRubric>,
  criteriaScores: Record<string, number>,
) {
  const rawMap = recordValue(
    source.criteriaFeedback ?? source.criteria_feedback ?? source.criterionFeedback,
  );

  return Object.fromEntries(rubric.criteria.map((criterion) => {
    const raw = recordValue(rawMap[criterion.key]);
    return [criterion.key, {
      score: Math.round((criteriaScores[criterion.key] ?? 0)) / 10,
      shortComment: String(raw.shortComment ?? raw.short_comment ?? "").trim(),
      detailedFeedback: String(raw.detailedFeedback ?? raw.detailed_feedback ?? "").trim(),
      strengths: stringArray(raw.strengths ?? source.strengths),
      weaknesses: stringArray(raw.weaknesses ?? criterionSpecificFallback(source, criterion.key)),
      improvementSuggestions: stringArray(
        raw.improvementSuggestions ?? raw.improvement_suggestions ?? source.suggestions,
      ),
      examplesFromAnswer: stringArray(raw.examplesFromAnswer ?? raw.examples_from_answer),
      correctedExamples: stringArray(raw.correctedExamples ?? raw.corrected_examples),
    } satisfies TestAiCriterionFeedback];
  }));
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function getTargetLanguageName(languageCode?: string | null) {
  const normalized = (languageCode || "").toLowerCase();
  if (normalized.startsWith("ja") || normalized.startsWith("jp")) return "Japanese";
  if (normalized.startsWith("zh") || normalized.startsWith("cn")) return "Chinese";
  if (normalized.startsWith("ko") || normalized.startsWith("kr")) return "Korean";
  if (normalized.startsWith("vi") || normalized.startsWith("vn")) return "Vietnamese";
  if (normalized.startsWith("en")) return "English";
  return "the submitted language";
}

function toScoreOnlyFeedback(feedback: TestAiFeedback): TestAiFeedback {
  return {
    mode: feedback.mode,
    scoreOnly: true,
    language: feedback.language,
    overallScore: feedback.overallScore,
    totalScore: feedback.totalScore,
    taskRelevance: feedback.taskRelevance,
    onTopic: feedback.onTopic,
    offTopicReason: "",
    detailedComment: "",
    sampleAnswer: "",
    criteria: feedback.criteria,
    criteriaScores: feedback.criteriaScores,
    criteriaFeedback: Object.fromEntries(
      Object.entries(feedback.criteriaFeedback || {}).map(([key, criterion]) => [key, {
        ...criterion,
        shortComment: "",
        detailedFeedback: "",
        strengths: [],
        weaknesses: [],
        improvementSuggestions: [],
        examplesFromAnswer: [],
        correctedExamples: [],
      }]),
    ),
    majorErrors: [],
    improvementsNeeded: [],
    certificateFit: feedback.certificateFit,
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
  if (!signals.length) return false;
  return new RegExp(signals.map(escapeRegExp).join("|")).test(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function calibrateTestScore(input: {
  answer: string;
  mode: "WRITING" | "SPEAKING";
  prompt?: string;
  relevance: number;
  reportedScore: number;
  certificateScore?: number;
  criteria: Record<string, number>;
  source: Record<string, unknown>;
  scoringProfile?: "strict" | "classroom";
}) {
  const isStrictProfile = input.scoringProfile !== "classroom";
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
      : getGeneralWritingEvidenceCap(input.answer, input.prompt);

    if (taskType && isStrictProfile) {
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
    evidenceCap = isStrictProfile
      ? getSpeakingEvidenceCap(input.answer)
      : getClassroomSpeakingEvidenceCap(input.answer);
    if (isStrictProfile && Number.isFinite(criteria.pronunciation)) {
      criteria.pronunciation = Math.min(criteria.pronunciation, 6);
    }
  }

  criteria = capScoreRecord(criteria, Math.min(evidenceCap, relevanceCap));
  const relevantCriteria =
    input.mode === "WRITING"
      ? ["task_response", "coherence", "vocabulary", "grammar"]
      : ["fluency", "vocabulary", "grammar", "pronunciation"];
  const criteriaAverage = averageScoreKeys(criteria, relevantCriteria);
  const hasCertificateScore = Number.isFinite(input.certificateScore);
  const rubricScoreSource = hasCertificateScore
    ? Number(input.certificateScore)
    : criteriaAverage ?? input.reportedScore;
  const rubricAlignedScore = isStrictProfile
    ? roundToHalf(rubricScoreSource)
    : Math.round(Math.max(0, Math.min(10, rubricScoreSource)) * 10) / 10;
  const classroomScore =
    criteriaAverage == null && !Number.isFinite(input.certificateScore)
      ? input.reportedScore
      : hasCertificateScore && input.relevance >= 80
        ? rubricAlignedScore
        : input.relevance >= 80
        ? Math.min(
            Math.max(input.reportedScore, rubricAlignedScore - 0.5),
            rubricAlignedScore + 0.5,
          )
        : input.relevance >= 60
          ? Math.min(
              Math.max(input.reportedScore, rubricAlignedScore - 1),
              rubricAlignedScore + 0.5,
            )
          : Math.min(input.reportedScore, rubricAlignedScore);
  const rawNormalizedScore = Math.min(
    isStrictProfile
      ? Math.min(input.reportedScore, criteriaAverage ?? input.reportedScore)
      : classroomScore,
    evidenceCap,
    relevanceCap,
  );
  const normalizedScore = isStrictProfile
    ? roundToHalf(rawNormalizedScore)
    : Math.round(Math.max(0, Math.min(10, rawNormalizedScore)) * 10) / 10;

  return { criteria, normalizedScore };
}

function parseBatchResponse(raw: string, inputs: TestAiAnswerInput[]) {
  let parsed: unknown;

  try {
    const parsedJson = parseAiJsonObject(raw);
    parsed = parsedJson.value;
    if (parsedJson.repaired) {
      console.warn("Recovered a truncated test AI JSON response.", { responseLength: raw.length });
    }
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

  for (let inputIndex = 0; inputIndex < inputs.length; inputIndex += 1) {
    const input = inputs[inputIndex];
    const source = sourceById.get(input.questionId) || parsedResults[inputIndex];
    if (!source) continue;

    const mode = input.mode;
    const relevance = clampPercent(source.taskRelevance ?? source.task_relevance ?? 100);
    const rawBand = (source.band || {}) as Record<string, unknown>;
    const rawCriteria = (source.criteria || {}) as Record<string, unknown>;
    const reportedOverall = source.overallScore ?? source.overall_score ?? source.overall;
    if (!Number.isFinite(Number(reportedOverall)) || Object.keys(rawCriteria).length === 0) {
      throw new AiEvaluationResponseError("AI response is missing core scores.");
    }
    const rubric = getCertificateRubric(input.languageCode, mode);
    const rawCriteria100 = (
      source.criteriaScores ??
      source.criteria_scores ??
      source.rubricCriteria ??
      source.rubric_criteria ??
      source.criteria ??
      {}
    ) as Record<string, unknown>;
    const criteriaScores = Object.fromEntries(
      rubric.criteria.map((item) => [
        item.key,
        clampCriterionPercent(rawCriteria100[item.key] ?? rawCriteria[item.key]),
      ]),
    );
    const rubricCriteria = Object.fromEntries(
      rubric.criteria.map((item) => [
        item.key,
        Math.round((criteriaScores[item.key] ?? 0)) / 10,
      ]),
    );
    const reportedTotalScore = clampCriterionPercent(
      source.totalScore ??
        source.total_score ??
        source.overallScore100 ??
        source.overall_score_100,
    );
    const totalScore = reportedTotalScore || weightedScoreFromCriteria(criteriaScores, rubric);
    const parsedCriteria = Object.fromEntries(
      Object.entries(rawCriteria).map(([key, value]) => [key, clampScore(value)]),
    );
    const { normalizedScore } = calibrateTestScore({
      answer: input.answer,
      mode,
      prompt: input.prompt,
      relevance,
      reportedScore: clampScore(reportedOverall),
      certificateScore: totalScore / 10,
      criteria: parsedCriteria,
      source,
      scoringProfile: rubric.system === "IELTS" ? "strict" : "classroom",
    });
    const reportedOnTopic = booleanValue(source.onTopic ?? source.on_topic, relevance >= 60);
    const onTopic = reportedOnTopic && relevance >= 60;

    const aiEvaluation: TestAiFeedback = {
      mode,
      language: String(source.language || getTargetLanguageName(input.languageCode)),
      overallScore: normalizedScore,
      totalScore,
      taskRelevance: relevance,
      onTopic,
      offTopicReason: String(
        source.offTopicReason ??
        source.off_topic_reason ??
        (onTopic ? "" : "The answer does not sufficiently address the original prompt."),
      ),
      detailedComment: String(source.detailedComment ?? source.detailed_comment ?? source.summary ?? ""),
      sampleAnswer: String(source.sampleAnswer ?? source.sample_answer ?? ""),
      criteria: rubricCriteria,
      criteriaScores,
      criteriaFeedback: criterionFeedbackMap(source, rubric, criteriaScores),
      majorErrors: stringArray(source.majorErrors ?? source.major_errors ?? source.weaknesses),
      improvementsNeeded: stringArray(source.improvementsNeeded ?? source.improvements_needed ?? source.suggestions),
      certificateFit: String(source.certificateFit ?? source.certificate_fit ?? ""),
      band: {
        system: String(rawBand.system || rubric.system),
        level: String(rawBand.level || `${totalScore}/100`),
        score: Number(rawBand.score ?? normalizedScore),
        rationale: String(rawBand.rationale || ""),
      },
      summary: String(source.summary || "AI evaluation completed."),
      strengths: stringArray(source.strengths),
      weaknesses: stringArray(source.weaknesses ?? source.majorErrors ?? source.major_errors),
      feedback: stringArray(source.feedback ?? source.detailedFeedback ?? source.detailed_comment),
      suggestions: stringArray(source.suggestions ?? source.improvementsNeeded ?? source.improvements_needed),
      corrections: correctionArray(source.corrections),
      pronunciationErrors: stringArray(source.pronunciationErrors ?? source.pronunciation_errors ?? (mode === "SPEAKING" ? source.majorErrors ?? source.major_errors : undefined)),
      grammarErrors: stringArray(source.grammarErrors ?? source.grammar_errors),
      vocabularyErrors: stringArray(source.vocabularyErrors ?? source.vocabulary_errors),
      fluencyIssues: stringArray(source.fluencyIssues ?? source.fluency_issues),
      practiceMethods: stringArray(source.practiceMethods ?? source.practice_methods ?? (mode === "SPEAKING" ? source.suggestions : undefined)),
    };

    const sampleAnswerError = getSampleAnswerCompletenessError(
      input,
      aiEvaluation.sampleAnswer || "",
    );
    if (sampleAnswerError) {
      throw new AiEvaluationResponseError(sampleAnswerError);
    }

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
  const scoreOnly = payload.every((item) => item.scoreOnly === true);
  const retryInstruction = retryingInvalidJson
    ? " A previous response was invalid or truncated. Return shorter valid JSON and finish every string."
    : "";

  if (scoreOnly) {
    return [
      {
        role: "system" as const,
        content: `You are a language examiner. Return only compact valid JSON and do not explain your reasoning.
Grade each answer independently. overallScore and criteria use 0-10; criteriaScores, totalScore, and taskRelevance use 0-100.
For WRITING, criteria must contain task_response, coherence, vocabulary, and grammar. For SPEAKING, criteria must contain fluency, vocabulary, grammar, and pronunciation.
criteriaScores must use every exact key from certificateRubric.criteria. Set onTopic=false and score very low for an unrelated answer.${retryInstruction}`,
      },
      {
        role: "user" as const,
        content: `Evaluate: ${JSON.stringify(payload)}
Return exactly this compact shape with no feedback text:
{"results":[{"questionId":"id","language":"language","overallScore":0,"totalScore":0,"taskRelevance":0,"onTopic":true,"criteria":{"criterion_key":0},"criteriaScores":{"rubric_key":0},"band":{"system":"system","level":"level","score":0}}]}`,
      },
    ];
  }

  return [
    {
      role: "system" as const,
      content: `You are a fair language examiner. Return only compact valid JSON and do not reveal reasoning.
Grade each answer in its targetLanguage. overallScore and the four core criteria use 0-10. criteriaScores and weighted totalScore use 0-100 and every exact key from certificateRubric.criteria.
WRITING core criteria: task_response, coherence, vocabulary, grammar. SPEAKING core criteria: fluency, vocabulary, grammar, pronunciation. A relevant competent answer is about 6, a solid answer about 7, strong control about 8, and 9-10 is rare. Set onTopic=false, relevance <=20, and overall <=1.5 for unrelated answers.
For short classroom prompts, a concise complete answer can score 7-9; do not default to 5 when the rubric criteria are high.
Return actionable feedback in targetLanguage. The sampleAnswer must answer the original prompt, contain the exact sampleAnswerWordRange for WRITING, and end with complete punctuation; use 60-90 words for SPEAKING.
Return exactly the requested fields: do not add criteriaFeedback, band, certificateFit, majorErrors, improvementsNeeded, feedback, or mode-specific error arrays. Use two short sentences for detailedComment and exactly one concise item in strengths, weaknesses, and suggestions. Include at most one correction. Keep all prose except sampleAnswer under 35 words per field.${retryInstruction}`,
    },
    {
      role: "user" as const,
      content: `Evaluate: ${JSON.stringify(payload)}
Return this shape:
{"results":[{"questionId":"id","language":"language","overallScore":0,"totalScore":0,"taskRelevance":0,"onTopic":true,"offTopicReason":"","criteria":{"criterion_key":0},"criteriaScores":{"rubric_key":0},"summary":"short","detailedComment":"two short sentences","strengths":["one"],"weaknesses":["one"],"suggestions":["one"],"corrections":[{"original":"text","improved":"text","reason":"short"}],"sampleAnswer":"complete answer"}]}`,
    },
  ];
}

function getRequestedWritingSampleRange(prompt?: string) {
  const range = getWritingSampleAnswerWordRange(prompt);
  if (range.source !== "prompt") return range;

  const bufferedMin = Math.ceil(range.min * 1.08);
  return {
    ...range,
    min: range.max === null ? bufferedMin : Math.min(bufferedMin, range.max),
  };
}

export async function evaluateTestAiAnswers(inputs: TestAiAnswerInput[]) {
  const results = new Map<string, TestAiAnswerResult>();
  if (!inputs.length) return results;

  const perAnswerBudget = Math.max(
    256,
    Math.floor(TEST_AI_TOTAL_OUTPUT_BUDGET / inputs.length),
  );
  const responseAttempts = perAnswerBudget >= 1_600 ? 2 : 1;
  const tokensPerAttempt = Math.max(
    256,
    Math.floor(perAnswerBudget / responseAttempts),
  );

  // A submit request can contain several writing/speaking answers. Evaluating
  // them serially easily exceeds the upstream proxy timeout, which surfaces in
  // the browser as an unhelpful `Failed to fetch`. Keep each answer isolated
  // for reliable JSON parsing, but evaluate the independent answers together.
  const evaluated = await Promise.all(inputs.map(async (input) => {
    const chunk = [input];
    const deadline = Date.now() + 105_000;
    try {
      const payload = chunk.map((input) => ({
        questionId: input.questionId,
        mode: input.mode,
        exam:
          input.mode === "SPEAKING"
            ? input.examType || getSpeakingExamTypeForLanguageCode(input.languageCode)
            : input.examType || "GENERAL_WRITING",
        certificateRubric: getCertificateRubric(input.languageCode, input.mode),
        languageCode: input.languageCode || "",
        targetLanguage: getTargetLanguageName(input.languageCode),
        sampleAnswerWordRange:
          input.mode === "WRITING"
            ? getRequestedWritingSampleRange(input.prompt)
            : { min: 60, max: 90, source: "default" },
        prompt: input.prompt || "",
        answer: input.answer,
        scoreOnly: Boolean(input.scoreOnly),
      }));
      let parsedResults: Map<string, TestAiAnswerResult> | null = null;
      let lastResponseError: AiEvaluationResponseError | null = null;

      for (let responseAttempt = 1; responseAttempt <= responseAttempts; responseAttempt += 1) {
        const remainingTime = deadline - Date.now();
        if (remainingTime < 1_000) {
          throw new Error("AI evaluation exceeded its request time budget.");
        }
        const raw = await geminiService.chat(
          buildEvaluationMessages(payload, responseAttempt > 1),
          {
            maxOutputTokens: input.scoreOnly
              ? Math.min(900, tokensPerAttempt)
              : Math.min(3000, tokensPerAttempt),
            timeoutMs: remainingTime,
            maxRetries: 1,
            think: false,
          },
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
            retrying: responseAttempt < responseAttempts,
          });
        }
      }

      if (!parsedResults) {
        throw lastResponseError || new AiEvaluationResponseError("AI returned an invalid evaluation.");
      }

      const parsed = parsedResults.get(input.questionId);
      return [
        input.questionId,
        parsed || failedEvaluation(input, "AI returned an incomplete evaluation."),
      ] as const;
    } catch (error) {
      console.error("Error evaluating test AI answer chunk:", error);
      const invalidResponse = error instanceof AiEvaluationResponseError;
      return [
        input.questionId,
        failedEvaluation(
          input,
          invalidResponse
            ? "AI returned an invalid evaluation."
            : "Could not evaluate this answer.",
          invalidResponse ? "invalid_response" : "service_unavailable",
        ),
      ] as const;
    }
  }));

  for (const [questionId, result] of evaluated) results.set(questionId, result);

  return results;
}

function failedEvaluation(
  input: TestAiAnswerInput,
  summary: string,
  failureReason: TestAiAnswerResult["failureReason"] = "service_unavailable",
): TestAiAnswerResult {
  const fallback = getEvaluationFailureCopy(input.languageCode, summary);
  return {
    normalizedScore: 0,
    failed: true,
    failureReason,
    aiEvaluation: {
      mode: input.mode,
      language: getTargetLanguageName(input.languageCode),
      overallScore: 0,
      summary: fallback.summary || summary,
      strengths: [],
      weaknesses: [fallback.unavailable],
      feedback: [],
      suggestions: [fallback.retry],
      corrections: [],
    },
  };
}

function getEvaluationFailureCopy(
  languageCode: string | null | undefined,
  fallbackSummary: string,
) {
  const language = getTargetLanguageName(languageCode);
  if (language === "Vietnamese") {
    return {
      summary: "Không thể tạo nhận xét AI cho câu trả lời này.",
      unavailable: "Dịch vụ nhận xét AI đang tạm thời không khả dụng.",
      retry: "Vui lòng làm lại bài test sau.",
    };
  }
  if (language === "Chinese") {
    return {
      summary: "暂时无法为此答案生成 AI 反馈。",
      unavailable: "AI 反馈服务暂时不可用。",
      retry: "请稍后重新参加测试。",
    };
  }
  if (language === "Japanese") {
    return {
      summary: "この回答のAIフィードバックを生成できませんでした。",
      unavailable: "AIフィードバックサービスは一時的に利用できません。",
      retry: "時間をおいて再度テストを受けてください。",
    };
  }
  if (language === "Korean") {
    return {
      summary: "이 답변에 대한 AI 피드백을 생성할 수 없습니다.",
      unavailable: "AI 피드백 서비스를 일시적으로 사용할 수 없습니다.",
      retry: "잠시 후 테스트를 다시 응시해 주세요.",
    };
  }
  return {
    summary: fallbackSummary,
    unavailable: "AI evaluation is temporarily unavailable.",
    retry: "Please try submitting the test again.",
  };
}
