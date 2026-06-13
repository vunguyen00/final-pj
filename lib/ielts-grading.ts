import { ollamaService } from "@/lib/ai";
import {
  calculateIeltsOverallBand,
  detectIeltsWritingTaskType,
  IeltsCriterionFeedback,
  IeltsPronunciationFeedback,
  IeltsSpeakingEvaluation,
  IeltsWritingCriterionFeedback,
  IeltsWritingEvaluation,
  IeltsWritingTaskType,
  isIeltsSpeakingEvaluation,
  isIeltsWritingEvaluation,
  roundIeltsBand,
} from "@/lib/ielts-rubric";
import {
  getIeltsWritingEvidenceCap,
  getSpeakingEvidenceCap,
  hasExplicitWritingStructure,
} from "@/lib/ai-score-calibration";

class IeltsEvaluationResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IeltsEvaluationResponseError";
  }
}

const WRITING_SCHEMA = `{
  "skill": "writing",
  "task_type": "task_1 | task_2",
  "overall_band": 6.5,
  "criteria": {
    "task_achievement_or_response": {
      "score": 6.0,
      "short_comment": "",
      "detailed_feedback": "",
      "strengths": [],
      "weaknesses": [],
      "improvement_suggestions": [],
      "examples_from_answer": [],
      "corrected_examples": []
    },
    "coherence_and_cohesion": {
      "score": 6.0,
      "short_comment": "",
      "detailed_feedback": "",
      "strengths": [],
      "weaknesses": [],
      "improvement_suggestions": [],
      "examples_from_answer": [],
      "corrected_examples": []
    },
    "lexical_resource": {
      "score": 6.0,
      "short_comment": "",
      "detailed_feedback": "",
      "strengths": [],
      "weaknesses": [],
      "improvement_suggestions": [],
      "examples_from_answer": [],
      "corrected_examples": []
    },
    "grammatical_range_and_accuracy": {
      "score": 6.0,
      "short_comment": "",
      "detailed_feedback": "",
      "strengths": [],
      "weaknesses": [],
      "improvement_suggestions": [],
      "examples_from_answer": [],
      "corrected_examples": []
    }
  },
  "final_feedback": "",
  "estimated_examiner_comment": "",
  "priority_to_improve": [],
  "model_answer": ""
}`;

const SPEAKING_SCHEMA = `{
  "skill": "speaking",
  "overall_band": 6.5,
  "criteria": {
    "fluency_and_coherence": {
      "score": 6.0,
      "short_comment": "",
      "detailed_feedback": "",
      "strengths": [],
      "weaknesses": [],
      "improvement_suggestions": []
    },
    "lexical_resource": {
      "score": 6.0,
      "short_comment": "",
      "detailed_feedback": "",
      "strengths": [],
      "weaknesses": [],
      "improvement_suggestions": []
    },
    "grammatical_range_and_accuracy": {
      "score": 6.0,
      "short_comment": "",
      "detailed_feedback": "",
      "strengths": [],
      "weaknesses": [],
      "improvement_suggestions": []
    },
    "pronunciation": {
      "score": 6.0,
      "short_comment": "",
      "detailed_feedback": "",
      "intelligibility": "",
      "word_stress": "",
      "sentence_stress": "",
      "rhythm": "",
      "connected_speech": "",
      "pronunciation_errors": [],
      "strengths": [],
      "weaknesses": [],
      "improvement_suggestions": []
    }
  },
  "final_feedback": "",
  "estimated_examiner_comment": "",
  "priority_to_improve": []
}`;

function stripMarkdownCodeFence(input: string) {
  return input
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractFirstBalancedObject(input: string) {
  const start = input.indexOf("{");
  if (start < 0) return null;

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

  return null;
}

function autoCloseJson(input: string) {
  const start = input.indexOf("{");
  if (start < 0) return null;

  const source = input.slice(start);
  const stack: string[] = [];
  let output = "";
  let inString = false;
  let escaping = false;

  for (const character of source) {
    output += character;
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

    if (character === '"') inString = true;
    if (character === "{") stack.push("}");
    if (character === "[") stack.push("]");
    if (character === "}" || character === "]") {
      const expected = stack.pop();
      if (expected !== character) return null;
    }
  }

  if (inString) output += '"';
  output = output.replace(/:\s*$/g, ": null").replace(/,\s*$/g, "");
  while (stack.length) output += stack.pop();
  return output.replace(/,\s*([}\]])/g, "$1");
}

function repairLikelyJsonStringIssues(input: string) {
  let output = "";
  let inString = false;
  let escaping = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (!inString) {
      output += character;
      if (character === '"') inString = true;
      continue;
    }

    if (escaping) {
      output += character;
      escaping = false;
      continue;
    }

    if (character === "\\") {
      output += character;
      escaping = true;
      continue;
    }

    if (character === "\n" || character === "\r") {
      output += "\\n";
      continue;
    }

    if (character !== '"') {
      output += character;
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < input.length && /\s/.test(input[nextIndex])) {
      nextIndex += 1;
    }
    const nextCharacter = input[nextIndex];
    const closesJsonString =
      nextCharacter === ":" ||
      nextCharacter === "," ||
      nextCharacter === "}" ||
      nextCharacter === "]" ||
      nextCharacter === undefined;

    if (closesJsonString) {
      output += character;
      inString = false;
    } else {
      output += '\\"';
    }
  }

  return output;
}

function parseJsonObject(raw: string) {
  const cleaned = stripMarkdownCodeFence(raw);
  const repaired = repairLikelyJsonStringIssues(cleaned);
  const candidates = [
    cleaned,
    extractFirstBalancedObject(cleaned),
    autoCloseJson(cleaned),
    repaired,
    extractFirstBalancedObject(repaired),
    autoCloseJson(repaired),
  ].filter((candidate): candidate is string => Boolean(candidate));

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown JSON error";
  throw new IeltsEvaluationResponseError(`AI returned malformed JSON: ${message}`);
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeStringArray(value: unknown, limit = 6) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeCriterion<T extends IeltsCriterionFeedback>(criterion: T): T {
  return {
    ...criterion,
    score: roundIeltsBand(Number(criterion.score)),
    short_comment: normalizeString(criterion.short_comment),
    detailed_feedback: normalizeString(criterion.detailed_feedback),
    strengths: normalizeStringArray(criterion.strengths),
    weaknesses: normalizeStringArray(criterion.weaknesses),
    improvement_suggestions: normalizeStringArray(
      criterion.improvement_suggestions,
    ),
  };
}

function normalizeWritingCriterion(
  criterion: IeltsWritingCriterionFeedback,
): IeltsWritingCriterionFeedback {
  return {
    ...normalizeCriterion(criterion),
    examples_from_answer: normalizeStringArray(criterion.examples_from_answer),
    corrected_examples: normalizeStringArray(criterion.corrected_examples),
  };
}

function normalizePronunciation(
  criterion: IeltsPronunciationFeedback,
): IeltsPronunciationFeedback {
  return {
    ...normalizeCriterion(criterion),
    intelligibility: normalizeString(criterion.intelligibility),
    word_stress: normalizeString(criterion.word_stress),
    sentence_stress: normalizeString(criterion.sentence_stress),
    rhythm: normalizeString(criterion.rhythm),
    connected_speech: normalizeString(criterion.connected_speech),
    pronunciation_errors: normalizeStringArray(criterion.pronunciation_errors),
  };
}

function normalizeWritingEvaluation(
  evaluation: IeltsWritingEvaluation,
  taskType: IeltsWritingTaskType,
  answer: string,
): IeltsWritingEvaluation {
  const criteria = {
    task_achievement_or_response: normalizeWritingCriterion(
      evaluation.criteria.task_achievement_or_response,
    ),
    coherence_and_cohesion: normalizeWritingCriterion(
      evaluation.criteria.coherence_and_cohesion,
    ),
    lexical_resource: normalizeWritingCriterion(
      evaluation.criteria.lexical_resource,
    ),
    grammatical_range_and_accuracy: normalizeWritingCriterion(
      evaluation.criteria.grammatical_range_and_accuracy,
    ),
  };
  const taskCriterion = criteria.task_achievement_or_response;
  const taskEvidence = [
    taskCriterion.short_comment,
    taskCriterion.detailed_feedback,
    ...taskCriterion.weaknesses,
  ]
    .join(" ")
    .toLowerCase();
  const missingOverview =
    taskType === "task_1" &&
    containsAny(taskEvidence, [
      "missing overview",
      "no overview",
      "lacks an overview",
      "thiếu overview",
      "không có overview",
      "thiếu phần tổng quan",
    ]);
  const missingConclusionOrPosition =
    taskType === "task_2" &&
    containsAny(taskEvidence, [
      "missing conclusion",
      "no conclusion",
      "unclear position",
      "position is unclear",
      "thiếu kết luận",
      "không có kết luận",
      "quan điểm chưa rõ",
      "lập trường chưa rõ",
    ]);
  const missingRequiredStructure =
    missingOverview ||
    missingConclusionOrPosition ||
    !hasExplicitWritingStructure(answer, taskType);
  const evidenceCap = getIeltsWritingEvidenceCap(answer, taskType);

  for (const criterion of Object.values(criteria)) {
    criterion.score = Math.min(criterion.score, evidenceCap);
  }

  if (missingRequiredStructure) {
    taskCriterion.score = Math.min(taskCriterion.score, 5);
  }

  return {
    skill: "writing",
    task_type: taskType,
    overall_band: calculateIeltsOverallBand(
      Object.values(criteria).map((criterion) => criterion.score),
    ),
    criteria,
    final_feedback: normalizeString(evaluation.final_feedback),
    estimated_examiner_comment: normalizeString(
      evaluation.estimated_examiner_comment,
    ),
    priority_to_improve: normalizeStringArray(evaluation.priority_to_improve, 5),
    model_answer: normalizeString(evaluation.model_answer),
  };
}

function normalizeSpeakingEvaluation(
  evaluation: IeltsSpeakingEvaluation,
  transcript: string,
  durationSeconds?: number | null,
  audioAnalysisAvailable = false,
): IeltsSpeakingEvaluation {
  const criteria = {
    fluency_and_coherence: normalizeCriterion(
      evaluation.criteria.fluency_and_coherence,
    ),
    lexical_resource: normalizeCriterion(evaluation.criteria.lexical_resource),
    grammatical_range_and_accuracy: normalizeCriterion(
      evaluation.criteria.grammatical_range_and_accuracy,
    ),
    pronunciation: normalizePronunciation(evaluation.criteria.pronunciation),
  };
  const responseCap = getSpeakingEvidenceCap(transcript, durationSeconds);

  for (const criterion of Object.values(criteria)) {
    criterion.score = Math.min(criterion.score, responseCap);
  }
  if (!audioAnalysisAvailable) {
    criteria.pronunciation.score = Math.min(criteria.pronunciation.score, 6);
  }

  return {
    skill: "speaking",
    overall_band: calculateIeltsOverallBand(
      Object.values(criteria).map((criterion) => criterion.score),
    ),
    criteria,
    final_feedback: normalizeString(evaluation.final_feedback),
    estimated_examiner_comment: normalizeString(
      evaluation.estimated_examiner_comment,
    ),
    priority_to_improve: normalizeStringArray(evaluation.priority_to_improve, 5),
  };
}

function containsAny(value: string, signals: string[]) {
  return signals.some((signal) => value.includes(signal));
}

async function requestValidatedEvaluation<T>(
  messagesForAttempt: (attempt: number) => Array<{
    role: "system" | "user";
    content: string;
  }>,
  validate: (value: unknown) => value is T,
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const raw = await ollamaService.chat(messagesForAttempt(attempt), {
        maxOutputTokens: 4400,
      });
      const parsed = parseJsonObject(raw);
      if (!validate(parsed)) {
        throw new IeltsEvaluationResponseError(
          "AI response does not match the required IELTS schema.",
        );
      }
      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn("Invalid IELTS grading response.", {
        attempt,
        retrying: attempt < 3,
        error: lastError.message,
      });
    }
  }

  throw lastError || new IeltsEvaluationResponseError("IELTS grading failed.");
}

export async function evaluateIeltsWriting(input: {
  prompt: string;
  answer: string;
  taskType?: IeltsWritingTaskType | null;
}) {
  const taskType = detectIeltsWritingTaskType(input.prompt, input.taskType);
  const taskSpecificRules =
    taskType === "task_1"
      ? `This is IELTS Writing Task 1. Use Task Achievement. Check that the response presents a clear overview and selects key features. If the overview is missing, Task Achievement must not exceed band 5.0.`
      : `This is IELTS Writing Task 2. Use Task Response. Check that the response presents a clear position, develops relevant ideas, and includes an appropriate conclusion. If the position is unclear or the conclusion is missing, Task Response must not exceed band 5.0.`;

  const evaluation = await requestValidatedEvaluation(
    (attempt) => [
      {
        role: "system",
        content: `You are a strict IELTS Writing examiner applying public IELTS band descriptors.
${taskSpecificRules}
Score these four criteria independently on the IELTS 0-9 scale, using only whole or half bands:
1. ${taskType === "task_1" ? "Task Achievement" : "Task Response"}
2. Coherence and Cohesion
3. Lexical Resource
4. Grammatical Range and Accuracy

The overall band is the arithmetic mean of the four criteria rounded to the nearest 0.5.
Calibrate conservatively: band 5 is limited or partially developed; band 6 is competent but has noticeable limitations; band 7 requires a clear position, sufficiently developed ideas, flexible vocabulary, and a range of structures with frequent error-free sentences. Band 8 requires fully developed ideas, precise wide-ranging vocabulary, and a wide range of structures used accurately. Band 9 is exceptional and must be rare.
Start from band 5 and move upward only when the submitted answer contains concrete evidence for every higher-band requirement. Do not infer ability that is not demonstrated.
Do not award a high band to an off-topic, memorized, underdeveloped, or substantially incomplete response.
Apply IELTS length expectations: approximately 150 words for Task 1 and 250 words for Task 2. Explain the effect of an under-length response with concrete evidence.
Every comment must cite concrete evidence from the submitted answer. Do not use vague praise such as "good job" or unexplained statements such as "needs improvement".
Keep each short_comment under 140 characters, each detailed_feedback under 700 characters, and each array at no more than 3 concise items. Avoid double quotation marks inside JSON string values; use single quotation marks for quoted words or sentences.
Write all feedback in Vietnamese. Keep quoted learner sentences and corrected English examples in English.
The model answer must directly answer the prompt and be appropriate for ${taskType === "task_1" ? "Task 1" : "Task 2"}.
Return only valid compact JSON matching the exact schema. Do not add keys or markdown.${attempt > 1 ? "\nThe previous response was invalid. Regenerate the complete JSON from scratch, shorten every text field, avoid double quotation marks inside values, and correctly escape line breaks." : ""}${attempt === 3 ? "\nThis is the final retry. Use at most 2 items in each array and keep detailed_feedback under 400 characters." : ""}`,
      },
      {
        role: "user",
        content: `<IELTS_WRITING_TASK>
${input.prompt}
</IELTS_WRITING_TASK>

<TASK_TYPE>
${taskType}
</TASK_TYPE>

<CANDIDATE_ANSWER>
${input.answer}
</CANDIDATE_ANSWER>

Required JSON schema:
${WRITING_SCHEMA}`,
      },
    ],
    isIeltsWritingEvaluation,
  );

  return normalizeWritingEvaluation(evaluation, taskType, input.answer);
}

export async function evaluateIeltsSpeaking(input: {
  prompt: string;
  transcript: string;
  conversation?: string;
  durationSeconds?: number | null;
  audioAnalysisAvailable?: boolean;
}) {
  const evaluation = await requestValidatedEvaluation(
    (attempt) => [
      {
        role: "system",
        content: `You are a strict IELTS Speaking examiner applying public IELTS band descriptors.
Score these four criteria independently on the IELTS 0-9 scale, using only whole or half bands:
1. Fluency and Coherence
2. Lexical Resource
3. Grammatical Range and Accuracy
4. Pronunciation

The overall band is the arithmetic mean of the four criteria rounded to the nearest 0.5.
Calibrate conservatively: band 5 is limited and repetitive; band 6 is generally effective but has noticeable hesitation, limited flexibility, or recurring language errors; band 7 requires sustained, flexible, well-developed speech; band 8 requires precise, natural, wide-ranging language with only occasional lapses. Band 9 is exceptional and must be rare.
Start from band 5 and move upward only when the transcript contains concrete evidence for every higher-band requirement. Do not infer ability that is not demonstrated.
Do not award a high band to an off-topic, memorized, evasive, or very short response even when its grammar is accurate.
Use the prompt, conversation, transcript, and duration to judge whether ideas are sufficiently developed.
Pronunciation evidence must be honest. If acoustic audio analysis is unavailable, do not invent exact word stress, sentence stress, rhythm, connected speech, or phonetic errors. State the limitation in Vietnamese and only mention evidence supported by the transcript.
Every comment must be specific. Do not use vague praise such as "good job" or unexplained statements such as "needs improvement".
Keep each short_comment under 140 characters, each detailed_feedback under 700 characters, and each array at no more than 3 concise items. Avoid double quotation marks inside JSON string values; use single quotation marks for quoted words or sentences.
Write all feedback in Vietnamese. Keep quoted English examples in English.
Return only valid compact JSON matching the exact schema. Do not add keys or markdown.${attempt > 1 ? "\nThe previous response was invalid. Regenerate the complete JSON from scratch, shorten every text field, avoid double quotation marks inside values, and correctly escape line breaks." : ""}${attempt === 3 ? "\nThis is the final retry. Use at most 2 items in each array and keep detailed_feedback under 400 characters." : ""}`,
      },
      {
        role: "user",
        content: `<IELTS_SPEAKING_PROMPT>
${input.prompt}
</IELTS_SPEAKING_PROMPT>

<CONVERSATION>
${input.conversation || "No turn-by-turn conversation was provided."}
</CONVERSATION>

<TRANSCRIPT>
${input.transcript}
</TRANSCRIPT>

<EVIDENCE>
Duration seconds: ${input.durationSeconds ?? "unknown"}
Acoustic audio analysis available: ${input.audioAnalysisAvailable ? "yes" : "no"}
</EVIDENCE>

Required JSON schema:
${SPEAKING_SCHEMA}`,
      },
    ],
    isIeltsSpeakingEvaluation,
  );

  return normalizeSpeakingEvaluation(
    evaluation,
    input.transcript,
    input.durationSeconds,
    input.audioAnalysisAvailable,
  );
}
