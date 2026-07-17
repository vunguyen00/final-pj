import { FormEvent } from "react";
import type { CourseManagementLabels } from "@/lib/language-display";

type ModuleModalProps = {
  isOpen: boolean;
  moduleName: string;
  isEditing: boolean;
  isSubmitting: boolean;
  labels: CourseManagementLabels["moduleModal"];
  onChangeName: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function ModuleModal({ isOpen, moduleName, isEditing, isSubmitting, labels, onChangeName, onClose, onSubmit }: ModuleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{isEditing ? labels.editTitle : labels.createTitle}</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="module-name" className="block text-sm font-medium text-slate-900">{labels.name}</label>
            <input
              id="module-name"
              type="text"
              required
              value={moduleName}
              disabled={isSubmitting}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder={labels.placeholder}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              color="text-black"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
              {labels.cancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? labels.saving : isEditing ? labels.save : labels.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
