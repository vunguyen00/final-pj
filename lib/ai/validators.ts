/**
 * Essay Validation Utilities
 * Validates essay input before sending to AI service
 */

import { EssayValidationResult } from "./types";

const VALIDATION_RULES = {
  MIN_LENGTH: 50,
  MAX_LENGTH: 10000,
  EMPTY_THRESHOLD: 5,
};

/**
 * Validates essay input
 */
export function validateEssay(essay: unknown): EssayValidationResult {
  // Check if essay is a string
  if (typeof essay !== "string") {
    return {
      valid: false,
      error: "Essay must be a string",
    };
  }

  const trimmedEssay = essay.trim();

  // Check if empty
  if (trimmedEssay.length === 0) {
    return {
      valid: false,
      error: "Essay cannot be empty",
    };
  }

  // Check minimum length (should have at least some content)
  const whitespaceWords = trimmedEssay.split(/\s+/).filter(Boolean).length;
  const cjkCharacters =
    trimmedEssay.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g)
      ?.length ?? 0;
  if (
    whitespaceWords < VALIDATION_RULES.EMPTY_THRESHOLD &&
    cjkCharacters < 10
  ) {
    return {
      valid: false,
      error: `Essay is too short. Please write at least ${VALIDATION_RULES.EMPTY_THRESHOLD} words`,
    };
  }

  // Check maximum length
  if (trimmedEssay.length > VALIDATION_RULES.MAX_LENGTH) {
    return {
      valid: false,
      error: `Essay exceeds maximum length of ${VALIDATION_RULES.MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Sanitizes essay to prevent prompt injection
 * Removes potentially dangerous characters while preserving content
 */
export function sanitizeEssay(essay: string): string {
  // Remove control characters but keep newlines and tabs
  return essay
    .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, "")
    .trim();
}

/**
 * Validates request body structure
 */
export function validateRequestBody(body: unknown): body is { essay: string } {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const obj = body as Record<string, unknown>;
  return typeof obj.essay === "string";
}

/**
 * Detects language from text content
 * Uses basic heuristics to identify language
 */
export function detectLanguageFromText(text: string): string {
  // Japanese-specific hiragana and katakana
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return "Japanese";
  }

  // Korean Hangul
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return "Korean";
  }

  // Chinese characters (Hanzi); checked after Japanese-specific scripts
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return "Chinese";
  }

  // Vietnamese (has diacritics)
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text)) {
    return "Vietnamese";
  }

  // Default to English
  return "English";
}
