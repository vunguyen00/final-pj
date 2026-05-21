import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCertification, getCourseDuration, getCourseLanguage, getCourseLevel, priceLabel } from "@/app/components/learningMarketplace";

async function getCombo(id: string) {
  try {
    return await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { username: true } },
        modules: { include: { lessons: true }, orderBy: { order: "asc" } },
        _count: { select: { enrollments: true } },
      },
    });
  } catch {
    return null;
  }
}

export default async function ComboDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const combo = await getCombo(id);
  if (!combo) notFound();

  const totalLessons = combo.modules.reduce((sum, module) => sum + module.lessons.length, 0);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{getCourseLanguage(combo)}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Combo course</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{getCourseLevel(combo)}</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{getCertification(combo)}</span>
          </div>
          <h1 className="mt-5 text-4xl font-bold text-slate-950 dark:text-white">{combo.name}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">{combo.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/courses/${combo.id}`} className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Enroll through course page</Link>
            <Link href="/combos" className="rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-100">All combos</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Bundle roadmap</h2>
          {combo.modules.map((module, index) => (
            <div key={module.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold text-blue-600">Phase {index + 1}</p>
              <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{module.name}</h3>
              <p className="mt-2 text-sm text-slate-500">{module.lessons.length} lessons in this phase</p>
            </div>
          ))}
        </section>
        <aside className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Bundle summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Teacher</dt><dd className="font-semibold text-slate-900 dark:text-white">{combo.instructor?.username || "Teacher"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Duration</dt><dd className="font-semibold text-slate-900 dark:text-white">{getCourseDuration(combo)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Lessons</dt><dd className="font-semibold text-slate-900 dark:text-white">{totalLessons || combo.lessons}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Learners</dt><dd className="font-semibold text-slate-900 dark:text-white">{combo._count.enrollments}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Price</dt><dd className="font-semibold text-blue-600">{priceLabel(combo.price)}</dd></div>
          </dl>
        </aside>
      </div>
    </main>
  );
}
