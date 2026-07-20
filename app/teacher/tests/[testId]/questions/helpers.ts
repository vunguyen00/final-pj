import { Answer, Question, QuestionForm, QuestionKind, QuestionType } from "./types";

export const createDefaultForm = (): QuestionForm => ({
  kind: "",
  type: "MULTIPLE_CHOICE",
  content: "",
  audioUrl: "",
  hasListening: false,
  score: "10",
  explanation: "",
  hint: "",
  preparationTimeSeconds: "60",
  answerTimeSeconds: "120",
  answers: [],
});

export const inferKindFromQuestion = (question: Question): QuestionKind => {
  if (question.type === "SPEAKING") return "SPEAKING";
  if (question.type === "MULTIPLE_CHOICE") return "MULTIPLE_CHOICE";
  if (question.type === "TRUE_FALSE") return "TRUE_FALSE";
  if (question.type === "FILL_IN_BLANK") return question.audioUrl ? "LISTENING" : "FILL_IN_BLANK";
  if (question.audioUrl) return "LISTENING";
  return "ESSAY";
};

export const buildAnswersForKind = (kind: QuestionKind): Answer[] => {
  switch (kind) {
    case "MULTIPLE_CHOICE":
      return [1, 2, 3, 4].map((order) => ({
        id: String(order),
        content: "",
        isCorrect: false,
        order,
        feedback: "",
      }));
    case "TRUE_FALSE":
      return [
        { id: "1", content: "Đúng", isCorrect: false, order: 1, feedback: "" },
        { id: "2", content: "Sai", isCorrect: false, order: 2, feedback: "" },
      ];
    case "FILL_IN_BLANK":
    case "LISTENING":
      return [{ id: "1", content: "", isCorrect: true, order: 1, feedback: "" }];
    default:
      return [];
  }
};

export const mapKindToPayload = (kind: QuestionKind): { type: QuestionType; hasListening: boolean } => {
  if (kind === "LISTENING") return { type: "FILL_IN_BLANK", hasListening: true };
  if (kind === "TRUE_FALSE") return { type: "TRUE_FALSE", hasListening: false };
  if (kind === "FILL_IN_BLANK") return { type: "FILL_IN_BLANK", hasListening: false };
  if (kind === "ESSAY") return { type: "ESSAY", hasListening: false };
  if (kind === "SPEAKING") return { type: "SPEAKING", hasListening: false };
  return { type: "MULTIPLE_CHOICE", hasListening: false };
};
