import Link from "next/link";
import { Module } from "../types";

type ModulesTabProps = {
  courseId: string;
  modules: Module[];
  onOpenCreateModal: () => void;
  onDeleteModule: (moduleId: string) => void;
};

export function ModulesTab({ courseId, modules, onOpenCreateModal, onDeleteModule }: ModulesTabProps) {
  return (
    <div className="mt-6">
      <div className="mb-4 flex justify-end">
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Them Module
        </button>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        Video la tuy chon trong tung bai hoc cua module (co the them hoac de trong).
      </p>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-600">Chua co module nao</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((module, index) => (
            <div key={module.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">{index + 1}</span>
                  <div>
                    <h3 className="font-medium text-slate-900">{module.name}</h3>
                    <p className="text-sm text-slate-500">{module.lessons.length} bai hoc</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/teacher/courses/${courseId}/modules/${module.id}`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="Quan ly bai hoc">
                    Quan ly
                  </Link>
                  <button onClick={() => onDeleteModule(module.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Xoa">
                    Xoa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
