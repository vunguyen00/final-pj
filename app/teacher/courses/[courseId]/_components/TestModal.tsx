import type { FormEvent } from "react";
import type { CourseManagementLabels } from "@/lib/language-display";
import { FIXED_TEST_MAX_SCORE } from "@/lib/test-rules";
import type { TestForm } from "../types";

type TestModalProps = {
  isOpen: boolean;
  form: TestForm;
  isSubmitting: boolean;
  labels: CourseManagementLabels["testModal"];
  onChangeForm: (form: TestForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TestModal({
  isOpen,
  form,
  isSubmitting,
  labels,
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
          <h2 className="text-xl font-bold text-slate-950">{labels.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {labels.description}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-6">
          <label className="block text-sm font-semibold text-slate-700">
            {labels.name}
            <input
              type="text"
              required
              value={form.name}
              disabled={isSubmitting}
              onChange={(event) => onChangeForm({ ...form, name: event.target.value })}
              placeholder={labels.namePlaceholder}
              className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            {labels.instructions}
            <textarea
              rows={3}
              value={form.description}
              disabled={isSubmitting}
              onChange={(event) =>
                onChangeForm({ ...form, description: event.target.value })
              }
              placeholder={labels.instructionsPlaceholder}
              className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
            />
          </label>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            {labels.fixedScore(FIXED_TEST_MAX_SCORE)}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              {labels.passingScore}
              <input
                type="number"
                min={0}
                max={FIXED_TEST_MAX_SCORE}
                required
                value={form.passingScore}
                disabled={isSubmitting}
                onChange={(event) =>
                  onChangeForm({ ...form, passingScore: event.target.value })
                }
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              {labels.timeLimit}
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={form.timeLimit}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    onChangeForm({ ...form, timeLimit: event.target.value })
                  }
                  placeholder={labels.noLimit}
                  className={`${inputClass} pr-16 disabled:cursor-not-allowed disabled:bg-slate-100`}
                />
                <span className="pointer-events-none absolute bottom-2.5 right-3 text-sm font-medium text-slate-500">
                  {labels.minutes}
                </span>
              </div>
            </label>
          </div>

          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            {labels.unlimitedAttempts}
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={form.shuffleQuestions}
              disabled={isSubmitting}
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
                {labels.shuffleTitle}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {labels.shuffleDescription}
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? labels.creating : labels.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
