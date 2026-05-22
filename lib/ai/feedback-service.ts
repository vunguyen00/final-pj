/**
 * Feedback Service
 * Processes and validates AI responses
 */

import { AIEvaluationResponse } from "./types";

/**
 * Safely parses JSON response from AI
 */
export function parseAIResponse(rawResponse: string): AIEvaluationResponse | null {
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

    // Parse JSON
    const parsed = JSON.parse(cleanedResponse);

    // Validate response structure
    if (!validateResponseStructure(parsed)) {
      console.error("Invalid response structure:", parsed);
      return null;
    }

    return parsed as AIEvaluationResponse;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    console.error("Raw response:", rawResponse);
    return null;
  }
}

/**
 * Validates AI response has required fields and correct types
 */
function validateResponseStructure(response: unknown): response is AIEvaluationResponse {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  const obj = response as Record<string, unknown>;

  // Check required fields and types
  const requiredFields: Array<[string, string]> = [
    ["language", "string"],
    ["grammar", "number"],
    ["vocabulary", "number"],
    ["coherence", "number"],
    ["task_response", "number"],
    ["overall", "number"],
    ["summary", "string"],
    ["strengths", "object"], // array
    ["weaknesses", "object"], // array
    ["feedback", "object"], // array
    ["suggestions", "object"], // array
    ["improved_version", "string"],
    ["corrections", "object"], // array
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

  // Validate arrays are not empty
  const arrayFields = ["strengths", "weaknesses", "feedback", "suggestions", "corrections"];
  for (const field of arrayFields) {
    const arr = obj[field] as unknown[];
    if (!Array.isArray(arr) || arr.length === 0) {
      console.error(`Field ${field} must be non-empty array`);
      return false;
    }
  }

  // Validate language
  const validLanguages = ["English", "Japanese", "Korean", "Chinese", "Vietnamese"];
  if (!validLanguages.includes(obj.language as string)) {
    console.error(`Invalid language: ${obj.language}`);
    return false;
  }

  return true;
}

/**
 * Sanitizes response to remove any potential sensitive data
 */
export function sanitizeResponse(response: AIEvaluationResponse): AIEvaluationResponse {
  return {
    ...response,
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
