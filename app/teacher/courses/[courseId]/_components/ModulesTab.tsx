import Link from "next/link";
import type { CourseManagementLabels } from "@/lib/language-display";
import { Module } from "../types";

type ModulesTabProps = {
  courseId: string;
  modules: Module[];
  labels: CourseManagementLabels["modulesTab"];
  onOpenCreateModal: () => void;
  onEditModule: (module: Module) => void;
  onDeleteModule: (moduleId: string) => void;
};

export function ModulesTab({
  courseId,
  modules,
  labels,
  onOpenCreateModal,
  onEditModule,
  onDeleteModule,
}: ModulesTabProps) {
  return (
    <div className="mt-6">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {labels.addModule}
        </button>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        {labels.videoOptional}
      </p>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-600">{labels.empty}</p>
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
                    <p className="text-sm text-slate-500">{labels.lessonCount(module.lessons.length)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/teacher/courses/${courseId}/modules/${module.id}`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title={labels.manageLessons}>
                    {labels.manageLessons}
                  </Link>
                  <button
                    type="button"
                    onClick={() => onEditModule(module)}
                    className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                    title={labels.edit}
                  >
                    {labels.edit}
                  </button>
                  <button type="button" onClick={() => onDeleteModule(module.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title={labels.delete}>
                    {labels.delete}
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
