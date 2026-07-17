import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Quản lý bài test | FinnCenter",
};

const assessmentModeLabel: Record<string, string> = {
  STANDARD: "Trắc nghiệm",
  WRITING: "Writing AI",
  SPEAKING: "Speaking AI",
};

function formatTimeLimit(minutes: number | null) {
  return minutes ? `${minutes} phút` : "Không giới hạn";
}

export default async function TeacherTestsPage() {
  const user = await requireRole("TEACHER", "ADMIN");
  const isAdmin = user.role === "ADMIN";

  const [tests, courses] = await Promise.all([
    prisma.test.findMany({
      where: isAdmin
        ? { kind: "COURSE" }
        : { kind: "COURSE", course: { instructorId: user.id } },
      select: {
        id: true,
        name: true,
        assessmentMode: true,
        passingScore: true,
        timeLimit: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            name: true,
            instructor: { select: { username: true } },
            language: { select: { name: true, code: true } },
          },
        },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({
      where: isAdmin ? {} : { instructorId: user.id },
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { modules: true, tests: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const coursesWithoutTests = courses.filter((course) => course._count.tests === 0);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-600">Teacher tests</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">Quản lý bài test</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Xem, chỉnh sửa và quản lý câu hỏi cho các bài test thuộc khóa học của bạn.
            </p>
          </div>
          <Link
            href="/teacher/courses"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Quản lý khóa học
          </Link>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Tổng bài test" value={tests.length.toLocaleString("vi-VN")} />
          <SummaryCard label="Tổng câu hỏi" value={tests.reduce((sum, test) => sum + test._count.questions, 0).toLocaleString("vi-VN")} />
          <SummaryCard label="Lượt làm bài" value={tests.reduce((sum, test) => sum + test._count.attempts, 0).toLocaleString("vi-VN")} />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-950">Danh sách bài test</h2>
            <p className="mt-1 text-sm text-slate-500">Mỗi khóa học hiện chỉ có một bài test.</p>
          </div>

          {tests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Bài test</th>
                    <th className="px-4 py-3">Khóa học</th>
                    <th className="px-4 py-3">Hình thức</th>
                    <th className="px-4 py-3">Câu hỏi</th>
                    <th className="px-4 py-3">Lượt làm</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tests.map((test) => (
                    <tr key={test.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">{test.name}</p>
                        <p className="mt-1 text-xs text-slate-500">Điểm đạt: {test.passingScore}</p>
                      </td>
                      <td className="px-4 py-4">
                        {test.course ? (
                          <>
                            <Link href={`/teacher/courses/${test.course.id}`} className="font-medium text-slate-800 hover:text-blue-700">
                              {test.course.name}
                            </Link>
                            <p className="mt-1 text-xs text-slate-500">
                              {test.course.language?.name || "Chưa gán ngôn ngữ"}
                              {isAdmin ? ` - ${test.course.instructor?.username || "Giảng viên"}` : ""}
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-500">Không gắn khóa học</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {assessmentModeLabel[test.assessmentMode] || test.assessmentMode}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{test._count.questions}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{test._count.attempts}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatTimeLimit(test.timeLimit)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/teacher/tests/${test.id}`}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Chỉnh sửa
                          </Link>
                          <Link
                            href={`/teacher/tests/${test.id}/questions`}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Câu hỏi
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <h3 className="text-base font-semibold text-slate-950">Chưa có bài test nào</h3>
              <p className="mt-1 text-sm text-slate-500">Vào trang chi tiết khóa học để tạo bài test đầu tiên.</p>
            </div>
          )}
        </section>

        {coursesWithoutTests.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Khóa học chưa có bài test</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {coursesWithoutTests.slice(0, 6).map((course) => (
                <Link
                  key={course.id}
                  href={`/teacher/courses/${course.id}`}
                  className="rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <p className="font-semibold text-slate-950">{course.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {course._count.modules} chương - trạng thái {course.status}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}
