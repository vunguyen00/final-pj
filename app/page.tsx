import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LANGUAGES, getCourseLanguage, getCourseType, priceLabel } from "@/app/components/learningMarketplace";

async function getHomeCourses() {
  try {
    return await prisma.course.findMany({
      where: { status: "ACTIVE" },
      include: { instructor: { select: { username: true } }, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
  } catch {
    return [];
  }
}

const teachers = ["Mina Tran", "Daniel Park", "Sakura Ito", "Liu Wen"];
const testimonials = [
  "The dashboard made it easy to move from vocabulary to speaking practice.",
  "I used the diagnostic test to pick the right Japanese level.",
  "Combo bundles helped me plan a full certification path.",
];

export default async function HomePage() {
  const courses = await getHomeCourses();
  const combos = courses.filter((course) => getCourseType(course) === "Combo course").slice(0, 3);
  const featured = courses.slice(0, 4);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Multi-language marketplace and LMS</p>
            <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-950 dark:text-white">LearnHub</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Courses, combo paths, skill training, vocabulary packs, mock tests, and certification prep for English, Chinese, Japanese, and Korean.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/courses" className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Explore courses</Link>
              <Link href="/student/tests" className="rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100">Take placement test</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="grid gap-3 sm:grid-cols-2">
              {LANGUAGES.map((language, index) => (
                <Link key={language} href={`/courses?language=${language}`} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-3xl font-bold text-slate-950 dark:text-white">{["EN", "中文", "日本", "한글"][index]}</p>
                  <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">{language}</p>
                  <p className="mt-1 text-sm text-slate-500">Courses, skills, tests</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Featured courses</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Popular paths across languages and product types.</p>
          </div>
          <Link href="/courses" className="text-sm font-semibold text-blue-600">View all</Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((course) => <CourseCard key={course.id} course={course} />)}
        </div>
      </section>

      <section className="bg-white py-12 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Combo bundles</h2>
              <p className="mt-1 text-slate-600 dark:text-slate-300">Structured paths for learners who want a full plan.</p>
            </div>
            <Link href="/combos" className="text-sm font-semibold text-blue-600">Open combos</Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {(combos.length ? combos : featured.slice(0, 3)).map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 lg:grid-cols-3">
        {["Adaptive learning", "Marketplace choice", "LMS tracking"].map((title, index) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-blue-600">0{index + 1}</p>
            <h3 className="mt-3 text-xl font-bold text-slate-950 dark:text-white">{title}</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              {index === 0 && "Placement tests and diagnostics connect learners to the right level."}
              {index === 1 && "Single courses, combos, certification prep, vocabulary, and mock tests in one catalog."}
              {index === 2 && "Progress, schedules, course content, and review queues remain connected."}
            </p>
          </div>
        ))}
      </section>

      <section className="bg-white py-12 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Top teachers</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {teachers.map((teacher) => (
                <div key={teacher} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">{teacher.split(" ").map((part) => part[0]).join("")}</span>
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">{teacher}</p>
                      <p className="text-sm text-slate-500">Language coach</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Testimonials</h2>
            <div className="mt-5 space-y-3">
              {testimonials.map((text) => (
                <blockquote key={text} className="rounded-xl border border-slate-200 p-4 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  "{text}"
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-12 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold">Start with the right language path</h2>
            <p className="mt-2 text-slate-300">Browse the marketplace or begin with a placement assessment.</p>
          </div>
          <Link href="/auth/register" className="rounded-lg bg-white px-5 py-3 font-semibold text-slate-950">Create account</Link>
        </div>
      </section>
    </main>
  );
}

function CourseCard({ course }: { course: Awaited<ReturnType<typeof getHomeCourses>>[number] }) {
  return (
    <Link href={`/courses/${course.id}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="aspect-video bg-slate-100 dark:bg-slate-800">
        {course.thumbnail ? <img src={course.thumbnail} alt={course.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400">{getCourseLanguage(course)}</div>}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{getCourseLanguage(course)}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{getCourseType(course)}</span>
        </div>
        <h3 className="mt-3 line-clamp-2 font-bold text-slate-950 dark:text-white">{course.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{course.instructor?.username || "Teacher"} - {course._count.enrollments} learners</p>
        <p className="mt-3 font-bold text-blue-600">{priceLabel(course.price)}</p>
      </div>
    </Link>
  );
}
