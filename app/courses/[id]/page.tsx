import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

async function getCourse(id: string) {
  try {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            username: true,
          },
        },
        modules: {
          include: {
            lessons: true,
          },
          orderBy: { order: "asc" },
        },
        tests: true,
        _count: {
          select: {
            enrollments: true,
            feedbacks: true,
          },
        },
      },
    });
    return course;
  } catch (error) {
    console.error("Error fetching course:", error);
    return null;
  }
}

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);

  if (!course) {
    notFound();
  }

  const totalLessons = course.modules?.reduce((acc, module) => acc + (module.lessons?.length || 0), 0) || 0;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-slate-900 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="text-white">
              {course.category && (
                <span className="inline-block rounded-full bg-blue-600 px-3 py-1 text-sm font-medium">
                  {course.category}
                </span>
              )}
              <h1 className="mt-4 text-3xl font-bold lg:text-4xl">{course.name}</h1>
              <p className="mt-4 text-slate-300">{course.description}</p>
              
              <div className="mt-6 flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span>{course._count.enrollments} học viên</span>
                </div>
                {course.duration && <div>⏱ {course.duration}</div>}
                <div>📚 {totalLessons} bài học</div>
              </div>

              {/* Instructor */}
              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold">
                  {course.instructor?.username?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-medium">{course.instructor?.username || "Giảng viên"}</p>
                  <p className="text-sm text-slate-400">Giảng viên</p>
                </div>
              </div>
            </div>

            {/* Course Image */}
            <div className="relative aspect-video overflow-hidden rounded-xl">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-20 w-20">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Mô tả khóa học</h2>
              <p className="mt-4 text-slate-600">{course.description}</p>
            </div>

            {/* Curriculum */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Nội dung khóa học</h2>
              <div className="mt-4 space-y-4">
                {course.modules?.map((module, index) => (
                  <div key={module.id} className="border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between bg-slate-50 p-4">
                      <h3 className="font-medium text-slate-900">Module {index + 1}: {module.name}</h3>
                      <span className="text-sm text-slate-500">{module.lessons?.length || 0} bài học</span>
                    </div>
                    {module.lessons?.length > 0 && (
                      <div className="divide-y divide-slate-100">
                        {module.lessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center gap-3 p-4">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-400">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span className="text-sm text-slate-700">{lesson.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(!course.modules || course.modules.length === 0) && (
                  <p className="text-slate-500">Chưa có nội dung khóa học</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="text-3xl font-bold text-slate-900">
                {course.price.toLocaleString("vi-VN")}đ
              </div>
              <button className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700">
                Đăng ký ngay
              </button>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-green-500">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {totalLessons} bài học
                </li>
                <li className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-green-500">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Học mọi lúc, mọi nơi
                </li>
                <li className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-green-500">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Certificate hoàn thành
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}