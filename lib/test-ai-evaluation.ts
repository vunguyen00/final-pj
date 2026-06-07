import { scoringService, speakingService } from "@/lib/ai";
import { getSpeakingExamTypeForLanguageCode } from "@/lib/test-rules";

export type TestAiFeedback = {
  mode: "WRITING" | "SPEAKING";
  language: string;
  overallScore: number;
  band?: { system: string; level: string; score: number; rationale: string };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  feedback?: string[];
  suggestions: string[];
  corrections?: Array<{ original: string; improved: string; reason: string }>;
};

export async function evaluateWritingAnswer(essayText: string, taskPrompt?: string): Promise<{
  normalizedScore: number;
  aiEvaluation: TestAiFeedback;
}> {
  try {
    const evaluation = await scoringService.evaluateEssay({ essay: essayText, taskPrompt });

    return {
      normalizedScore: evaluation?.overall ?? 0,
      aiEvaluation: {
        mode: "WRITING",
        language: evaluation?.language ?? "Unknown",
        overallScore: evaluation?.overall ?? 0,
        band: evaluation?.band,
        summary: evaluation?.summary ?? "",
        strengths: evaluation?.strengths ?? [],
        weaknesses: evaluation?.weaknesses ?? [],
        feedback: evaluation?.feedback ?? [],
        suggestions: evaluation?.suggestions ?? [],
        corrections: evaluation?.corrections ?? [],
      },
    };
  } catch (error) {
    console.error("Error evaluating writing answer:", error);
    return {
      normalizedScore: 0,
      aiEvaluation: {
        mode: "WRITING",
        language: "Unknown",
        overallScore: 0,
        summary: "Could not evaluate writing answer.",
        strengths: [],
        weaknesses: ["AI evaluation is temporarily unavailable."],
        feedback: [],
        suggestions: [],
        corrections: [],
      },
    };
  }
}

export async function evaluateSpeakingAnswer(input: {
  transcript: string;
  prompt?: string;
  languageCode?: string | null;
}): Promise<{
  normalizedScore: number;
  aiEvaluation: TestAiFeedback;
}> {
  try {
    const evaluation = await speakingService.evaluateSpeaking({
      transcript: input.transcript,
      examType: getSpeakingExamTypeForLanguageCode(input.languageCode),
      prompt: input.prompt,
      audioAvailable: false,
    });

    return {
      normalizedScore: evaluation.normalized_overall ?? 0,
      aiEvaluation: {
        mode: "SPEAKING",
        language: evaluation.language,
        overallScore: evaluation.normalized_overall ?? 0,
        band: evaluation.band,
        summary: evaluation.summary,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        feedback: evaluation.feedback,
        suggestions: [...evaluation.suggestions, ...evaluation.practice_methods],
      },
    };
  } catch (error) {
    console.error("Error evaluating speaking answer:", error);
    return {
      normalizedScore: 0,
      aiEvaluation: {
        mode: "SPEAKING",
        language: "Unknown",
        overallScore: 0,
        summary: "Could not evaluate speaking answer.",
        strengths: [],
        weaknesses: ["AI evaluation is temporarily unavailable."],
        feedback: [],
        suggestions: [],
      },
    };
  }
}
