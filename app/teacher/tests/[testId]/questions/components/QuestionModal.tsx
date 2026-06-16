import { buildAnswersForKind, QUESTION_KIND_OPTIONS } from "../helpers";
import { Answer, QuestionForm, QuestionKind } from "../types";

type Props = {
  show: boolean;
  isEditing: boolean;
  form: QuestionForm;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setForm: (updater: (prev: QuestionForm) => QuestionForm) => void;
  uploadingAudio: boolean;
  audioUploadMessage: string;
  onAudioUpload: (file: File | null) => void;
};

const needsObjectiveAnswers = (kind: QuestionKind) => kind === "MULTIPLE_CHOICE" || kind === "TRUE_FALSE";

export function QuestionModal({
  show,
  isEditing,
  form,
  onClose,
  onSubmit,
  setForm,
  uploadingAudio,
  audioUploadMessage,
  onAudioUpload,
}: Props) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{isEditing ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Nội dung câu hỏi và gợi ý sẽ giữ nguyên định dạng xuống dòng.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Dạng câu hỏi</label>
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
            <label className="block text-sm font-medium text-slate-700">Nội dung câu hỏi *</label>
            <textarea
              required
              rows={3}
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {form.kind === "LISTENING" && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <label className="block text-sm font-medium text-slate-700">Audio nghe và trả lời *</label>
              <input
                type="text"
                value={form.audioUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, audioUrl: e.target.value }))}
                placeholder="https://example.com/audio.mp3"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <label className="block text-sm font-medium text-slate-700">
                Hoặc tải file audio lên
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/mp4,audio/aac"
                  disabled={uploadingAudio}
                  onChange={(e) => onAudioUpload(e.target.files?.[0] || null)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-slate-500 focus:outline-none"
                />
              </label>
              {audioUploadMessage ? (
                <p className="rounded-lg bg-blue-50 p-2 text-sm text-blue-700">
                  {audioUploadMessage}
                </p>
              ) : null}
              {form.audioUrl ? (
                <audio controls className="h-8 w-full">
                  <source src={form.audioUrl} />
                  Trình duyệt của bạn không hỗ trợ phát âm thanh.
                </audio>
              ) : null}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Điểm số</label>
            <input
              type="number"
              value={form.score}
              onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {needsObjectiveAnswers(form.kind) && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Đáp án (chọn đáp án đúng)</label>
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
                    placeholder={`Đáp án ${index + 1}`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {form.kind === "FILL_IN_BLANK" && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Đáp án đúng *</label>
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
              Câu hỏi này được AI chấm điểm. Người làm bài sẽ nộp bài viết hoặc transcript giọng nói thay vì chọn đáp án cố định.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Giải thích</label>
            <textarea
              rows={2}
              value={form.explanation}
              onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Gợi ý</label>
            <textarea
              rows={4}
              value={form.hint}
              onChange={(e) => setForm((prev) => ({ ...prev, hint: e.target.value }))}
              placeholder={"Nhập mỗi ý trên một dòng, ví dụ:\n- Xác định từ khóa chính\n- Chú ý thì của động từ"}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Mỗi dòng sẽ được hiển thị thành một gạch đầu dòng cho người làm bài.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Hủy
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              {isEditing ? "Lưu thay đổi" : "Thêm câu hỏi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
