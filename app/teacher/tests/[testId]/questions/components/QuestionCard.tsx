import { Question } from "../types";
import { getQuestionTypeLabel } from "../helpers";

type Props = {
  question: Question;
  index: number;
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
};

export function QuestionCard({ question, index, onEdit, onDelete }: Props) {
  const isAiQuestion = question.type === "ESSAY" || question.type === "SPEAKING" || Boolean(question.audioUrl);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700">
              {index + 1}
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {getQuestionTypeLabel(question)}
            </span>
            <span className="text-sm text-slate-500">{question.score} diem</span>
          </div>

          {question.audioUrl && (
            <div className="mt-2">
              <audio controls className="h-8 w-full max-w-md">
                <source src={question.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <p className="mt-3 text-slate-900">{question.content}</p>

          {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && question.answers && (
            <div className="mt-3 space-y-2">
              {question.answers.map((answer, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded-lg border p-3 ${
                    answer.isCorrect ? "border-green-300 bg-green-50" : "border-slate-200"
                  }`}
                >
                  <span className="text-sm text-slate-700">{answer.content}</span>
                </div>
              ))}
            </div>
          )}

          {question.type === "FILL_IN_BLANK" && question.answers?.[0] && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
              <span className="text-sm font-medium text-green-700">Dap an: </span>
              <span className="text-sm text-slate-700">{question.answers[0].content}</span>
            </div>
          )}

          {isAiQuestion && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Cau hoi nay duoc AI cham diem, khong co dap an dung/sai co dinh.
            </div>
          )}

          {question.explanation && (
            <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <span className="text-sm font-medium text-yellow-700">Giai thich: </span>
              <span className="text-sm text-slate-700">{question.explanation}</span>
            </div>
          )}
        </div>

        <div className="ml-4 flex gap-2">
          <button onClick={() => onEdit(question)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
            Sua
          </button>
          <button onClick={() => onDelete(question.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
            Xoa
          </button>
        </div>
      </div>
    </div>
  );
}
