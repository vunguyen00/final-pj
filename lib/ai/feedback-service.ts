/**
 * Feedback Service
 * Processes and validates AI responses
 */

import { AIEvaluationResponse } from "./types";

/**
 * Safely parses JSON response from AI
 */
export function parseAIResponse(rawResponse: string): AIEvaluationResponse | null {
  const tryParse = (input: string): AIEvaluationResponse | null => {
    const parsed = normalizeAIResponse(JSON.parse(input));
    if (!validateResponseStructure(parsed)) {
      console.error("Invalid response structure:", parsed);
      return null;
    }
    return parsed as AIEvaluationResponse;
  };

  try {
    // Clean the response (remove markdown code blocks if present)
    let cleanedResponse = rawResponse.trim();

    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7); // Remove ```json
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3); // Remove ```
    }

    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3); // Remove trailing ```
    }

    cleanedResponse = cleanedResponse.trim();

    // Parse strict JSON first
    const strict = tryParse(cleanedResponse);
    if (strict) return strict;

    // Fallback: extract first JSON object from mixed text response
    const start = cleanedResponse.indexOf("{");
    const end = cleanedResponse.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const jsonSlice = cleanedResponse.slice(start, end + 1);
      const extracted = tryParse(jsonSlice);
      if (extracted) return extracted;
    }

    return null;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    console.error("Raw response:", rawResponse);
    return null;
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function normalizeScore(value: unknown): number {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0;
}

function normalizeAIResponse(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) return {};

  const source = value as Record<string, unknown>;
  const evaluation = source.evaluation as Record<string, unknown> | undefined;
  const scores = evaluation?.scores as Record<string, unknown> | undefined;
  const analysis = source.analysis as Record<string, unknown> | undefined;
  const improvements = source.improvements as Record<string, unknown> | undefined;

  const normalized: Record<string, unknown> = {
    ...source,
    language: source.language ?? evaluation?.language ?? "English",
    grammar: normalizeScore(source.grammar ?? scores?.grammar),
    vocabulary: normalizeScore(source.vocabulary ?? scores?.vocabulary),
    coherence: normalizeScore(source.coherence ?? scores?.coherence),
    task_response: normalizeScore(source.task_response ?? scores?.task_response),
    overall: normalizeScore(source.overall ?? scores?.overall),
    summary: String(source.summary ?? evaluation?.summary ?? "").trim(),
    strengths: normalizeStringArray(source.strengths ?? analysis?.strengths),
    weaknesses: normalizeStringArray(source.weaknesses ?? analysis?.weaknesses),
    feedback: normalizeStringArray(source.feedback ?? analysis?.feedback),
    suggestions: normalizeStringArray(source.suggestions ?? analysis?.suggestions),
    improved_version: String(source.improved_version ?? improvements?.improved_version ?? "").trim(),
  };

  if (!normalized.overall) {
    normalized.overall =
      (Number(normalized.grammar) +
        Number(normalized.vocabulary) +
        Number(normalized.coherence) +
        Number(normalized.task_response)) /
      4;
  }

  const correctionsSource = source.corrections ?? improvements?.corrections;
  normalized.corrections = Array.isArray(correctionsSource)
    ? correctionsSource
        .map((item) => {
          const correction = item as Record<string, unknown>;
          const improved = correction.improved ?? correction.suggestion ?? correction.corrected;
          return {
            original: String(correction.original ?? "").trim(),
            improved: String(improved ?? "").trim(),
            reason: String(correction.reason ?? "Suggested wording improvement.").trim(),
          };
        })
        .filter((item) => item.original && item.improved)
    : [];

  if (!normalized.summary) {
    normalized.summary = "AI evaluation completed.";
  }
  if ((normalized.strengths as string[]).length === 0) {
    normalized.strengths = ["The response addresses the writing task."];
  }
  if ((normalized.weaknesses as string[]).length === 0) {
    normalized.weaknesses = ["The response needs more detail and clearer development."];
  }
  if ((normalized.feedback as string[]).length === 0) {
    normalized.feedback = [String(normalized.summary)];
  }
  if ((normalized.suggestions as string[]).length === 0) {
    normalized.suggestions = ["Add more specific examples and connect ideas with clearer transitions."];
  }
  if ((normalized.corrections as unknown[]).length === 0) {
    normalized.corrections = [
      {
        original: "No specific correction provided.",
        improved: "Review the essay for grammar, vocabulary, and coherence improvements.",
        reason: "The model did not return phrase-level corrections.",
      },
    ];
  }

  return normalized;
}

/**
 * Validates AI response has required fields and correct types
 */
function validateResponseStructure(response: unknown): response is AIEvaluationResponse {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  const obj = response as Record<string, unknown>;

  // Check key fields and types
  const requiredFields: Array<[string, string]> = [
    ["language", "string"],
    ["grammar", "number"],
    ["vocabulary", "number"],
    ["coherence", "number"],
    ["task_response", "number"],
    ["overall", "number"],
    ["summary", "string"],
  ];

  for (const [field, expectedType] of requiredFields) {
    if (!(field in obj)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }

    const fieldType = typeof obj[field];
    if (expectedType === "object" && !Array.isArray(obj[field])) {
      console.error(`Field ${field} must be an array`);
      return false;
    }

    if (expectedType !== "object" && fieldType !== expectedType) {
      console.error(`Field ${field} has wrong type: ${fieldType}, expected ${expectedType}`);
      return false;
    }
  }

  // Validate score ranges
  const scores = ["grammar", "vocabulary", "coherence", "task_response", "overall"];
  for (const score of scores) {
    const value = obj[score] as number;
    if (typeof value !== "number" || value < 0 || value > 10) {
      console.error(`Score ${score} must be between 0-10, got ${value}`);
      return false;
    }
  }

  // Validate optional array fields if present
  const arrayFields = ["strengths", "weaknesses", "feedback", "suggestions", "corrections"];
  for (const field of arrayFields) {
    const value = obj[field];
    if (value == null) continue;
    if (!Array.isArray(value)) {
      console.error(`Field ${field} must be an array`);
      return false;
    }
  }

  if (typeof obj.language !== "string" || !obj.language.trim()) {
    console.error(`Invalid language: ${obj.language}`);
    return false;
  }

  return true;
}

/**
 * Sanitizes response to remove any potential sensitive data
 */
export function sanitizeResponse(response: AIEvaluationResponse): AIEvaluationResponse {
  const normalizeLanguage = (language: unknown): AIEvaluationResponse["language"] => {
    const raw = String(language || "").trim().toLowerCase();
    if (raw.includes("japan")) return "Japanese";
    if (raw.includes("korea")) return "Korean";
    if (raw.includes("china") || raw.includes("chinese")) return "Chinese";
    if (raw.includes("viet")) return "Vietnamese";
    return "English";
  };

  return {
    ...response,
    language: normalizeLanguage(response.language),
    band: {
      system: response.band?.system || "GENERAL",
      level: response.band?.level || "Intermediate",
      score: Number(response.band?.score ?? response.overall),
      rationale: String(response.band?.rationale || "").trim(),
    },
    task_requirements: {
      prompt_understanding: String(response.task_requirements?.prompt_understanding || "").trim(),
      addressed_points: (response.task_requirements?.addressed_points || [])
        .map((p) => String(p).trim())
        .filter(Boolean),
      missing_points: (response.task_requirements?.missing_points || [])
        .map((p) => String(p).trim())
        .filter(Boolean),
    },
    writing_structure: response.writing_structure
      ? {
          exam: String(response.writing_structure.exam || "GENERAL").trim(),
          task_type: String(response.writing_structure.task_type || "").trim(),
          sections: (response.writing_structure.sections || [])
            .map((section) => ({
              name: String(section.name || "").trim(),
              score: Number(section.score || 0),
              max_score: Number(section.max_score || 10),
              feedback: String(section.feedback || "").trim(),
            }))
            .filter((section) => section.name),
        }
      : undefined,
    // Ensure no null/undefined values
    summary: response.summary || "",
    strengths: (response.strengths || []).map((s) => String(s).trim()).filter(Boolean),
    weaknesses: (response.weaknesses || []).map((w) => String(w).trim()).filter(Boolean),
    feedback: (response.feedback || []).map((f) => String(f).trim()).filter(Boolean),
    suggestions: (response.suggestions || []).map((s) => String(s).trim()).filter(Boolean),
    improved_version: response.improved_version || "",
    corrections: (response.corrections || [])
      .map((c) => ({
        original: String(c.original || "").trim(),
        improved: String(c.improved || "").trim(),
        reason: String(c.reason || "").trim(),
      }))
      .filter((c) => c.original && c.improved && c.reason),
  };
}

/**
 * Formats response for API clients
 */
export function formatResponseForClient(response: AIEvaluationResponse) {
  return {
    evaluation: {
      scores: {
        grammar: response.grammar,
        vocabulary: response.vocabulary,
        coherence: response.coherence,
        task_response: response.task_response,
        overall: response.overall,
      },
      summary: response.summary,
      language: response.language,
      band: response.band,
      task_requirements: response.task_requirements,
      writing_structure: response.writing_structure,
    },
    analysis: {
      strengths: response.strengths,
      weaknesses: response.weaknesses,
      feedback: response.feedback,
      suggestions: response.suggestions,
    },
    improvements: {
      corrections: response.corrections,
      improved_version: response.improved_version,
    },
  };
}
