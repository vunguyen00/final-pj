import Link from "next/link";
import { notFound } from "next/navigation";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EnrollCourseCard from "./components/EnrollCourseCard";
import CourseReviewForm from "./components/CourseReviewForm";
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
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const totalRatingPoints = reviews.reduce((sum, review) => sum + review.rating, 0);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{language}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{getCourseLevel(course)}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{type}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{getCertification(course)}</span>
              {reviews.length ? (
                <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700">
                  {averageRating.toFixed(1)} sao ({reviews.length} danh gia)
                </span>
              ) : null}
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">{course.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{course.description}</p>
            <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
              <Stat label="Teacher" value={course.instructor?.username || "Teacher"} />
              <Stat label="Duration" value={getCourseDuration(course)} />
              <Stat label="Lessons" value={`${totalLessons || course.lessons}`} />
              <Stat label="Learners" value={`${course._count.enrollments}`} />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.name} className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video items-center justify-center text-2xl font-bold text-slate-400">{language}</div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold text-slate-950">Learning path</h2>
            <p className="mt-2 text-sm text-slate-500">Modules, lessons, practice checkpoints, and certification readiness.</p>
            <div className="mt-5 space-y-3">
              {course.modules.map((module, index) => (
                <div key={module.id} className="rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h3 className="font-semibold text-slate-950">Module {index + 1}: {module.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{module.lessons.length} lessons</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{lessonIndex + 1}</span>
                        <span>{lesson.title}</span>
                      </div>
                    ))}
                    {module.lessons.length === 0 ? <p className="px-4 py-3 text-sm text-slate-500">No lessons yet.</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold text-slate-950">Tests and certification checkpoints</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {course.tests.map((test) => (
                <div key={test.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">{test.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{test._count.questions} questions - Max {test.maxScore} points</p>
                  <p className="mt-1 text-sm text-slate-500">{test.timeLimit ? `${test.timeLimit} minutes` : "Self-paced"}</p>
                </div>
              ))}
              {course.tests.length === 0 ? <p className="text-sm text-slate-500">No tests attached to this course yet.</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Danh gia khoa hoc</h2>
                <p className="mt-1 text-sm text-slate-500">
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Chi hoc vien da hoan thanh khoa hoc va pass bai test moi co the danh gia.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Dang nhap bang tai khoan hoc vien de danh gia sau khi hoan thanh khoa hoc.
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-950">{review.username}</p>
                    <p className="text-sm font-bold text-amber-600">{review.rating.toFixed(1)} / 5 sao</p>
                  </div>
                  {review.comment ? (
                    <p className="mt-2 text-sm leading-6 text-slate-700">{review.comment}</p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-slate-500">Nguoi hoc khong de lai binh luan.</p>
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
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
              Sign in to enroll and track progress.
              <Link href="/auth/login" className="mt-4 block rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white">Sign in</Link>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-950">Includes</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Language-level badge and certificate-ready path</li>
              <li>Practice tasks and completion tracking</li>
              <li>Teacher-led curriculum</li>
              <li>Mock tests when available</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}
