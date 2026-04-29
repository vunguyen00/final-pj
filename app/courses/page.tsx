import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getCourses() {
  try {
    const courses = await prisma.course.findMany({
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
    return courses;
  } catch (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
}

const categories = ["Tất cả", "Speaking", "Writing", "Reading", "Listening", "Grammar", "Vocabulary"];

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Danh sách khóa học</h1>
          <p className="mt-2 text-slate-600">Khám phá các khóa học tiếng Anh chất lượng cao</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                cat === "Tất cả"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Course Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                )}
                {course.category && (
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
                    {course.category}
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600">
                  {course.name}
                </h3>
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                  {course.description}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  {course.duration && (
                    <>
                      <span>⏱ {course.duration}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>📚 {course.lessons} bài</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-slate-900">
                      {course.instructor?.username || "Giảng viên"}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">
                    {course.price.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}