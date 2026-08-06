export type WritingSampleAnswerWordRange = {
  min: number;
  max: number | null;
  source: "prompt" | "default";
};

type SampleAnswerInput = {
  mode: "WRITING" | "SPEAKING";
  prompt?: string;
  languageCode?: string | null;
  scoreOnly?: boolean;
};

export function getWritingSampleAnswerWordRange(
  prompt?: string,
): WritingSampleAnswerWordRange {
  const value = prompt || "";
  const explicitRange = value.match(
    /(?:between\s+)?(\d{2,4})\s*(?:-|–|—|to|and)\s*(\d{2,4})\s+words?\b/i,
  );
  if (explicitRange) {
    const first = Number(explicitRange[1]);
    const second = Number(explicitRange[2]);
    return {
      min: Math.min(first, second),
      max: Math.max(first, second),
      source: "prompt",
    };
  }

  const minimum = value.match(
    /(?:at\s+least|minimum(?:\s+of)?|no\s+fewer\s+than)\s+(\d{2,4})\s+words?\b/i,
  );
  if (minimum) {
    return { min: Number(minimum[1]), max: null, source: "prompt" };
  }

  const approximate = value.match(
    /(?:about|approximately|around)\s+(\d{2,4})\s+words?\b/i,
  );
  if (approximate) {
    const target = Number(approximate[1]);
    return {
      min: Math.floor(target * 0.9),
      max: Math.ceil(target * 1.1),
      source: "prompt",
    };
  }

  return { min: 100, max: 140, source: "default" };
}

function countWhitespaceWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

function usesWhitespaceWordBoundaries(languageCode?: string | null) {
  const normalized = (languageCode || "").toLowerCase();
  return !/^(?:zh|cn|ja|jp)(?:-|$)/.test(normalized);
}

export function getSampleAnswerCompletenessError(
  input: SampleAnswerInput,
  sampleAnswer: string,
) {
  if (input.scoreOnly) return null;
  const answer = sampleAnswer.trim();
  if (!answer) return "AI response is missing a model answer.";
  if (!/[.!?。！？][\p{P}\s]*$/u.test(answer)) {
    return "AI model answer appears to end mid-sentence.";
  }

  if (input.mode === "WRITING" && usesWhitespaceWordBoundaries(input.languageCode)) {
    const range = getWritingSampleAnswerWordRange(input.prompt);
    const wordCount = countWhitespaceWords(answer);
    // Generative word counts commonly differ by a few tokens around hyphenated
    // words and punctuation. Accept a narrow 5% margin so a complete 175-word
    // model answer is not discarded for a 180-word target, while genuinely
    // short or truncated answers still fail validation.
    const acceptedMin = Math.ceil(range.min * 0.95);
    const acceptedMax = range.max === null ? null : Math.floor(range.max * 1.05);
    if (wordCount < acceptedMin) {
      return `AI model answer has ${wordCount} words; expected at least ${range.min}.`;
    }
    if (acceptedMax !== null && wordCount > acceptedMax) {
      return `AI model answer has ${wordCount} words; expected at most ${range.max}.`;
    }
  }

  return null;
}
