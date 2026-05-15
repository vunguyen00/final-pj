export type QuestionType = "MULTIPLE_CHOICE" | "FILL_IN_BLANK" | "ESSAY" | "TRUE_FALSE";

export type QuestionKind = "" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_IN_BLANK" | "ESSAY" | "LISTENING";

export type Answer = {
  id: string;
  content: string;
  isCorrect: boolean;
  order: number;
  feedback: string | null;
};

export type Question = {
  id: string;
  type: QuestionType;
  content: string;
  audioUrl: string | null;
  order: number;
  score: number;
  explanation: string | null;
  hint: string | null;
  answers: Answer[];
};

export type Test = {
  id: string;
  name: string;
  description: string | null;
  course: {
    id: string;
    name: string;
    category: string | null;
  };
};

export type QuestionForm = {
  kind: QuestionKind;
  type: QuestionType;
  content: string;
  audioUrl: string;
  hasListening: boolean;
  score: string;
  explanation: string;
  hint: string;
  answers: Answer[];
};
