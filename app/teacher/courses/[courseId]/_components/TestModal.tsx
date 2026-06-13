import type { FormEvent } from "react";
import { FIXED_TEST_MAX_SCORE } from "@/lib/test-rules";
import type { TestForm } from "../types";

type TestModalProps = {
  isOpen: boolean;
  form: TestForm;
  onChangeForm: (form: TestForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TestModal({
  isOpen,
  form,
  onChangeForm,
  onClose,
  onSubmit,
}: TestModalProps) {
  if (!isOpen) return null;

  const inputClass =
    "mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">Tạo bài test mới</h2>
          <p className="mt-1 text-sm text-slate-500">
            Thiết lập nội dung, điểm đạt và thời gian hoàn thành bài.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-6">
          <label className="block text-sm font-semibold text-slate-700">
            Tên bài test <span className="text-red-500">*</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(event) => onChangeForm({ ...form, name: event.target.value })}
              placeholder="Ví dụ: Bài kiểm tra cuối khóa"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Mô tả hoặc hướng dẫn làm bài
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                onChangeForm({ ...form, description: event.target.value })
              }
              placeholder="Nêu yêu cầu và những lưu ý dành cho học viên..."
              className={inputClass}
            />
          </label>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            Điểm tối đa được cố định là <strong>{FIXED_TEST_MAX_SCORE} điểm</strong>.
            Tổng điểm của tất cả câu hỏi phải bằng {FIXED_TEST_MAX_SCORE}.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Điểm đạt
              <input
                type="number"
                min={0}
                max={FIXED_TEST_MAX_SCORE}
                required
                value={form.passingScore}
                onChange={(event) =>
                  onChangeForm({ ...form, passingScore: event.target.value })
                }
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Giới hạn thời gian làm bài
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={form.timeLimit}
                  onChange={(event) =>
                    onChangeForm({ ...form, timeLimit: event.target.value })
                  }
                  placeholder="Không giới hạn"
                  className={`${inputClass} pr-16`}
                />
                <span className="pointer-events-none absolute bottom-2.5 right-3 text-sm font-medium text-slate-500">
                  phút
                </span>
              </div>
            </label>
          </div>

          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            Học viên được làm bài không giới hạn số lượt. Hệ thống vẫn ghi nhận đầy đủ tổng
            số lượt đã làm.
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={form.shuffleQuestions}
              onChange={(event) =>
                onChangeForm({
                  ...form,
                  shuffleQuestions: event.target.checked,
                })
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Xáo trộn câu hỏi
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Thứ tự câu hỏi có thể thay đổi khi học viên bắt đầu làm bài.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Tạo bài test
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
