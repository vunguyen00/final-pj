import { notFound } from "next/navigation";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EnrollCourseCard from "./components/EnrollCourseCard";

async function getCourse(id: string) {
  try {
    return await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, username: true } },
        modules: {
          include: { lessons: true },
          orderBy: { order: "asc" },
        },
        _count: { select: { enrollments: true } },
      },
    });
  } catch {
    return null;
  }
}

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, user] = await Promise.all([getCourse(id), authenticate()]);

  if (!course) {
    notFound();
  }

  const totalLessons = course.modules.reduce((acc, module) => acc + module.lessons.length, 0);
  const canLearnDirectly = Boolean(user && user.role === "TEACHER" && course.instructorId === user.id);
  const enrollment =
    user
      ? await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
        })
      : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="text-3xl font-bold">{course.name}</h1>
          <p className="mt-3 text-slate-300">{course.description}</p>
          <p className="mt-3 text-sm text-slate-300">
            {course._count.enrollments} hoc vien • {totalLessons} bai hoc
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          {course.modules.map((module, index) => (
            <div key={module.id} className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-4 font-semibold text-slate-900">
                Module {index + 1}: {module.name}
              </div>
              <div className="divide-y divide-slate-100">
                {module.lessons.map((lesson) => (
                  <div key={lesson.id} className="p-4 text-sm text-slate-700">
                    {lesson.title}
                  </div>
                ))}
                {module.lessons.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">Chua co bai hoc.</p>
                ) : null}
              </div>
            </div>
          ))}
        </section>

        <aside className="space-y-4">
          {user ? (
            <EnrollCourseCard
              courseId={course.id}
              price={course.price}
              initiallyEnrolled={Boolean(enrollment)}
              canLearnDirectly={canLearnDirectly}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
              Dang nhap de dang ky khoa hoc.
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

