import Link from "next/link";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getCourses() {
  try {
    return await prisma.course.findMany({
      where: { status: "ACTIVE" },
      include: {
        instructor: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch {
    return [];
  }
}

const categories = ["Tat ca", "Speaking", "Writing", "Reading", "Listening", "Grammar", "Vocabulary"];

export default async function CoursesPage() {
  const [courses, user] = await Promise.all([getCourses(), authenticate()]);

  const enrolledIds = new Set<string>();
  if (user?.role === "STUDENT") {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      select: { courseId: true },
    });
    for (const item of enrollments) {
      enrolledIds.add(item.courseId);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Danh sach khoa hoc</h1>
          <p className="mt-2 text-slate-600">Kham pha cac khoa hoc tieng Anh chat luong cao</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                cat === "Tat ca"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);

            return (
              <article key={course.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg">
                <Link href={`/courses/${course.id}`} className="block">
                  <div className="relative aspect-video overflow-hidden bg-slate-100">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.name}
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">No image</div>
                    )}
                    {course.category ? (
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
                        {course.category}
                      </span>
                    ) : null}
                  </div>
                </Link>

                <div className="p-5">
                  <Link href={`/courses/${course.id}`}>
                    <h3 className="line-clamp-2 font-semibold text-slate-900 hover:text-blue-600">{course.name}</h3>
                  </Link>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{course.description}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <span>{course.lessons} bai</span>
                    <span>•</span>
                    <span>{course._count.enrollments} hoc vien</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm font-medium text-slate-900">{course.instructor?.username || "Giang vien"}</span>
                    {isEnrolled ? (
                      <Link
                        href={`/student/hoc-bai?courseId=${course.id}`}
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                      >
                        Vao hoc
                      </Link>
                    ) : (
                      <span className="text-lg font-semibold text-blue-600">{course.price.toLocaleString("vi-VN")}d</span>
                    )}
                  </div>
                  {isEnrolled ? <p className="mt-2 text-xs font-medium text-emerald-700">Da dang ky</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
