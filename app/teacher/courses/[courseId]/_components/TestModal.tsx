import { FormEvent } from "react";
import { TestForm } from "../types";

type TestModalProps = {
  isOpen: boolean;
  form: TestForm;
  onChangeForm: (form: TestForm) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function TestModal({ isOpen, form, onChangeForm, onClose, onSubmit }: TestModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Tao Bai Test moi</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <input type="text" required value={form.name} onChange={(e) => onChangeForm({ ...form, name: e.target.value })} placeholder="Vi du: Test Unit 1" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <textarea rows={2} value={form.description} onChange={(e) => onChangeForm({ ...form, description: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" required value={form.maxScore} onChange={(e) => onChangeForm({ ...form, maxScore: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" required value={form.passingScore} onChange={(e) => onChangeForm({ ...form, passingScore: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="number" required value={form.maxAttempts} onChange={(e) => onChangeForm({ ...form, maxAttempts: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" value={form.timeLimit} onChange={(e) => onChangeForm({ ...form, timeLimit: e.target.value })} placeholder="De trong neu khong gioi han" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="shuffleQuestions" checked={form.shuffleQuestions} onChange={(e) => onChangeForm({ ...form, shuffleQuestions: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            <label htmlFor="shuffleQuestions" className="text-sm text-slate-700">Xao tron cau hoi khi lam bai</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Huy</button>
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Tao bai test</button>
          </div>
        </form>
      </div>
    </div>
  );
}
