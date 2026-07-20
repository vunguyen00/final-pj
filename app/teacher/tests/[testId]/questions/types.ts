export type QuestionType = "MULTIPLE_CHOICE" | "FILL_IN_BLANK" | "ESSAY" | "TRUE_FALSE" | "SPEAKING";

export type QuestionKind = "" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_IN_BLANK" | "ESSAY" | "LISTENING" | "SPEAKING";

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
  preparationTimeSeconds: number | null;
  answerTimeSeconds: number | null;
  answers: Answer[];
};

export type Test = {
  id: string;
  kind: "COURSE" | "PUBLIC_PRACTICE" | "TEACHER_ENTRANCE";
  name: string;
  description: string | null;
  maxScore: number;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  materialTitle: string | null;
  materialContent: string | null;
  materialUrl: string | null;
  materialType: string | null;
  materialData: unknown;
  language: {
    id: string;
    name: string;
    code: string;
  } | null;
  course: {
    id: string;
    name: string;
    category: string | null;
    language: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
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
  preparationTimeSeconds: string;
  answerTimeSeconds: string;
  answers: Answer[];
};
