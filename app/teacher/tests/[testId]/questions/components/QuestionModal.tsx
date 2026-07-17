import { buildAnswersForKind } from "../helpers";
import { getQuestionEditorLabels } from "../labels";
import { Answer, QuestionForm, QuestionKind } from "../types";
import { ModalDialog } from "@/app/components/ModalDialog";

type Props = {
  show: boolean;
  isEditing: boolean;
  form: QuestionForm;
  languageCode?: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setForm: (updater: (prev: QuestionForm) => QuestionForm) => void;
  isSubmitting: boolean;
  uploadingAudio: boolean;
  audioUploadMessage: string;
  notice: { tone: "success" | "error"; message: string } | null;
  onAudioUpload: (file: File | null) => void;
};

const needsObjectiveAnswers = (kind: QuestionKind) => kind === "MULTIPLE_CHOICE" || kind === "TRUE_FALSE";
const needsTextAnswer = (kind: QuestionKind) => kind === "FILL_IN_BLANK" || kind === "LISTENING";
const supportsAudio = (kind: QuestionKind) => kind === "LISTENING" || kind === "MULTIPLE_CHOICE";

export function QuestionModal({
  show,
  isEditing,
  form,
  languageCode,
  onClose,
  onSubmit,
  setForm,
  isSubmitting,
  uploadingAudio,
  audioUploadMessage,
  notice,
  onAudioUpload,
}: Props) {
  if (!show) return null;
  const labels = getQuestionEditorLabels(languageCode);

  const handleTypeSelect = (kind: QuestionKind) => {
    const answers = buildAnswersForKind(kind);
    setForm((prev) => ({
      ...prev,
      kind,
      audioUrl: supportsAudio(kind) ? prev.audioUrl : "",
      hasListening: supportsAudio(kind) && Boolean(prev.audioUrl),
      answers,
    }));
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
    <ModalDialog labelledBy="question-modal-title" onClose={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="question-modal-title" className="text-xl font-bold text-slate-900">{isEditing ? labels.editTitle : labels.addTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">{labels.description}</p>
        {notice?.tone === "error" ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{notice.message}</p> : null}
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="question-kind" className="block text-sm font-medium text-slate-700">
              {labels.typeLabel}
            </label>
            <select
              id="question-kind"
              value={form.kind}
              disabled={isSubmitting}
              onChange={(e) => handleTypeSelect(e.target.value as QuestionKind)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {labels.kindOptions.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="question-content" className="block text-sm font-medium text-slate-700">
              {labels.contentLabel}
            </label>
            <textarea
              id="question-content"
              required
              rows={3}
              value={form.content}
              disabled={isSubmitting}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          {supportsAudio(form.kind) && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <label htmlFor="question-audio-url" className="block text-sm font-medium text-slate-700">
                {form.kind === "LISTENING" ? labels.audioLabel : labels.optionalAudioLabel}
              </label>
              <input
                id="question-audio-url"
                type="text"
                value={form.audioUrl}
                disabled={isSubmitting || uploadingAudio}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    audioUrl: e.target.value,
                    hasListening: Boolean(e.target.value.trim()),
                  }))
                }
                placeholder="https://example.com/audio.mp3"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <label className="block text-sm font-medium text-slate-700">
                {labels.uploadAudio}
                <input
                  id="question-audio-file"
                  type="file"
                  accept=".mp3,.wav,.ogg,.webm,.m4a,.aac,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/mp4,audio/aac,video/webm"
                  disabled={uploadingAudio || isSubmitting}
                  onChange={(e) => onAudioUpload(e.target.files?.[0] || null)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-slate-500 focus:outline-none"
                />
              </label>
              <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">{labels.audioHint}</p>
              {audioUploadMessage ? <p className="rounded-lg bg-blue-50 p-2 text-sm text-blue-700">{audioUploadMessage}</p> : null}
              {form.audioUrl ? (
                <div className="space-y-2">
                  <audio controls className="h-8 w-full">
                    <source src={form.audioUrl} />
                    {labels.unsupportedAudio}
                  </audio>
                  {form.kind === "MULTIPLE_CHOICE" ? (
                    <button
                      type="button"
                      disabled={isSubmitting || uploadingAudio}
                      onClick={() => setForm((prev) => ({ ...prev, audioUrl: "", hasListening: false }))}
                      className="text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {labels.removeAudio}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          <div>
            <label htmlFor="question-score" className="block text-sm font-medium text-slate-700">
              {labels.score}
            </label>
            <input
              id="question-score"
              type="number"
              value={form.score}
              disabled={isSubmitting}
              onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          {needsObjectiveAnswers(form.kind) && (
            <div className="space-y-2">
              <p className="block text-sm font-medium text-slate-700">{labels.answers}</p>
              {form.answers.map((answer, index) => (
                <div key={answer.id || `answer-${index}`} className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={labels.answerPlaceholder(index)}
                    disabled={isSubmitting}
                    onClick={() => handleSetCorrect(index)}
                    className={`h-6 w-6 rounded-full border-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                      answer.isCorrect ? "border-green-500 bg-green-500" : "border-slate-300"
                    }`}
                  />
                  <input
                    aria-label={labels.answerPlaceholder(index)}
                    type="text"
                    value={answer.content}
                    disabled={isSubmitting}
                    onChange={(e) => handleAnswerChange(index, "content", e.target.value)}
                    placeholder={labels.answerPlaceholder(index)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
              ))}
            </div>
          )}

          {needsTextAnswer(form.kind) && (
            <div>
              <label htmlFor="question-correct-answer" className="block text-sm font-medium text-slate-700">
                {labels.correctAnswer}
              </label>
              <textarea
                id="question-correct-answer"
                rows={3}
                value={form.answers[0]?.content || ""}
                disabled={isSubmitting}
                onChange={(e) => handleAnswerChange(0, "content", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          )}

          {(form.kind === "ESSAY" || form.kind === "SPEAKING") && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {labels.aiNotice}
            </div>
          )}

          <div>
            <label htmlFor="question-explanation" className="block text-sm font-medium text-slate-700">
              {labels.explanation}
            </label>
            <textarea
              id="question-explanation"
              rows={2}
              value={form.explanation}
              disabled={isSubmitting}
              onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label htmlFor="question-hint" className="block text-sm font-medium text-slate-700">
              {labels.hint}
            </label>
            <textarea
              id="question-hint"
              rows={4}
              value={form.hint}
              disabled={isSubmitting}
              onChange={(e) => setForm((prev) => ({ ...prev, hint: e.target.value }))}
              placeholder={labels.hintPlaceholder}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500">{labels.hintHelp}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploadingAudio}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? labels.saving : isEditing ? labels.save : labels.add}
            </button>
          </div>
        </form>
      </div>
    </ModalDialog>
  );
}
