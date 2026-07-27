import Link from "next/link";
import type { CourseManagementLabels } from "@/lib/language-display";
import type { Test } from "../types";

type TestsTabProps = {
  tests: Test[];
  modulesCount: number;
  deletingTestId: string | null;
  labels: CourseManagementLabels["testsTab"];
  onOpenCreateModal: () => void;
  onDeleteTest: (testId: string) => void;
};

export function TestsTab({
  tests,
  modulesCount,
  deletingTestId,
  labels,
  onOpenCreateModal,
  onDeleteTest,
}: TestsTabProps) {
  const cannotCreate = modulesCount === 0;
  const createTitle = modulesCount === 0 ? labels.needsModule : "";

  return (
    <div className="mt-6">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={onOpenCreateModal}
          disabled={cannotCreate}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
            cannotCreate
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
          title={createTitle}
        >
          {labels.createTest}
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="font-semibold text-slate-700">{labels.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            {labels.emptyDescription}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <div key={test.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{test.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-blue-700">
                    {test.lesson ? test.lesson.title : test.module ? test.module.name : "Course"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                    <span>{labels.maxScore(test.maxScore)}</span>
                    <span>{labels.passingScore(test.passingScore)}</span>
                    <span>{labels.attempts(test._count.attempts)}</span>
                    <span>{labels.timeLimit(test.timeLimit)}</span>
                    <span>{labels.questions(test._count.questions)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/teacher/tests/${test.id}`}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {labels.editInfo}
                  </Link>
                  <Link
                    href={`/teacher/tests/${test.id}/questions`}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    {labels.manageQuestions}
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDeleteTest(test.id)}
                    disabled={deletingTestId === test.id}
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingTestId === test.id ? labels.deleting : labels.delete}
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
