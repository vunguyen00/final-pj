import Link from "next/link";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, BadgeGroup } from "@/components/base/badge";
import { CardGrid } from "@/components/base/grid";
import { Hero } from "@/components/base/hero";
import { Section } from "@/components/base/section";
import {
  LANGUAGES,
  LEVELS,
  PRODUCT_TYPES,
  getCourseDuration,
  getCourseLanguage,
  getCourseLevel,
  getCourseType,
  getLanguageLabel,
  getLevelLabel,
  getProductTypeLabel,
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
  { key: "popular", label: "Phổ biến" },
  { key: "new", label: "Mới nhất" },
  { key: "combo", label: "Combo" },
  { key: "skill", label: "Theo kỹ năng" },
  { key: "cert", label: "Luyện thi chứng chỉ" },
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
  searchParams: Promise<{ language?: string; level?: string; type?: string; tab?: string; skill?: string }>;
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

    if (params.skill && course.category?.toLowerCase() !== params.skill.toLowerCase()) return false;
    if (params.language && params.language !== "all" && language !== params.language) return false;
    if (params.level && params.level !== "all" && level !== params.level) return false;
    if (params.type && params.type !== "all" && type !== params.type) return false;
    return true;
  });

  const activeTab = params.tab || "popular";
  if (activeTab === "popular") filteredCourses = filteredCourses.sort((a, b) => b._count.enrollments - a._count.enrollments);
  if (activeTab === "combo") filteredCourses = filteredCourses.filter((course) => getCourseType(course) === "Combo course");
  if (activeTab === "skill") filteredCourses = filteredCourses.filter((course) => getCourseType(course) === "Skill training");
  if (activeTab === "cert") filteredCourses = filteredCourses.filter((course) => getCourseType(course) === "Certification prep");

  return (
    <main className="min-h-screen bg-background">
      <Hero
        subtitle="Danh mục khóa học"
        title="Tìm khóa học ngoại ngữ phù hợp"
        description="Khám phá khóa học đơn, chương trình luyện kỹ năng, luyện thi chứng chỉ, gói từ vựng và đề thi thử."
        primaryAction={{ label: "Xem tất cả", href: "/courses" }}
      />

      <Section padding="md">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={buildHref({ ...params, tab: tab.key })}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:opacity-90"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Filter label="Ngôn ngữ" name="language" values={["all", ...LANGUAGES]} params={params} />
            <Filter label="Trình độ" name="level" values={["all", ...LEVELS]} params={params} />
            <Filter label="Loại khóa học" name="type" values={["all", ...PRODUCT_TYPES]} params={params} />
          </div>
        </div>
      </Section>

      <Section background="muted" padding="md">
        <CardGrid cols={3} gap="md">
          {filteredCourses.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);
            const language = getCourseLanguage(course);
            const type = getCourseType(course);
            return (
              <article key={course.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Link href={`/courses/${course.id}`} className="block">
                  <div className="relative aspect-video bg-muted">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">{getLanguageLabel(language)}</div>
                    )}
                  </div>
                </Link>
                <div className="p-5">
                  <BadgeGroup>
                    <Badge>{getLanguageLabel(language)}</Badge>
                    <Badge className="bg-muted text-muted-foreground">{getLevelLabel(getCourseLevel(course))}</Badge>
                    <Badge className="bg-secondary text-secondary-foreground">{getProductTypeLabel(type)}</Badge>
                  </BadgeGroup>
                  <Link href={`/courses/${course.id}`}>
                    <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-foreground hover:text-primary">{course.name}</h3>
                  </Link>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span>Giảng viên: {course.instructor?.username || "Chưa cập nhật"}</span>
                    <span>{getCourseDuration(course)}</span>
                    <span>{course.lessons} bài học</span>
                    <span>{course._count.enrollments} học viên</span>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-lg font-semibold text-foreground">{priceLabel(course.price)}</span>
                    <Link
                      href={isEnrolled ? `/student/hoc-bai?courseId=${course.id}` : `/courses/${course.id}`}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                        isEnrolled ? "bg-accent/15 text-accent" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isEnrolled ? "Tiếp tục học" : "Xem khóa học"}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </CardGrid>
        {filteredCourses.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Không có khóa học phù hợp với bộ lọc. Hãy thử ngôn ngữ, trình độ hoặc loại khóa học khác.
          </div>
        ) : null}
      </Section>
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
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex gap-2 overflow-x-auto md:block">
        {values.map((value) => (
          <Link
            key={value}
            href={buildHref({ ...params, [name]: value })}
            className={`mb-2 inline-block whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${
              (params[name] || "all") === value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {value === "all"
              ? "Tất cả"
              : name === "language"
                ? getLanguageLabel(value)
                : name === "level"
                  ? getLevelLabel(value)
                  : getProductTypeLabel(value)}
          </Link>
        ))}
      </div>
    </div>
  );
}
