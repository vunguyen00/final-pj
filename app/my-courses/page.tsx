import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Section, SectionHeader } from "@/components/base/section";

export default async function MyCoursesPage() {
  const user = await requireRole("STUDENT");

  const [enrollments, feedbacks] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedback.findMany({
      where: {
        userId: user.id,
        content: { startsWith: "PROGRESS:" },
      },
      select: { courseId: true, content: true },
    }),
  ]);

  const progressMap = new Map<string, Set<string>>();
  for (const item of feedbacks) {
    if (!progressMap.has(item.courseId)) {
      progressMap.set(item.courseId, new Set<string>());
    }
    progressMap.get(item.courseId)?.add(item.content.replace("PROGRESS:", ""));
  }

  const stats = enrollments.map((enrollment) => {
    const course = enrollment.course;
    const lessons = course.modules.flatMap((module) => module.lessons);
    const completed = progressMap.get(course.id)?.size ?? 0;
    const progress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
    return { enrollment, lessonsCount: lessons.length, completed, progress };
  });

  const completedCourses = stats.filter((item) => item.lessonsCount > 0 && item.completed >= item.lessonsCount);
  const learningCourses = stats.filter((item) => item.lessonsCount === 0 || item.completed < item.lessonsCount);

  return (
    <main className="min-h-screen bg-background">
      <Section padding="md">
        <SectionHeader title="Khoa hoc cua toi" subtitle="Tong hop tat ca khoa hoc dang hoc va da hoan thanh." />

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold text-foreground">Dang hoc / Da dang ky</h2>
          {learningCourses.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Khong con khoa hoc nao dang hoc.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {learningCourses.map((item) => (
                <article key={item.enrollment.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-foreground">{item.enrollment.course.name}</h3>
                    <Link href={`/student/hoc-bai?courseId=${item.enrollment.course.id}`} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
                      Vao hoc
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Tien do: {item.completed}/{item.lessonsCount} bai ({item.progress}%)</p>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold text-foreground">Da hoan thanh</h2>
          {completedCourses.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Ban chua hoan thanh khoa hoc nao.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {completedCourses.map((item) => (
                <article key={item.enrollment.id} className="rounded-lg border border-border bg-accent/10 p-4">
                  <h3 className="font-semibold text-foreground">{item.enrollment.course.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Da hoan thanh {item.lessonsCount}/{item.lessonsCount} bai (100%).</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </Section>
    </main>
  );
}
