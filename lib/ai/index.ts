/**
 * AI Writing Evaluation Service Index
 * Exports all AI services and utilities
 */

export * from "./types";
export * from "./validators";
export * from "./prompt-builder";
export * from "./ollama-service";
export * from "./feedback-service";
export * from "./scoring-service";
export * from "./speaking-service";

export { ollamaService } from "./ollama-service";
export { scoringService } from "./scoring-service";
export { speakingService } from "./speaking-service";
