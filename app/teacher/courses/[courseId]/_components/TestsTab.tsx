import Link from "next/link";
import { Test } from "../types";

type TestsTabProps = {
  tests: Test[];
  modulesCount: number;
  onOpenCreateModal: () => void;
  onDeleteTest: (testId: string) => void;
};

export function TestsTab({ tests, modulesCount, onOpenCreateModal, onDeleteTest }: TestsTabProps) {
  return (
    <div className="mt-6">
      <div className="mb-4 flex justify-end">
        <button
          onClick={onOpenCreateModal}
          disabled={modulesCount === 0 || tests.length > 0}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${modulesCount === 0 || tests.length > 0 ? "cursor-not-allowed bg-gray-300 text-gray-500" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          title={tests.length > 0 ? "Khoa hoc da co bai test. Moi khoa hoc chi duoc co 1 bai test." : modulesCount === 0 ? "Khoa hoc phai co it nhat 1 module truoc khi tao bai test" : ""}
        >
          Tao Bai Test
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-600">Chua co bai test nao</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900">{tests[0].name}</h3>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                <span>Diem toi da: {tests[0].maxScore}</span>
                <span>Diem dat: {tests[0].passingScore}</span>
                <span>Lan lam: {tests[0]._count.attempts}/{tests[0].maxAttempts}</span>
                {tests[0].timeLimit && <span>Thoi gian: {tests[0].timeLimit}p</span>}
              </div>
              <p className="mt-2 text-sm text-slate-500">{tests[0]._count.questions} cau hoi</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/teacher/tests/${tests[0].id}/questions`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Quan ly bai test
              </Link>
              <button onClick={() => onDeleteTest(tests[0].id)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Xoa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
