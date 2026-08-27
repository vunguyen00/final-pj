import Link from "next/link";
import { notFound } from "next/navigation";
import { authenticate } from "@/lib/auth";
import { normalizeCourseThumbnailUrl } from "@/lib/course-thumbnail";
import { prisma } from "@/lib/prisma";
import EnrollCourseCard from "./components/EnrollCourseCard";
import CourseReviewForm from "./components/CourseReviewForm";
import CourseReportButton from "./components/CourseReportButton";
import { Badge, BadgeGroup } from "@/components/base/badge";
import { Section } from "@/components/base/section";
import {
  canReviewCourse,
  getCourseReviews,
  getUserCourseReview,
  isCourseReviewRole,
} from "@/lib/course-reviews";
import {
  getCertification,
  getCourseDuration,
  getCourseLanguage,
  getCourseLevel,
  getLanguageLabel,
} from "@/app/components/learningMarketplace";
import { getLearningUiLabels } from "@/lib/test-language-labels";
import { getCourseCategoryLabel, getCourseLevelLabel } from "@/lib/language-display";

async function getCourse(id: string) {
  try {
    return await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, username: true } },
        language: { select: { name: true, code: true } },
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
  const directAccessRole = user?.role === "ADMIN"
    ? "ADMIN"
    : user?.role === "TEACHER" && course.instructorId === user.id
      ? "TEACHER"
      : null;
  const enrollment = user
    ? await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } })
    : null;
  const language = getCourseLanguage(course);
  const courseLanguage = course.language?.code || course.language?.name || language;
  const ui = getLearningUiLabels(courseLanguage);
  const level = getCourseLevel(course);
  const levelLabel = getCourseLevelLabel(level, courseLanguage);
  const category = getCourseCategoryLabel(course.category, courseLanguage) || ui.course.uncategorized;
  const thumbnailUrl = normalizeCourseThumbnailUrl(course.thumbnail);
  const canReviewAsLearner = Boolean(user && isCourseReviewRole(user.role));
  const [reviews, canReview, existingReview] = await Promise.all([
    getCourseReviews(course.id),
    canReviewAsLearner && user ? canReviewCourse(user.id, course.id) : Promise.resolve(false),
    canReviewAsLearner && user ? getUserCourseReview(user.id, course.id) : Promise.resolve(null),
  ]);
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const totalRatingPoints = reviews.reduce((sum, review) => sum + review.rating, 0);

  return (
    <main className="min-h-dvh bg-background">
      <Section padding="md">
        <div className="grid gap-8 rounded-2xl border border-border bg-card p-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div>
            <BadgeGroup>
              <Badge>{getLanguageLabel(language)}</Badge>
              <Badge className="bg-secondary text-secondary-foreground">{levelLabel}</Badge>
              <Badge className="bg-secondary text-secondary-foreground">{category}</Badge>
              <Badge className="bg-secondary text-secondary-foreground">{getCertification(course)}</Badge>
              {reviews.length ? <Badge className="bg-accent/20 text-accent">{averageRating.toFixed(1)} {ui.course.stars} ({reviews.length})</Badge> : null}
            </BadgeGroup>
            <h1 className="mt-5 text-pretty font-serif text-4xl font-semibold text-foreground">{course.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{course.description}</p>
            <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-4">
              <Stat label={ui.course.instructor} value={course.instructor?.username || ui.course.teacherFallback} />
              <Stat label={ui.course.duration} value={getCourseDuration(course)} />
              <Stat label={ui.course.lessons} value={`${totalLessons || course.lessons}`} />
              <Stat label={ui.course.students} value={`${course._count.enrollments}`} />
            </div>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-muted">
            {thumbnailUrl ? (
              <Image src={thumbnailUrl} alt={course.name} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" unoptimized />
            ) : (
              <div className="flex aspect-video items-center justify-center text-2xl font-semibold text-muted-foreground">{getLanguageLabel(language)}</div>
            )}
          </div>
        </div>
      </Section>

      <Section background="muted" padding="md">
        <div className="grid gap-8 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-2xl font-semibold text-foreground">{ui.course.learningPath}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{ui.course.learningPathDescription}</p>
              <div className="mt-5 space-y-3">
                {course.modules.map((module, index) => (
                  <div key={module.id} className="rounded-xl border border-border">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <h3 className="font-semibold text-foreground">{ui.course.chapter(index + 1)}: {module.name}</h3>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{ui.course.lessonCount(module.lessons.length)}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{lessonIndex + 1}</span>
                          <span>{lesson.title}</span>
                        </div>
                      ))}
                      {module.lessons.length === 0 ? <p className="px-4 py-3 text-sm text-muted-foreground">{ui.course.noLessons}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-2xl font-semibold text-foreground">{ui.course.testsTitle}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {course.tests.map((test) => (
                  <div key={test.id} className="rounded-xl border border-border p-4">
                    <p className="font-semibold text-foreground">{test.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{ui.course.questionCount(test._count.questions)} - {ui.course.maxScore(test.maxScore)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{test.timeLimit ? ui.course.minuteCount(test.timeLimit) : ui.course.noTimeLimit}</p>
                  </div>
                ))}
                {course.tests.length === 0 ? <p className="text-sm text-muted-foreground">{ui.course.noTests}</p> : null}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">{ui.course.reviewsTitle}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {reviews.length
                      ? ui.course.ratingSummary(totalRatingPoints.toFixed(1), reviews.length, averageRating.toFixed(1))
                      : ui.course.noReviews}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {user && isCourseReviewRole(user.role) ? (
                  <CourseReviewForm courseId={course.id} languageCode={course.language?.code} canReview={canReview} existingReview={existingReview} />
                ) : user ? (
                  <div className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                    {ui.course.completedOnlyReview}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                    {ui.course.loginToReview}
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-xl border border-border bg-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{review.username}</p>
                      <p className="text-sm font-semibold text-primary">{review.rating.toFixed(1)} / 5 {ui.course.stars}</p>
                    </div>
                    {review.comment ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{ui.course.noComment}</p>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            {user ? (
              <EnrollCourseCard
                courseId={course.id}
                price={course.price}
                initiallyEnrolled={Boolean(enrollment)}
                accessSuspended={!directAccessRole && enrollment?.accessStatus === "REFUND_PENDING"}
                directAccessRole={directAccessRole}
                languageCode={courseLanguage}
              />
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                {ui.course.loginPrompt}
                <Link href="/auth/login" className="mt-4 block rounded-lg bg-primary px-4 py-2 text-center font-semibold text-primary-foreground">{ui.course.login}</Link>
              </div>
            )}
            {user?.role === "STUDENT" && enrollment ? (
              <CourseReportButton
                courseId={course.id}
                languageCode={courseLanguage}
                lessons={course.modules.flatMap((module) => module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })))}
              />
            ) : null}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground">{ui.course.includes}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {ui.course.includesItems.map((item) => <li key={item}>{item}</li>)}
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
import Image from "next/image";
