/**
 * Ollama AI Service
 * Handles communication with Ollama API
 */

import {
  AIServiceConfig,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaMessage,
} from "./types";

const DEFAULT_CLOUD_MODEL = "minimax-m3:cloud";

function positiveIntegerFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

const DEFAULT_CONFIG: AIServiceConfig = {
  ollamaUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
  model: process.env.OLLAMA_MODEL || DEFAULT_CLOUD_MODEL,
  temperature: 0,
  top_p: 0.1,
  timeout: positiveIntegerFromEnv("OLLAMA_TIMEOUT_MS", 180000),
  maxRetries: positiveIntegerFromEnv("OLLAMA_MAX_RETRIES", 2),
};

const ALLOWED_CLOUD_MODELS = new Set([
  DEFAULT_CLOUD_MODEL,
  "nemotron-3-super:cloud",
  "qwen2.5:7b",
  "gemma4:latest",
]);

class OllamaService {
  private config: AIServiceConfig;
  private readonly maxOutputTokens: number;
  private readonly retryDelayMs: number;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const configuredMax = Number(process.env.OLLAMA_NUM_PREDICT ?? 3200);
    this.maxOutputTokens = Number.isFinite(configuredMax)
      ? Math.max(256, Math.floor(configuredMax))
      : 3200;
    this.retryDelayMs = positiveIntegerFromEnv("OLLAMA_RETRY_DELAY_MS", 1500);
  }

  /**
   * Sends a chat request to Ollama API
   */
  async chat(
    messages: OllamaMessage[],
    options?: {
      maxOutputTokens?: number;
      /** Total budget for every retry made by this call. */
      timeoutMs?: number;
      maxRetries?: number;
      think?: boolean | "low" | "medium" | "high";
    },
  ): Promise<string> {
    const model = this.resolveModel();
    const requestedMax = Number(options?.maxOutputTokens);
    const maxOutputTokens = Number.isFinite(requestedMax)
      ? Math.max(256, Math.min(this.maxOutputTokens, Math.floor(requestedMax)))
      : this.maxOutputTokens;
    const startTime = Date.now();
    const requestedTimeout = Number(options?.timeoutMs);
    const totalTimeout = Number.isFinite(requestedTimeout)
      ? Math.max(1_000, Math.floor(requestedTimeout))
      : this.config.timeout * this.config.maxRetries;
    const deadline = startTime + totalTimeout;
    const requestedRetries = Number(options?.maxRetries);
    const maxRetries = Number.isFinite(requestedRetries)
      ? Math.max(1, Math.floor(requestedRetries))
      : this.config.maxRetries;
    const failures: string[] = [];

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      const request: OllamaChatRequest = {
        model,
        messages,
        temperature: this.config.temperature,
        top_p: this.config.top_p,
        stream: false,
        ...(options?.think !== undefined && { think: options.think }),
        format: "json",
        options: {
          num_predict: maxOutputTokens,
          temperature: this.config.temperature,
          top_p: this.config.top_p,
        },
      };

      try {
        const remainingTime = deadline - Date.now();
        if (remainingTime <= 0) {
          throw new Error(`Ollama request exceeded its ${totalTimeout}ms total time budget.`);
        }
        const data = await this.callChat(
          request,
          model,
          Math.min(this.config.timeout, remainingTime),
        );
        this.log("success", {
          model,
          attempt,
          duration: Date.now() - startTime,
          inputTokens: data.prompt_eval_count,
          outputTokens: data.eval_count,
        });
        return data.message.content;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failures.push(`${model}: ${errorMessage}`);
        this.log("error", {
          model,
          attempt,
          duration: Date.now() - startTime,
          error: errorMessage,
        });
        if (attempt < maxRetries) {
          const retryDelay = this.retryDelayMs * attempt;
          if (Date.now() + retryDelay >= deadline) break;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw new Error(`Ollama cloud request failed after ${failures.length} attempt(s). ${failures.join(" | ")}`);
  }

  private async callChat(
    request: OllamaChatRequest,
    model: string,
    timeout: number,
  ): Promise<OllamaChatResponse> {
    const chatResponse = await this.fetchWithTimeout(
      `${this.config.ollamaUrl}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      },
      timeout,
    );

    if (!chatResponse.ok) {
      const chatError = (await chatResponse.text()).slice(0, 500);
      throw new Error(`/api/chat returned ${chatResponse.status}: ${chatError}`);
    }

    const chatData = (await chatResponse.json()) as Record<string, unknown>;
    const content = this.extractResponseContent(chatData);
    if (!content.trim()) {
      throw new Error(
        `/api/chat returned empty content for ${model} after ${Number(chatData.eval_count ?? 0)} output tokens`,
      );
    }
    const done = chatData.done === undefined ? true : Boolean(chatData.done);
    const doneReason = String(chatData.done_reason ?? chatData.stop_reason ?? "").toLowerCase();
    if (!done || doneReason === "length" || doneReason === "max_tokens") {
      throw new Error(
        `/api/chat returned an incomplete response for ${model} after ${Number(chatData.eval_count ?? 0)} output tokens`,
      );
    }

    return {
      message: { role: "assistant", content },
      model,
      created_at:
        typeof chatData.created_at === "string"
          ? (chatData.created_at as string)
          : new Date().toISOString(),
      done,
      total_duration: Number(chatData.total_duration ?? 0),
      load_duration: Number(chatData.load_duration ?? 0),
      prompt_eval_count: Number(chatData.prompt_eval_count ?? 0),
      prompt_eval_duration: Number(chatData.prompt_eval_duration ?? 0),
      eval_count: Number(chatData.eval_count ?? 0),
      eval_duration: Number(chatData.eval_duration ?? 0),
    };
  }

  private extractResponseContent(payload: Record<string, unknown>): string {
    const message = payload.message as { content?: unknown } | undefined;
    if (typeof message?.content === "string") return message.content;
    if (message?.content && typeof message.content === "object") {
      try {
        return JSON.stringify(message.content);
      } catch {
        // Continue to other fallbacks.
      }
    }

    if (typeof payload.response === "string") return payload.response;
    if (typeof payload.output_text === "string") return payload.output_text;

    const choices = payload.choices as Array<{ message?: { content?: string } }> | undefined;
    const choiceContent = choices?.[0]?.message?.content;
    if (typeof choiceContent === "string") return choiceContent;

    return "";
  }

  private resolveModel(): string {
    const configured = this.config.model?.trim() || DEFAULT_CLOUD_MODEL;
    if (!ALLOWED_CLOUD_MODELS.has(configured)) {
      throw new Error(
        `OLLAMA_MODEL must be one of: ${[...ALLOWED_CLOUD_MODELS].join(", ")}`,
      );
    }
    return configured;
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Ollama request timeout after ${timeout}ms. Is Ollama running?`
        );
      }
      throw error;
    }
  }

  /**
   * Checks if Ollama service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.ollamaUrl}/api/tags`,
        { method: "GET" },
        5000
      );
      return response.ok;
    } catch (error) {
      this.log("error", {
        check: "healthCheck",
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Logs API interactions
   */
  private log(
    level: "success" | "error" | "info",
    data: Record<string, unknown>
  ): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: "OllamaService",
      ...data,
    };

    if (level === "error") {
      console.error("[OllamaService]", JSON.stringify(logEntry));
    } else if (process.env.NODE_ENV === "development") {
      console.log("[OllamaService]", JSON.stringify(logEntry));
    }
  }
}

// Export singleton instance
export const ollamaService = new OllamaService();

// Export class for testing
export { OllamaService };
