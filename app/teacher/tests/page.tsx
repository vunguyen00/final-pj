import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Quản lý bài test | FinnCenter" };

const PAGE_SIZE = 20;
const assessmentModeLabel: Record<string, string> = {
  STANDARD: "Trắc nghiệm",
  WRITING: "Writing AI",
  SPEAKING: "Speaking AI",
};

function formatTimeLimit(minutes: number | null) {
  return minutes ? `${minutes} phút` : "Không giới hạn";
}

export default async function TeacherTestsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requireRole("TEACHER", "ADMIN");
  const isAdmin = user.role === "ADMIN";
  const params = await searchParams;
  const query = String(params.q || "").trim().slice(0, 100);
  const requestedPage = Math.max(1, Math.trunc(Number(params.page)) || 1);
  const courseFilter = {
    ...(!isAdmin ? { instructorId: user.id } : {}),
    ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
  };
  const testWhere = { kind: "COURSE" as const, ...(Object.keys(courseFilter).length ? { course: courseFilter } : {}) };
  const totalTests = await prisma.test.count({ where: testWhere });
  const totalPages = Math.max(1, Math.ceil(totalTests / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const [tests, totalQuestions, totalAttempts] = await Promise.all([
    prisma.test.findMany({
      where: testWhere,
      select: {
        id: true,
        name: true,
        assessmentMode: true,
        passingScore: true,
        timeLimit: true,
        course: {
          select: {
            id: true,
            name: true,
            instructor: { select: { username: true } },
            language: { select: { name: true } },
          },
        },
        module: { select: { name: true } },
        lesson: { select: { title: true } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.question.count({ where: { test: testWhere } }),
    prisma.testAttempt.count({ where: { test: testWhere } }),
  ]);

  const pageHref = (targetPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    search.set("page", String(targetPage));
    return `/teacher/tests?${search.toString()}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-600">Teacher tests</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">Quản lý bài test</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Tìm, chỉnh sửa và quản lý câu hỏi cho các bài test thuộc khóa học của bạn.</p>
          </div>
          <Link href="/teacher/courses" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Quản lý khóa học</Link>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Tổng bài test" value={totalTests.toLocaleString("vi-VN")} />
          <SummaryCard label="Tổng câu hỏi" value={totalQuestions.toLocaleString("vi-VN")} />
          <SummaryCard label="Lượt làm bài" value={totalAttempts.toLocaleString("vi-VN")} />
        </section>

        <form className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="course-test-search" className="text-sm font-semibold text-slate-700">Tìm bài test theo tên khóa học</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="course-test-search" name="q" defaultValue={query} placeholder="Nhập tên khóa học..." className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <button type="submit" className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">Tìm kiếm</button>
          </div>
        </form>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-950">Danh sách bài test</h2>
            <p className="mt-1 text-sm text-slate-500">Hiển thị tối đa {PAGE_SIZE} bài test mỗi trang.</p>
          </div>

          {tests.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="px-4 py-3">Bài test</th><th className="px-4 py-3">Khóa học</th><th className="px-4 py-3">Hình thức</th><th className="px-4 py-3">Câu hỏi</th><th className="px-4 py-3">Lượt làm</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3 text-right">Thao tác</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tests.map((test) => (
                    <tr key={test.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4"><p className="font-semibold text-slate-950">{test.name}</p><p className="mt-1 text-xs text-slate-500">Điểm đạt: {test.passingScore}</p></td>
                      <td className="px-4 py-4">
                        {test.course ? <><Link href={`/teacher/courses/${test.course.id}`} className="font-medium text-slate-800 hover:text-blue-700">{test.course.name}</Link><p className="mt-1 text-xs text-slate-500">{test.lesson?.title || test.module?.name || "Toàn khóa học"} · {test.course.language?.name || "Chưa gán ngôn ngữ"}{isAdmin ? ` · ${test.course.instructor?.username || "Giảng viên"}` : ""}</p></> : <span className="text-slate-500">Không gắn khóa học</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{assessmentModeLabel[test.assessmentMode] || test.assessmentMode}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{test._count.questions}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{test._count.attempts}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatTimeLimit(test.timeLimit)}</td>
                      <td className="px-4 py-4"><div className="flex justify-end gap-2"><Link href={`/teacher/tests/${test.id}`} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">Chỉnh sửa</Link><Link href={`/teacher/tests/${test.id}/questions`} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700">Câu hỏi</Link></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="px-5 py-12 text-center"><h3 className="font-semibold text-slate-950">Không tìm thấy bài test</h3><p className="mt-1 text-sm text-slate-500">Thử tên khóa học khác hoặc tạo bài test từ trang quản lý khóa học.</p></div>}

          {totalPages > 1 ? (
            <nav aria-label="Phân trang bài test" className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm">
              <Link href={pageHref(Math.max(1, page - 1))} aria-disabled={page === 1} className={`rounded-lg border px-3 py-2 font-semibold ${page === 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>Trang trước</Link>
              <span className="text-slate-600">Trang {page} / {totalPages}</span>
              <Link href={pageHref(Math.min(totalPages, page + 1))} aria-disabled={page === totalPages} className={`rounded-lg border px-3 py-2 font-semibold ${page === totalPages ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>Trang sau</Link>
            </nav>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></article>;
}
