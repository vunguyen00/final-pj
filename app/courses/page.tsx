import Link from "next/link";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  LANGUAGES,
  LEVELS,
  PRODUCT_TYPES,
  getCertification,
  getCourseDuration,
  getCourseLanguage,
  getCourseLevel,
  getCourseType,
  priceLabel,
} from "@/app/components/learningMarketplace";

async function getCourses() {
  try {
    return await prisma.course.findMany({
      where: { status: "ACTIVE" },
      include: {
        instructor: { select: { id: true, username: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

const tabs = [
  { key: "popular", label: "Popular" },
  { key: "new", label: "New" },
  { key: "combo", label: "Combo" },
  { key: "skill", label: "Skill-based" },
  { key: "cert", label: "Certification prep" },
];

function buildHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all") query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `/courses?${qs}` : "/courses";
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ language?: string; level?: string; type?: string; certification?: string; price?: string; duration?: string; tab?: string; skill?: string }>;
}) {
  const params = await searchParams;
  const [courses, user] = await Promise.all([getCourses(), authenticate()]);
  const enrolledIds = new Set<string>();

  if (user) {
    const enrollments = await prisma.enrollment.findMany({ where: { userId: user.id }, select: { courseId: true } });
    enrollments.forEach((item) => enrolledIds.add(item.courseId));
  }

  let filteredCourses = courses.filter((course) => {
    const language = getCourseLanguage(course);
    const level = getCourseLevel(course);
    const type = getCourseType(course);
    const certification = getCertification(course);
    const duration = getCourseDuration(course).toLowerCase();
    const price = Number(course.price || 0);

    if (params.skill && course.category?.toLowerCase() !== params.skill.toLowerCase()) return false;
    if (params.language && params.language !== "all" && language !== params.language) return false;
    if (params.level && params.level !== "all" && level !== params.level) return false;
    if (params.type && params.type !== "all" && type !== params.type) return false;
    if (params.certification && params.certification !== "all" && certification !== params.certification) return false;
    if (params.price === "free" && price > 0) return false;
    if (params.price === "paid" && price <= 0) return false;
    if (params.duration === "short" && !duration.includes("hour") && !duration.includes("week")) return false;
    return true;
  });

  const activeTab = params.tab || "popular";
  if (activeTab === "popular") filteredCourses = filteredCourses.sort((a, b) => b._count.enrollments - a._count.enrollments);
  if (activeTab === "combo") filteredCourses = filteredCourses.filter((course) => getCourseType(course) === "Combo course");
  if (activeTab === "skill") filteredCourses = filteredCourses.filter((course) => getCourseType(course) === "Skill training");
  if (activeTab === "cert") filteredCourses = filteredCourses.filter((course) => getCourseType(course) === "Certification prep");

  return (
    <main className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Course marketplace</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Find your next language course</h1>
              <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
                Browse single courses, combo paths, skill training, certification prep, vocabulary packs, and mock tests.
              </p>
            </div>
            <Link href="/combos" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
              View combo bundles
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={buildHref({ ...params, tab: tab.key })}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                  activeTab === tab.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Filter label="Language" name="language" values={["all", ...LANGUAGES]} params={params} />
            <Filter label="Level" name="level" values={["all", ...LEVELS]} params={params} />
            <Filter label="Type" name="type" values={["all", ...PRODUCT_TYPES]} params={params} />
            <Filter label="Certification" name="certification" values={["all", "IELTS", "TOEIC", "TOEFL", "JLPT", "HSK", "TOPIK"]} params={params} />
            <Filter label="Price" name="price" values={["all", "free", "paid"]} params={params} />
            <Filter label="Duration" name="duration" values={["all", "short", "self-paced"]} params={params} />
          </div>
        </section>

        <section className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);
            const language = getCourseLanguage(course);
            const type = getCourseType(course);
            return (
              <article key={course.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <Link href={`/courses/${course.id}`} className="block">
                  <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">{language}</div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-blue-700">{language}</span>
                      <span className="rounded-full bg-slate-950/90 px-2.5 py-1 text-xs font-bold text-white">{getCourseLevel(course)}</span>
                    </div>
                  </div>
                </Link>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{type}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Certificate</span>
                  </div>
                  <Link href={`/courses/${course.id}`}>
                    <h3 className="mt-3 line-clamp-2 font-bold text-slate-950 hover:text-blue-600 dark:text-white">{course.name}</h3>
                  </Link>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{course.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span>Teacher: {course.instructor?.username || "Teacher"}</span>
                    <span>{getCourseDuration(course)}</span>
                    <span>{course.lessons} lessons</span>
                    <span>{course._count.enrollments} learners</span>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                    <span className="text-lg font-bold text-slate-950 dark:text-white">{priceLabel(course.price)}</span>
                    <Link
                      href={isEnrolled ? `/student/hoc-bai?courseId=${course.id}` : `/courses/${course.id}`}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${isEnrolled ? "bg-emerald-50 text-emerald-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      {isEnrolled ? "Continue" : "View course"}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
        {filteredCourses.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            No courses match these filters. Try another language, level, or product type.
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Filter({
  label,
  name,
  values,
  params,
}: {
  label: string;
  name: string;
  values: readonly string[];
  params: Record<string, string | undefined>;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex gap-2 overflow-x-auto md:block">
        {values.map((value) => (
          <Link
            key={value}
            href={buildHref({ ...params, [name]: value })}
            className={`mb-2 inline-block whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${
              (params[name] || "all") === value ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {value === "all" ? "All" : value}
          </Link>
        ))}
      </div>
    </div>
  );
}
