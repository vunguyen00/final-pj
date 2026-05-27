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
  model: process.env.OLLAMA_MODEL || "nemotron-3-super:cloud",
  temperature: 0,
  top_p: 0.1,
  timeout: 50000,
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
    const model = await this.resolveModel();
    const request: OllamaChatRequest = {
      model,
      messages,
      temperature: this.config.temperature,
      top_p: this.config.top_p,
      stream: false,
      options: {
        // Limit generation length to reduce hanging responses on slow models.
        num_predict: 1600,
        temperature: this.config.temperature,
        top_p: this.config.top_p,
      },
    };

    const startTime = Date.now();

    try {
      const data = await this.callChatWithFallback(request, messages, model);
      const duration = Date.now() - startTime;

      // Log successful request
      this.log("success", {
        model,
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
        model,
        duration,
        error: errorMessage,
      });

      throw error;
    }
  }

  private async callChatWithFallback(
    request: OllamaChatRequest,
    messages: OllamaMessage[],
    model: string
  ): Promise<OllamaChatResponse> {
    let chatErrorText = "";
    const chatResponse = await this.fetchWithTimeout(
      `${this.config.ollamaUrl}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      },
      this.config.timeout
    );

    if (chatResponse.ok) {
      const chatData = (await chatResponse.json()) as Record<string, unknown>;
      const content = this.extractResponseContent(chatData);
      if (content.trim()) {
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
      this.log("info", {
        action: "callChatWithFallback",
        stage: "empty_chat_content",
        fallback: "/v1/chat/completions",
      });
      chatErrorText = JSON.stringify(chatData).slice(0, 500);
    } else {
      chatErrorText = await chatResponse.text();
    }

    const openAIResponse = await this.fetchWithTimeout(
      `${this.config.ollamaUrl}/v1/chat/completions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          temperature: this.config.temperature,
          top_p: this.config.top_p,
          stream: false,
        }),
      },
      this.config.timeout
    );

    if (openAIResponse.ok) {
      const data = (await openAIResponse.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      if (content.trim()) {
        return {
          message: { role: "assistant", content },
          model,
          created_at: new Date().toISOString(),
          done: true,
          total_duration: 0,
          load_duration: 0,
          prompt_eval_count: data.usage?.prompt_tokens ?? 0,
          prompt_eval_duration: 0,
          eval_count: data.usage?.completion_tokens ?? 0,
          eval_duration: 0,
        };
      }
      this.log("info", {
        action: "callChatWithFallback",
        stage: "empty_openai_content",
        fallback: "/api/generate",
      });
    }

    const prompt = messages.map((m) => `${m.role.toUpperCase()}:\n${m.content}`).join("\n\n");
    const generateResponse = await this.fetchWithTimeout(
      `${this.config.ollamaUrl}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: "json",
          options: {
            temperature: this.config.temperature,
            top_p: this.config.top_p,
          },
        }),
      },
      this.config.timeout
    );

    if (!generateResponse.ok) {
      const chatError = chatErrorText;
      const openAIError = await openAIResponse.text();
      const generateError = await generateResponse.text();
      throw new Error(
        `Ollama API endpoints failed. /api/chat: ${chatResponse.status} ${chatError}; /v1/chat/completions: ${openAIResponse.status} ${openAIError}; /api/generate: ${generateResponse.status} ${generateError}`
      );
    }

    const generated = (await generateResponse.json()) as {
      response: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    return {
      message: { role: "assistant", content: generated.response || "" },
      model,
      created_at: new Date().toISOString(),
      done: true,
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: generated.prompt_eval_count ?? 0,
      prompt_eval_duration: 0,
      eval_count: generated.eval_count ?? 0,
      eval_duration: 0,
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

  private async resolveModel(): Promise<string> {
    const configured = this.config.model?.trim();
    if (!configured) {
      return this.getFirstAvailableModel();
    }

    try {
      const models = await this.getAvailableModels();
      if (models.includes(configured)) return configured;
      if (models.length > 0) {
        this.log("info", {
          action: "resolveModel",
          requested: configured,
          fallback: models[0],
          reason: "configured_model_not_installed",
        });
        return models[0];
      }
      return configured;
    } catch {
      return configured;
    }
  }

  private async getFirstAvailableModel(): Promise<string> {
    const models = await this.getAvailableModels();
    const first = models[0];
    if (!first) {
      throw new Error("No model installed in Ollama");
    }
    return first;
  }

  private async getAvailableModels(): Promise<string[]> {
    // Prefer OpenAI-compatible endpoint when available.
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.ollamaUrl}/v1/models`,
        { method: "GET" },
        5000
      );
      if (response.ok) {
        const data = (await response.json()) as { data?: Array<{ id?: string }> };
        const models = (data.data ?? []).map((item) => item.id).filter(Boolean) as string[];
        if (models.length > 0) return models;
      }
    } catch {
      // Fall through to Ollama native endpoint.
    }

    const tagsResponse = await this.fetchWithTimeout(
      `${this.config.ollamaUrl}/api/tags`,
      { method: "GET" },
      5000
    );
    if (!tagsResponse.ok) return [];

    const tagsData = (await tagsResponse.json()) as { models?: Array<{ name?: string }> };
    return (tagsData.models ?? []).map((item) => item.name).filter(Boolean) as string[];
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
