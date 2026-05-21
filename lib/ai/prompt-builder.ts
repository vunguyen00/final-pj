/**
 * Prompt Builder for AI Writing Evaluation
 * Creates structured prompts with system instructions and user messages
 */

import { OllamaMessage, SupportedLanguage } from "./types";

const SYSTEM_PROMPT = `You are a strict multilingual language examiner and writing coach.

You evaluate essays objectively and provide educational feedback.

You must:
- detect the language automatically
- score writing quality objectively (0-10 for each criterion)
- read and understand the writing prompt before scoring
- evaluate whether the essay answers all required parts of the prompt
- identify specific grammar, vocabulary, and coherence issues
- explain why sentences are weak or unclear
- suggest better wording with clear improvements
- provide actionable improvements for language learners
- indicate where each important error appears in the essay and how to fix it
- map score to a practical band system:
  - IELTS band (1.0-9.0) for English essays
  - HSK writing level (1-6) for Chinese essays
  - GENERAL level (Beginner/Intermediate/Advanced) for other languages
- return ONLY valid JSON (no markdown, no explanations outside JSON)
- ensure JSON is properly formatted and valid
- be strict but constructive in feedback
- avoid hallucinating unrelated corrections
- preserve original meaning when rewriting sentences

Scoring criteria (0-10 scale):
- grammar: Correct use of grammar rules, sentence structure, tenses, articles
- vocabulary: Appropriate word choices, variety, academic level, correctness
- coherence: Logical organization, flow, transitions between ideas, clarity
- task_response: How well the essay addresses the prompt, completeness, relevance

Overall score = (grammar + vocabulary + coherence + task_response) / 4

Always round scores to whole numbers between 0-10.
Provide at least 2 strengths and 2 weaknesses.
Provide at least 3 pieces of feedback and 3 suggestions.
Identify and explain at least 3 specific corrections if applicable.`;

const USER_PROMPT_TEMPLATE = (essay: string, taskPrompt?: string): string => `
Evaluate this essay carefully and return ONLY valid JSON:

<WRITING_PROMPT>
${taskPrompt?.trim() || "No specific writing prompt provided. Infer likely task from essay content."}
</WRITING_PROMPT>

<ESSAY>
${essay}
</ESSAY>

Return JSON in exactly this format:
{
  "language": "English|Japanese|Korean|Chinese|Vietnamese",
  "grammar": <0-10>,
  "vocabulary": <0-10>,
  "coherence": <0-10>,
  "task_response": <0-10>,
  "overall": <0-10>,
  "band": {
    "system": "IELTS|HSK|GENERAL",
    "level": "<example: 6.5 | HSK 4 | Intermediate>",
    "score": <numeric band score>,
    "rationale": "<why this band>"
  },
  "task_requirements": {
    "prompt_understanding": "<brief understanding of the prompt requirements>",
    "addressed_points": ["<point addressed 1>", "<point addressed 2>"],
    "missing_points": ["<missing point 1>", "<missing point 2>"]
  },
  "summary": "<1-2 sentence overview of writing quality>",
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "weaknesses": ["<weakness1>", "<weakness2>", "<weakness3>"],
  "feedback": ["<specific feedback1>", "<specific feedback2>", "<specific feedback3>"],
  "suggestions": ["<actionable suggestion1>", "<actionable suggestion2>", "<actionable suggestion3>"],
  "improved_version": "<complete essay with corrections>",
  "corrections": [
    {
      "original": "<exact phrase from essay>",
      "improved": "<better version>",
      "reason": "<why this is better>"
    }
  ]
}`;

/**
 * Creates messages array for Ollama chat API
 */
export function buildPromptMessages(essay: string): OllamaMessage[] {
  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: USER_PROMPT_TEMPLATE(essay),
    },
  ];
}
export function buildPromptMessagesWithTask(essay: string, taskPrompt?: string): OllamaMessage[] {
  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: USER_PROMPT_TEMPLATE(essay, taskPrompt),
    },
  ];
}

/**
 * Creates system prompt with language-specific context
 * This can be extended for language-specific instructions
 */
export function buildSystemPrompt(language?: SupportedLanguage): string {
  if (!language || language === "English") {
    return SYSTEM_PROMPT;
  }

  // Language-specific additions could go here
  const languageSpecificContext: Record<SupportedLanguage, string> = {
    English: "",
    Japanese:
      "\nPay special attention to particle usage (は、を、に、が), verb conjugations, and kanji accuracy.",
    Korean:
      "\nPay special attention to particle usage (는, 를, 에), verb endings, and formal/informal distinctions.",
    Chinese:
      "\nPay special attention to tone marks, measure words (个、只), and character simplicity/complexity (traditional vs simplified).",
    Vietnamese:
      "\nPay special attention to tone marks, vocabulary appropriateness, and Vietnamese grammar structures.",
  };

  return SYSTEM_PROMPT + (languageSpecificContext[language] || "");
}

/**
 * Validates that the prompt doesn't contain injection attempts
 */
export function validatePromptSafety(essay: string): boolean {
  // Check for common prompt injection patterns
  const injectionPatterns = [
    /ignore.*previous.*instruction/i,
    /forget.*everything/i,
    /override.*system.*prompt/i,
    /disregard.*guidelines/i,
    /execute.*command/i,
  ];

  return !injectionPatterns.some((pattern) => pattern.test(essay));
}
