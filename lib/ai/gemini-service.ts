/**
 * Gemini AI service.
 * Uses the Gemini Developer API directly so the API key stays server-side.
 */

import type { AIMessage, AIServiceConfig } from "./types";

const DEFAULT_MODEL = "gemini-3.6-flash";

function positiveIntegerFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

const DEFAULT_CONFIG: AIServiceConfig = {
  apiUrl: process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta",
  apiKey: process.env.GEMINI_API_KEY || "",
  model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
  temperature: 0,
  top_p: 0.1,
  timeout: positiveIntegerFromEnv("GEMINI_TIMEOUT_MS", 180000),
  maxRetries: positiveIntegerFromEnv("GEMINI_MAX_RETRIES", 2),
};

type GeminiPart = { text?: string; thought?: boolean };
type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class GeminiService {
  private readonly config: AIServiceConfig;
  private readonly maxOutputTokens: number;
  private readonly retryDelayMs: number;
  private healthCache?: { healthy: boolean; expiresAt: number };

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const configuredMax = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 3200);
    this.maxOutputTokens = Number.isFinite(configuredMax)
      ? Math.max(256, Math.floor(configuredMax))
      : 3200;
    this.retryDelayMs = positiveIntegerFromEnv("GEMINI_RETRY_DELAY_MS", 1500);
  }

  async chat(
    messages: AIMessage[],
    options?: {
      maxOutputTokens?: number;
      /** Total budget for every retry made by this call. */
      timeoutMs?: number;
      maxRetries?: number;
      think?: boolean | "low" | "medium" | "high";
    },
  ): Promise<string> {
    this.assertConfigured();

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
      try {
        const remainingTime = deadline - Date.now();
        if (remainingTime <= 0) {
          throw new Error(`Gemini request exceeded its ${totalTimeout}ms total time budget.`);
        }

        const data = await this.callGenerateContent(
          messages,
          maxOutputTokens,
          options?.think,
          Math.min(this.config.timeout, remainingTime),
        );
        const content = this.extractResponseContent(data);
        const usage = data.usageMetadata;
        this.log("success", {
          model: this.config.model,
          attempt,
          duration: Date.now() - startTime,
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
        });
        return content;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failures.push(`${this.config.model}: ${errorMessage}`);
        this.log("error", {
          model: this.config.model,
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

    throw new Error(
      `Gemini request failed after ${failures.length} attempt(s). ${failures.join(" | ")}`,
    );
  }

  async healthCheck(): Promise<boolean> {
    if (!this.config.apiKey.trim()) return false;
    if (this.healthCache && this.healthCache.expiresAt > Date.now()) {
      return this.healthCache.healthy;
    }
    try {
      const data = await this.callGenerateContent(
        [{ role: "user", content: 'Return {"ok":true}.' }],
        64,
        false,
        30_000,
      );
      this.extractResponseContent(data);
      this.healthCache = { healthy: true, expiresAt: Date.now() + 60_000 };
      return true;
    } catch (error) {
      this.healthCache = { healthy: false, expiresAt: Date.now() + 10_000 };
      this.log("error", {
        check: "healthCheck",
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async callGenerateContent(
    messages: AIMessage[],
    maxOutputTokens: number,
    think: boolean | "low" | "medium" | "high" | undefined,
    timeout: number,
  ): Promise<GeminiResponse> {
    const systemText = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const contents = this.toGeminiContents(messages);
    if (contents.length === 0) throw new Error("Gemini request has no user or assistant messages.");

    const response = await this.fetchWithTimeout(
      `${this.apiBaseUrl}/models/${encodeURIComponent(this.config.model)}:generateContent`,
      {
        method: "POST",
        headers: { ...this.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(systemText && { systemInstruction: { parts: [{ text: systemText }] } }),
          contents,
          generationConfig: {
            maxOutputTokens,
            responseMimeType: "application/json",
            ...(think !== undefined && { thinkingConfig: this.thinkingConfig(think) }),
          },
        }),
      },
      timeout,
    );

    if (!response.ok) {
      const body = (await response.text()).slice(0, 500);
      throw new Error(`generateContent returned ${response.status}: ${body}`);
    }
    return (await response.json()) as GeminiResponse;
  }

  private toGeminiContents(messages: AIMessage[]) {
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
    for (const message of messages) {
      if (message.role === "system") continue;
      const role = message.role === "assistant" ? "model" : "user";
      const previous = contents.at(-1);
      if (previous?.role === role) {
        previous.parts.push({ text: message.content });
      } else {
        contents.push({ role, parts: [{ text: message.content }] });
      }
    }
    return contents;
  }

  private thinkingConfig(think: boolean | "low" | "medium" | "high") {
    if (think === false) return { thinkingLevel: "minimal" };
    if (think === "low") return { thinkingLevel: "low" };
    if (think === "high") return { thinkingLevel: "high" };
    return { thinkingLevel: "medium" };
  }

  private extractResponseContent(payload: GeminiResponse): string {
    const candidate = payload.candidates?.[0];
    const finishReason = candidate?.finishReason?.toUpperCase();
    if (!candidate) {
      const blocked = payload.promptFeedback?.blockReason;
      throw new Error(blocked ? `Gemini blocked the prompt: ${blocked}` : "Gemini returned no candidates.");
    }
    if (finishReason && finishReason !== "STOP") {
      throw new Error(`Gemini returned an incomplete response (${finishReason}).`);
    }
    const content = (candidate.content?.parts ?? [])
      .filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
    if (!content.trim()) throw new Error("Gemini returned empty content.");
    return content;
  }

  private assertConfigured() {
    if (!this.config.apiKey.trim()) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    if (!this.config.model.trim()) {
      throw new Error("GEMINI_MODEL is not configured.");
    }
  }

  private get apiBaseUrl() {
    return this.config.apiUrl.replace(/\/$/, "");
  }

  private get authHeaders() {
    return { "x-goog-api-key": this.config.apiKey };
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeout: number) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Gemini request timeout after ${timeout}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private log(level: "success" | "error" | "info", data: Record<string, unknown>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: "GeminiService",
      ...data,
    };
    if (level === "error") console.error("[GeminiService]", JSON.stringify(entry));
    else if (process.env.NODE_ENV === "development") {
      console.log("[GeminiService]", JSON.stringify(entry));
    }
  }
}

export const geminiService = new GeminiService();
