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

const DEFAULT_CONFIG: AIServiceConfig = {
  ollamaUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
  model: process.env.OLLAMA_MODEL || "gemma4:31b-cloud",
  temperature: 0,
  top_p: 0.1,
  timeout: 60000,
  maxRetries: 2,
};

const ALLOWED_CLOUD_MODELS = new Set([
  "gemma4:31b-cloud",
  "nemotron-3-super:cloud",
]);

class OllamaService {
  private config: AIServiceConfig;
  private readonly maxOutputTokens: number;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const configuredMax = Number(process.env.OLLAMA_NUM_PREDICT ?? 4800);
    this.maxOutputTokens = Number.isFinite(configuredMax)
      ? Math.max(256, Math.floor(configuredMax))
      : 4800;
  }

  /**
   * Sends a chat request to Ollama API
   */
  async chat(
    messages: OllamaMessage[],
    options?: { maxOutputTokens?: number },
  ): Promise<string> {
    const model = this.resolveModel();
    const requestedMax = Number(options?.maxOutputTokens);
    const maxOutputTokens = Number.isFinite(requestedMax)
      ? Math.max(256, Math.min(this.maxOutputTokens, Math.floor(requestedMax)))
      : this.maxOutputTokens;
    const startTime = Date.now();
    const failures: string[] = [];

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt += 1) {
      const request: OllamaChatRequest = {
        model,
        messages,
        temperature: this.config.temperature,
        top_p: this.config.top_p,
        stream: false,
        format: "json",
        options: {
          num_predict: maxOutputTokens,
          temperature: this.config.temperature,
          top_p: this.config.top_p,
        },
      };

      try {
        const data = await this.callChat(request, model);
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
        if (attempt < this.config.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    throw new Error(`Ollama cloud request failed after ${this.config.maxRetries} attempts. ${failures.join(" | ")}`);
  }

  private async callChat(
    request: OllamaChatRequest,
    model: string
  ): Promise<OllamaChatResponse> {
    const chatResponse = await this.fetchWithTimeout(
      `${this.config.ollamaUrl}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      },
      this.config.timeout,
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

    return {
      message: { role: "assistant", content },
      model,
      created_at:
        typeof chatData.created_at === "string"
          ? (chatData.created_at as string)
          : new Date().toISOString(),
      done: Boolean(chatData.done ?? true),
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
    const configured = this.config.model?.trim() || "gemma4:31b-cloud";
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
