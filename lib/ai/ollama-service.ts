/**
 * Ollama AI Service
 * Handles communication with Ollama API
 */

import {
  AIServiceConfig,
  AIEvaluationResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaMessage,
} from "./types";

const DEFAULT_CONFIG: AIServiceConfig = {
  ollamaUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
  model: process.env.OLLAMA_MODEL || "gpt-4.1-mini",
  temperature: 0,
  top_p: 0.1,
  timeout: 60000, // 60 seconds
  maxRetries: 2,
};

class OllamaService {
  private config: AIServiceConfig;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Sends a chat request to Ollama API
   */
  async chat(messages: OllamaMessage[]): Promise<string> {
    const request: OllamaChatRequest = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      top_p: this.config.top_p,
      stream: false,
      format: "json",
    };

    const startTime = Date.now();

    try {
      const response = await this.fetchWithTimeout(
        `${this.config.ollamaUrl}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        },
        this.config.timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Ollama API error: ${response.status} - ${errorText}`
        );
      }

      const data: OllamaChatResponse = await response.json();
      const duration = Date.now() - startTime;

      // Log successful request
      this.log("success", {
        model: this.config.model,
        duration,
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
      });

      return data.message.content;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      this.log("error", {
        model: this.config.model,
        duration,
        error: errorMessage,
      });

      throw error;
    }
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
