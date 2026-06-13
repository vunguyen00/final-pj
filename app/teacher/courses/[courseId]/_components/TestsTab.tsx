import Link from "next/link";
import type { Test } from "../types";

type TestsTabProps = {
  tests: Test[];
  modulesCount: number;
  onOpenCreateModal: () => void;
  onDeleteTest: (testId: string) => void;
};

export function TestsTab({
  tests,
  modulesCount,
  onOpenCreateModal,
  onDeleteTest,
}: TestsTabProps) {
  const test = tests[0];
  const cannotCreate = modulesCount === 0 || tests.length > 0;
  const createTitle =
    tests.length > 0
      ? "Khóa học đã có bài test. Mỗi khóa học chỉ được có một bài test."
      : modulesCount === 0
        ? "Khóa học phải có ít nhất một chương trước khi tạo bài test."
        : "";

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
          Tạo bài test
        </button>
      </div>

      {!test ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="font-semibold text-slate-700">Chưa có bài test nào</p>
          <p className="mt-1 text-sm text-slate-500">
            Tạo bài kiểm tra sau khi khóa học đã có ít nhất một chương.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{test.name}</h3>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                <span>Điểm tối đa: {test.maxScore}</span>
                <span>Điểm đạt: {test.passingScore}</span>
                <span>Lượt đã làm: {test._count.attempts}</span>
                <span>
                  Thời gian: {test.timeLimit ? `${test.timeLimit} phút` : "Không giới hạn"}
                </span>
                <span>{test._count.questions} câu hỏi</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/teacher/tests/${test.id}`}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Chỉnh sửa thông tin
              </Link>
              <Link
                href={`/teacher/tests/${test.id}/questions`}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Quản lý câu hỏi
              </Link>
              <button
                type="button"
                onClick={() => onDeleteTest(test.id)}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
