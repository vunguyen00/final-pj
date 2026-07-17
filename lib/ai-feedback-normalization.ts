type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstText(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function formatFeedbackObject(source: UnknownRecord): string[] {
  const original = firstText(source, ["original", "sentence", "source", "before", "error"]);
  const improved = firstText(source, ["improved", "correction", "corrected", "suggestion", "after"]);
  const reason = firstText(source, ["reason", "explanation", "detail"]);

  if (original || improved) {
    const correction = original && improved
      ? `${original} → ${improved}`
      : original || improved;
    return [reason ? `${correction} — ${reason}` : correction];
  }

  const directText = firstText(source, ["text", "message", "feedback", "description", "content", "value"]);
  if (directText) return [directText];

  const nestedItems = Object.values(source).flatMap(normalizeFeedbackTextItems);
  return nestedItems.length ? [[...new Set(nestedItems)].join(" — ")] : [];
}

/**
 * Converts unpredictable AI feedback values into render-safe, meaningful text.
 * In particular, structured correction objects are formatted instead of being
 * coerced to the browser string "[object Object]".
 */
export function normalizeFeedbackTextItems(value: unknown): string[] {
  if (typeof value === "string") {
    const text = value.trim();
    return text && text !== "[object Object]" ? [text] : [];
  }
  if (typeof value === "number" && Number.isFinite(value)) return [String(value)];
  if (typeof value === "boolean") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(normalizeFeedbackTextItems);
  if (isRecord(value)) return formatFeedbackObject(value);
  return [];
}
