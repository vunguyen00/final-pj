import Link from "next/link";
import { LogoutButton } from "@/app/components/LogoutButton";
import { getCourseDuration, getCourseLanguage, getCourseLevel, getCourseType, priceLabel } from "@/app/components/learningMarketplace";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StudentPage() {
  const user = await requireRole("STUDENT", "TEACHER");

  const [enrollments, recommended, feedbacks, tests] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            instructor: { select: { username: true } },
            language: { select: { name: true, code: true } },
            modules: { include: { lessons: true }, orderBy: { order: "asc" } },
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({
      where: { status: "ACTIVE" },
      include: {
        instructor: { select: { username: true } },
        language: { select: { name: true, code: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.feedback.findMany({
      where: { userId: user.id, content: { startsWith: "PROGRESS:" } },
      select: { courseId: true, content: true },
    }),
    prisma.testAttempt.findMany({
      where: { userId: user.id },
      include: { test: { select: { name: true, courseId: true } } },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
  ]);

  const completedByCourse = new Map<string, Set<string>>();
  for (const item of feedbacks) {
    const lessonId = item.content.replace("PROGRESS:", "");
    const set = completedByCourse.get(item.courseId) ?? new Set<string>();
    set.add(lessonId);
    completedByCourse.set(item.courseId, set);
  }

  const enrolledCourseIds = new Set(enrollments.map((item) => item.courseId));
  const courseStats = enrollments.map(({ course }) => {
    const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
    const completed = completedByCourse.get(course.id)?.size ?? 0;
    const progress = totalLessons > 0 ? Math.min(100, Math.round((completed / totalLessons) * 100)) : 0;
    return { course, totalLessons, completed, progress };
  });
  const activeCourses = courseStats.filter((item) => item.progress < 100);
  const completedCourses = courseStats.filter((item) => item.progress === 100);
  const recommendedCourses = recommended.filter((course) => !enrolledCourseIds.has(course.id)).slice(0, 3);
  const averageProgress = courseStats.length
    ? Math.round(courseStats.reduce((sum, item) => sum + item.progress, 0) / courseStats.length)
    : 0;

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-7xl space-y-8 px-4">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">{user.role === "TEACHER" ? "Teacher dashboard" : "Student dashboard"}</p>
              <h1 className="mt-2 text-3xl font-bold text-foreground">Welcome back, {user.username}</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Continue your language path, review upcoming tests, and discover the next course for your level. Teachers can also use practice tests here.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/student/tests" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Open tests
              </Link>
              {user.role === "TEACHER" ? (
                <Link href="/student/tests?practice=1" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
                  Practice tests
                </Link>
              ) : null}
              <Link href="/courses" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
                Browse courses
              </Link>
              <LogoutButton />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Overall progress", `${averageProgress}%`, "Across enrolled courses"],
            ["Active courses", String(activeCourses.length), "In progress"],
            ["Completed courses", String(completedCourses.length), "Finished paths"],
            ["Recent tests", String(tests.length), "Latest attempts"],
          ].map(([label, value, caption]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Continue learning</h2>
              <Link href="/my-courses" className="text-sm font-semibold text-primary">View all</Link>
            </div>
            <div className="mt-4 space-y-3">
              {activeCourses.slice(0, 4).map(({ course, progress, completed, totalLessons }) => (
                <Link key={course.id} href={`/student/hoc-bai?courseId=${course.id}`} className="block rounded-xl border border-border p-4 transition hover:border-primary/50 hover:bg-primary/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">{getCourseLanguage(course)}</span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{getCourseType(course)}</span>
                      </div>
                      <h3 className="mt-2 font-semibold text-foreground">{course.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{completed}/{totalLessons} lessons completed</p>
                    </div>
                    <span className="text-2xl font-bold text-foreground">{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </Link>
              ))}
              {activeCourses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No active course yet. Enroll in a course to start a learning path.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold text-foreground">Upcoming schedule</h2>
            <div className="mt-4 space-y-3">
              {tests.length > 0 ? tests.map((attempt) => (
                <div key={attempt.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium text-foreground">{attempt.test.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Latest score: {attempt.score.toFixed(1)} - {attempt.isPassed ? "Passed" : "Review needed"}</p>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                  No test activity yet. Placement and course tests will appear here.
                </div>
              )}
              <Link href="/student/tests" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Open tests</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold text-foreground">My enrolled courses</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {courseStats.map(({ course, progress }) => (
                <Link key={course.id} href={`/student/hoc-bai?courseId=${course.id}`} className="rounded-xl border border-border p-4 hover:border-primary/50">
                  <p className="text-xs font-semibold text-primary">{getCourseLanguage(course)} - {getCourseLevel(course)}</p>
                  <h3 className="mt-2 line-clamp-2 font-semibold text-foreground">{course.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{course.instructor?.username ?? "Teacher"} - {progress}% complete</p>
                </Link>
              ))}
              {courseStats.length === 0 ? <p className="text-sm text-muted-foreground">Your enrolled courses will appear here.</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold text-foreground">Recommended courses</h2>
            <div className="mt-4 space-y-3">
              {recommendedCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 hover:border-primary/50">
                  <div>
                    <p className="text-xs font-semibold text-primary">{getCourseLanguage(course)} - {getCourseType(course)}</p>
                    <h3 className="mt-1 font-semibold text-foreground">{course.name}</h3>
                    <p className="text-sm text-muted-foreground">{getCourseDuration(course)} - {course._count.enrollments} learners</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{priceLabel(course.price)}</span>
                </Link>
              ))}
              {recommendedCourses.length === 0 ? <p className="text-sm text-muted-foreground">No new recommendations yet.</p> : null}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold text-foreground">Weekly analytics</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-7">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
              <div key={day} className="rounded-lg bg-muted p-3">
                <div className="flex h-24 items-end">
                  <div className="w-full rounded bg-primary" style={{ height: `${20 + ((courseStats.length + index) % 5) * 14}%` }} />
                </div>
                <p className="mt-2 text-center text-xs font-medium text-muted-foreground">{day}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}


