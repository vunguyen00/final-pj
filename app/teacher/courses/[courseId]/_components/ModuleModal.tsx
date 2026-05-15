import { FormEvent } from "react";

type ModuleModalProps = {
  isOpen: boolean;
  moduleName: string;
  isEditing: boolean;
  onChangeName: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function ModuleModal({ isOpen, moduleName, isEditing, onChangeName, onClose, onSubmit }: ModuleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">{isEditing ? "Chinh sua Module" : "Tao Module moi"}</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900">Ten Module *</label>
            <input
              type="text"
              required
              value={moduleName}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="Vi du: Unit 1 - Introduction"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              color="text-black"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Huy
            </button>
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              {isEditing ? "Luu" : "Tao"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
