import { buildAnswersForKind, QUESTION_KIND_OPTIONS } from "../helpers";
import { Answer, QuestionForm, QuestionKind } from "../types";

type Props = {
  show: boolean;
  isEditing: boolean;
  form: QuestionForm;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setForm: (updater: (prev: QuestionForm) => QuestionForm) => void;
};

const needsObjectiveAnswers = (kind: QuestionKind) => kind === "MULTIPLE_CHOICE" || kind === "TRUE_FALSE";

export function QuestionModal({ show, isEditing, form, onClose, onSubmit, setForm }: Props) {
  if (!show) return null;

  const handleTypeSelect = (kind: QuestionKind) => {
    const answers = buildAnswersForKind(kind);
    setForm((prev) => ({ ...prev, kind, answers }));
  };

  const handleAnswerChange = (index: number, field: keyof Answer, value: string | boolean) => {
    setForm((prev) => {
      const next = [...prev.answers];
      next[index] = { ...next[index], [field]: value } as Answer;
      return { ...prev, answers: next };
    });
  };

  const handleSetCorrect = (index: number) => {
    setForm((prev) => ({
      ...prev,
      answers: prev.answers.map((ans, idx) => ({ ...ans, isCorrect: idx === index })),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">{isEditing ? "Chinh sua cau hoi" : "Them cau hoi moi"}</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Dang cau hoi</label>
            <select
              value={form.kind}
              onChange={(e) => handleTypeSelect(e.target.value as QuestionKind)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {QUESTION_KIND_OPTIONS.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Noi dung cau hoi *</label>
            <textarea
              required
              rows={3}
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {form.kind === "LISTENING" && (
            <div>
              <label className="block text-sm font-medium text-slate-700">URL audio *</label>
              <input
                type="url"
                value={form.audioUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, audioUrl: e.target.value }))}
                placeholder="https://example.com/audio.mp3"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Diem so</label>
            <input
              type="number"
              value={form.score}
              onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {needsObjectiveAnswers(form.kind) && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Dap an (chon dap an dung)</label>
              {form.answers.map((answer, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetCorrect(index)}
                    className={`h-6 w-6 rounded-full border-2 ${answer.isCorrect ? "border-green-500 bg-green-500" : "border-slate-300"}`}
                  />
                  <input
                    type="text"
                    value={answer.content}
                    onChange={(e) => handleAnswerChange(index, "content", e.target.value)}
                    placeholder={`Dap an ${index + 1}`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {form.kind === "FILL_IN_BLANK" && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Dap an dung *</label>
              <textarea
                rows={3}
                value={form.answers[0]?.content || ""}
                onChange={(e) => handleAnswerChange(0, "content", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}

          {(form.kind === "ESSAY" || form.kind === "LISTENING" || form.kind === "SPEAKING") && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Cau hoi nay duoc AI cham diem. Nguoi lam bai se nop bai viet hoac transcript noi thay vi chon dap an co dinh.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Giai thich</label>
            <textarea
              rows={2}
              value={form.explanation}
              onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Goi y</label>
            <input
              type="text"
              value={form.hint}
              onChange={(e) => setForm((prev) => ({ ...prev, hint: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Huy
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              {isEditing ? "Luu thay doi" : "Them cau hoi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
