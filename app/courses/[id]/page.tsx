import Link from "next/link";
import { notFound } from "next/navigation";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EnrollCourseCard from "./components/EnrollCourseCard";
import CourseReviewForm from "./components/CourseReviewForm";
import { Badge, BadgeGroup } from "@/components/base/badge";
import { Section } from "@/components/base/section";
import { canReviewCourse, getCourseReviews, getUserCourseReview } from "@/lib/course-reviews";
import { getCertification, getCourseDuration, getCourseLanguage, getCourseLevel, getCourseType } from "@/app/components/learningMarketplace";

async function getCourse(id: string) {
  try {
    return await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, username: true } },
        modules: { include: { lessons: true }, orderBy: { order: "asc" } },
        tests: { select: { id: true, name: true, maxScore: true, timeLimit: true, _count: { select: { questions: true } } } },
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

  if (!course) notFound();
  const canPreviewUnpublished = Boolean(user && (user.role === "ADMIN" || course.instructorId === user.id));
  if (course.status !== "ACTIVE" && !canPreviewUnpublished) notFound();

  const totalLessons = course.modules.reduce((acc, module) => acc + module.lessons.length, 0);
  const canLearnDirectly = Boolean(user && user.role === "TEACHER" && course.instructorId === user.id);
  const enrollment = user
    ? await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } })
    : null;
  const language = getCourseLanguage(course);
  const type = getCourseType(course);
  const [reviews, canReview, existingReview] = await Promise.all([
    getCourseReviews(course.id),
    user?.role === "STUDENT" ? canReviewCourse(user.id, course.id) : Promise.resolve(false),
    user?.role === "STUDENT" ? getUserCourseReview(user.id, course.id) : Promise.resolve(null),
  ]);
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const totalRatingPoints = reviews.reduce((sum, review) => sum + review.rating, 0);

  return (
    <main className="min-h-screen bg-background">
      <Section padding="md">
        <div className="grid gap-8 rounded-2xl border border-border bg-card p-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div>
            <BadgeGroup>
              <Badge>{language}</Badge>
              <Badge className="bg-secondary text-secondary-foreground">{getCourseLevel(course)}</Badge>
              <Badge className="bg-secondary text-secondary-foreground">{type}</Badge>
              <Badge className="bg-secondary text-secondary-foreground">{getCertification(course)}</Badge>
              {reviews.length ? <Badge className="bg-accent/20 text-accent">{averageRating.toFixed(1)} sao ({reviews.length})</Badge> : null}
            </BadgeGroup>
            <h1 className="mt-5 text-pretty font-serif text-4xl font-semibold text-foreground">{course.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{course.description}</p>
            <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-4">
              <Stat label="Teacher" value={course.instructor?.username || "Teacher"} />
              <Stat label="Duration" value={getCourseDuration(course)} />
              <Stat label="Lessons" value={`${totalLessons || course.lessons}`} />
              <Stat label="Learners" value={`${course._count.enrollments}`} />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-muted">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.name} className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video items-center justify-center text-2xl font-semibold text-muted-foreground">{language}</div>
            )}
          </div>
        </div>
      </Section>

      <Section background="muted" padding="md">
        <div className="grid gap-8 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-2xl font-semibold text-foreground">Learning path</h2>
              <p className="mt-2 text-sm text-muted-foreground">Modules, lessons, practice checkpoints, and certification readiness.</p>
              <div className="mt-5 space-y-3">
                {course.modules.map((module, index) => (
                  <div key={module.id} className="rounded-xl border border-border">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <h3 className="font-semibold text-foreground">Module {index + 1}: {module.name}</h3>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{module.lessons.length} lessons</span>
                    </div>
                    <div className="divide-y divide-border">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{lessonIndex + 1}</span>
                          <span>{lesson.title}</span>
                        </div>
                      ))}
                      {module.lessons.length === 0 ? <p className="px-4 py-3 text-sm text-muted-foreground">No lessons yet.</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-2xl font-semibold text-foreground">Tests and certification checkpoints</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {course.tests.map((test) => (
                  <div key={test.id} className="rounded-xl border border-border p-4">
                    <p className="font-semibold text-foreground">{test.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{test._count.questions} questions - Max {test.maxScore} points</p>
                    <p className="mt-1 text-sm text-muted-foreground">{test.timeLimit ? `${test.timeLimit} minutes` : "Self-paced"}</p>
                  </div>
                ))}
                {course.tests.length === 0 ? <p className="text-sm text-muted-foreground">No tests attached to this course yet.</p> : null}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Danh gia khoa hoc</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {reviews.length
                      ? `Tong diem ${totalRatingPoints.toFixed(1)} tu ${reviews.length} danh gia. Trung binh ${averageRating.toFixed(1)} / 5.`
                      : "Chua co danh gia nao cho khoa hoc nay."}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {user?.role === "STUDENT" ? (
                  <CourseReviewForm courseId={course.id} canReview={canReview} existingReview={existingReview} />
                ) : user ? (
                  <div className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                    Chi hoc vien da hoan thanh khoa hoc va pass bai test moi co the danh gia.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                    Dang nhap bang tai khoan hoc vien de danh gia sau khi hoan thanh khoa hoc.
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-xl border border-border bg-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{review.username}</p>
                      <p className="text-sm font-semibold text-primary">{review.rating.toFixed(1)} / 5 sao</p>
                    </div>
                    {review.comment ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Nguoi hoc khong de lai binh luan.</p>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            {user ? (
              <EnrollCourseCard courseId={course.id} price={course.price} initiallyEnrolled={Boolean(enrollment)} canLearnDirectly={canLearnDirectly} />
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Sign in to enroll and track progress.
                <Link href="/auth/login" className="mt-4 block rounded-lg bg-primary px-4 py-2 text-center font-semibold text-primary-foreground">Sign in</Link>
              </div>
            )}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground">Includes</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Language-level badge and certificate-ready path</li>
                <li>Practice tasks and completion tracking</li>
                <li>Teacher-led curriculum</li>
                <li>Mock tests when available</li>
              </ul>
            </div>
          </aside>
        </div>
      </Section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}
