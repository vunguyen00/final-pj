import { Answer, Question, QuestionForm, QuestionKind, QuestionType } from "./types";

export const QUESTION_KIND_OPTIONS: Array<{ value: QuestionKind; label: string }> = [
  { value: "", label: "Hãy chọn dạng câu hỏi" },
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm" },
  { value: "TRUE_FALSE", label: "Đúng/Sai" },
  { value: "FILL_IN_BLANK", label: "Điền từ" },
  { value: "LISTENING", label: "Nghe và trả lời" },
  { value: "ESSAY", label: "Bài viết AI" },
  { value: "SPEAKING", label: "Bài nói AI" },
];

export const createDefaultForm = (): QuestionForm => ({
  kind: "",
  type: "MULTIPLE_CHOICE",
  content: "",
  audioUrl: "",
  hasListening: false,
  score: "10",
  explanation: "",
  hint: "",
  answers: [],
});

export const inferKindFromQuestion = (question: Question): QuestionKind => {
  if (question.type === "SPEAKING") return "SPEAKING";
  if (question.audioUrl) return "LISTENING";
  if (question.type === "MULTIPLE_CHOICE") return "MULTIPLE_CHOICE";
  if (question.type === "TRUE_FALSE") return "TRUE_FALSE";
  if (question.type === "FILL_IN_BLANK") return "FILL_IN_BLANK";
  return "ESSAY";
};

export const getQuestionTypeLabel = (question: Pick<Question, "type" | "audioUrl">): string => {
  if (question.type === "SPEAKING") return "Speaking AI";
  if (question.audioUrl) return "Listening";
  const labels: Record<QuestionType, string> = {
    MULTIPLE_CHOICE: "Trắc nghiệm",
    TRUE_FALSE: "Đúng/Sai",
    FILL_IN_BLANK: "Điền từ",
    ESSAY: "Bài viết AI",
    SPEAKING: "Bài nói AI",
  };
  return labels[question.type];
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
      return [{ id: "1", content: "", isCorrect: true, order: 1, feedback: "" }];
    default:
      return [];
  }
};

export const mapKindToPayload = (kind: QuestionKind): { type: QuestionType; hasListening: boolean } => {
  if (kind === "LISTENING") return { type: "ESSAY", hasListening: true };
  if (kind === "TRUE_FALSE") return { type: "TRUE_FALSE", hasListening: false };
  if (kind === "FILL_IN_BLANK") return { type: "FILL_IN_BLANK", hasListening: false };
  if (kind === "ESSAY") return { type: "ESSAY", hasListening: false };
  if (kind === "SPEAKING") return { type: "SPEAKING", hasListening: false };
  return { type: "MULTIPLE_CHOICE", hasListening: false };
};
