import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCourseDuration, getCourseLanguage, getCourseLevel, getCourseType, priceLabel } from "@/app/components/learningMarketplace";

async function getComboCandidates() {
  try {
    return await prisma.course.findMany({
      where: { status: "ACTIVE" },
      include: { instructor: { select: { username: true } }, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function CombosPage() {
  const courses = await getComboCandidates();
  const combos = courses.filter((course) => getCourseType(course) === "Combo course");
  const displayed = combos.length ? combos : courses.slice(0, 6);

  return (
    <main className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Combo courses</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Bundle paths for language goals</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Combo pages reuse existing course data and enrollment flow while presenting courses as structured multi-skill pathways.
          </p>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayed.map((course) => (
            <Link key={course.id} href={`/combos/${course.id}`} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{getCourseLanguage(course)}</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Combo course</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{getCourseLevel(course)}</span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">{course.name}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{course.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-500">
                <span>{course.instructor?.username || "Teacher"}</span>
                <span>{getCourseDuration(course)}</span>
                <span>{course.lessons} lessons</span>
                <span>{course._count.enrollments} learners</span>
              </div>
              <p className="mt-5 text-lg font-bold text-blue-600">{priceLabel(course.price)}</p>
            </Link>
          ))}
        </section>

        {displayed.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            No combo bundles are available yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}
