export type TeacherQuestionTiming = {
  preparationTimeSeconds: number;
  answerTimeSeconds: number;
};

export type TeacherQuestionRevealState = Record<string, string>;

export function getTeacherQuestionTiming(question: {
  type: string;
  preparationTimeSeconds: number | null;
  answerTimeSeconds: number | null;
}): TeacherQuestionTiming | null {
  if (question.type !== "ESSAY" && question.type !== "SPEAKING") return null;
  return {
    preparationTimeSeconds:
      question.preparationTimeSeconds ?? (question.type === "SPEAKING" ? 60 : 0),
    answerTimeSeconds:
      question.answerTimeSeconds ?? (question.type === "SPEAKING" ? 120 : 3600),
  };
}

export function parseTeacherQuestionRevealState(value: unknown): TeacherQuestionRevealState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && !Number.isNaN(Date.parse(entry[1])),
    ),
  );
}

export function teacherQuestionDeadline(
  revealedAt: string,
  timing: TeacherQuestionTiming,
) {
  return new Date(revealedAt).getTime() +
    (timing.preparationTimeSeconds + timing.answerTimeSeconds) * 1000;
}

export function teacherQuestionAnswerStartsAt(
  revealedAt: string,
  timing: TeacherQuestionTiming,
) {
  return new Date(revealedAt).getTime() + timing.preparationTimeSeconds * 1000;
}
