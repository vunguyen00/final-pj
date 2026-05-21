/**
 * Scoring Service
 * Orchestrates the essay evaluation process
 */

import { buildPromptMessagesWithTask, validatePromptSafety } from "./prompt-builder";
import { ollamaService } from "./ollama-service";
import {
  sanitizeEssay,
  validateEssay,
  detectLanguageFromText,
} from "./validators";
import { parseAIResponse, sanitizeResponse } from "./feedback-service";
import { AIEvaluationResponse } from "./types";

interface ScoringServiceOptions {
  maxRetries?: number;
  timeout?: number;
}

interface EvaluateEssayInput {
  essay: string;
  taskPrompt?: string;
}

class ScoringService {
  private maxRetries: number;

  constructor(options?: ScoringServiceOptions) {
    this.maxRetries = options?.maxRetries || 2;
  }

  /**
   * Main method: Evaluates an essay and returns detailed feedback
   */
  async evaluateEssay(input: string | EvaluateEssayInput): Promise<AIEvaluationResponse> {
    const startTime = Date.now();
    const essay = typeof input === "string" ? input : input.essay;
    const taskPrompt = typeof input === "string" ? undefined : input.taskPrompt;

    try {
      // 1. Validate essay input
      const validation = validateEssay(essay);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid essay");
      }

      // 2. Sanitize to prevent prompt injection
      const sanitized = sanitizeEssay(essay);

      // 3. Check for injection attempts
      if (!validatePromptSafety(sanitized)) {
        throw new Error("Essay contains suspicious patterns");
      }

      // 4. Detect language
      const detectedLanguage = detectLanguageFromText(sanitized);
      this.log("info", {
        action: "evaluateEssay",
        stage: "detected_language",
        language: detectedLanguage,
      });

      // 5. Get AI evaluation with retry logic
      const aiResponse = await this.getAIEvaluationWithRetry(sanitized, taskPrompt);

      // 6. Parse and validate response
      if (!aiResponse) {
        throw new Error("Failed to get valid AI response after retries");
      }

      // 7. Sanitize response
      const sanitizedResponse = sanitizeResponse(aiResponse);

      // 8. Log success
      const duration = Date.now() - startTime;
      this.log("success", {
        action: "evaluateEssay",
        duration,
        language: sanitizedResponse.language,
        overall_score: sanitizedResponse.overall,
      });

      return sanitizedResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.log("error", {
        action: "evaluateEssay",
        duration,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Gets AI evaluation with retry logic for invalid responses
   */
  private async getAIEvaluationWithRetry(
    essay: string,
    taskPrompt?: string
  ): Promise<AIEvaluationResponse | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.log("info", {
          action: "getAIEvaluation",
          attempt,
          maxRetries: this.maxRetries,
        });

        // Build prompt messages
        const messages = buildPromptMessagesWithTask(essay, taskPrompt);

        // Call Ollama API
        const rawResponse = await ollamaService.chat(messages);

        // Parse response
        const parsed = parseAIResponse(rawResponse);
        if (parsed) {
          return parsed;
        }

        // If parsing failed, try again (except on last attempt)
        lastError = new Error("Invalid AI response format");

        if (attempt < this.maxRetries) {
          this.log("info", {
            action: "getAIEvaluation",
            attempt,
            status: "retrying",
          });
          // Small delay before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          this.log("info", {
            action: "getAIEvaluation",
            attempt,
            status: "retrying",
            error: lastError.message,
          });
          // Small delay before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    this.log("error", {
      action: "getAIEvaluation",
      status: "failed_all_retries",
      error: lastError?.message,
    });

    return null;
  }

  /**
   * Logs evaluation events
   */
  private log(level: "info" | "success" | "error", data: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: "ScoringService",
      ...data,
    };

    if (level === "error") {
      console.error("[ScoringService]", JSON.stringify(logEntry));
    } else if (level === "success" || process.env.NODE_ENV === "development") {
      console.log("[ScoringService]", JSON.stringify(logEntry));
    }
  }
}

// Export singleton instance
export const scoringService = new ScoringService();

// Export class for testing
export { ScoringService };
