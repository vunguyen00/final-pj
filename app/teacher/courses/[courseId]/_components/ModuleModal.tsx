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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{isEditing ? "Chỉnh sửa chương" : "Tạo chương mới"}</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900">Tên chương *</label>
            <input
              type="text"
              required
              value={moduleName}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="Ví dụ: Chương 1 - Giới thiệu"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              color="text-black"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Hủy
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {isEditing ? "Lưu" : "Tạo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
