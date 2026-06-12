/**
 * AI Writing Evaluation Types
 * Core types and interfaces for multilingual essay evaluation
 */

export type SupportedLanguage = "English" | "Japanese" | "Korean" | "Chinese" | "Vietnamese";

export interface WritingScore {
  grammar: number;
  vocabulary: number;
  coherence: number;
  task_response: number;
  overall: number;
}

export interface Correction {
  original: string;
  improved: string;
  reason: string;
}

export interface BandAssessment {
  system: "IELTS" | "HSK" | "GENERAL";
  level: string;
  score: number;
  rationale: string;
}

export interface TaskRequirementAnalysis {
  prompt_understanding: string;
  addressed_points: string[];
  missing_points: string[];
}

export interface AIEvaluationResponse {
  language: SupportedLanguage;
  grammar: number;
  vocabulary: number;
  coherence: number;
  task_response: number;
  overall: number;
  band: BandAssessment;
  task_requirements: TaskRequirementAnalysis;
  writing_structure?: {
    exam?: string;
    task_type?: string;
    sections: Array<{
      name: string;
      score: number;
      max_score: number;
      feedback: string;
    }>;
  };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  feedback: string[];
  suggestions: string[];
  improved_version: string;
  corrections: Correction[];
}

export interface OllamaMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  temperature: number;
  top_p: number;
  stream: boolean;
  format?: "json" | "text";
  options?: {
    num_predict?: number;
    temperature?: number;
    top_p?: number;
  };
}

export interface SpeakingEvaluationResponse {
  language: SupportedLanguage;
  exam: "IELTS" | "HSK";
  score_scale: "BAND_0_9" | "SCORE_0_100";
  criteria_scores: Record<string, number>;
  fluency_coherence: number;
  pronunciation: number;
  lexical_resource: number;
  grammar: number;
  overall: number;
  normalized_overall: number;
  task_relevance: number;
  band: BandAssessment;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  pronunciation_errors: string[];
  grammar_errors: string[];
  vocabulary_errors: string[];
  fluency_issues: string[];
  feedback: string[];
  suggestions: string[];
  practice_methods: string[];
}

export type SpeakingExamType = "IELTS" | "HSK" | "JLPT";

export type AssessmentType = "SPEAKING" | "WRITING";

export interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  model: string;
  created_at: string;
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export interface EssayValidationResult {
  valid: boolean;
  error?: string;
}

export interface AIServiceConfig {
  ollamaUrl: string;
  model: string;
  temperature: number;
  top_p: number;
  timeout: number;
  maxRetries: number;
}
