import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CardGrid } from "@/components/base/grid";
import { Hero } from "@/components/base/hero";
import { Section } from "@/components/base/section";
import { CourseCard } from "@/components/base/course-card";
import { CourseFilterPanel } from "./CourseFilterPanel";
import {
  getCourseLanguage,
  getCourseLevel,
  getCourseType,
} from "@/app/components/learningMarketplace";

async function getCourses() {
  try {
    return await prisma.course.findMany({
      where: { status: "ACTIVE" },
      include: {
        instructor: { select: { id: true, username: true } },
        language: { select: { name: true, code: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ language?: string; level?: string; type?: string; tab?: string; skill?: string; q?: string; sort?: string }>;
}) {
  const [params, courses, user] = await Promise.all([searchParams, getCourses(), authenticate()]);
  const enrolledIds = new Set<string>();

  if (user) {
    const enrollments = await prisma.enrollment.findMany({ where: { userId: user.id }, select: { courseId: true } });
    enrollments.forEach((item) => enrolledIds.add(item.courseId));
  }

  const keyword = params.q?.trim().toLocaleLowerCase("vi") ?? "";

  let filteredCourses = courses.filter((course) => {
    const language = getCourseLanguage(course);
    const level = getCourseLevel(course);
    const type = getCourseType(course);
    const searchable = `${course.name} ${course.description ?? ""} ${course.category ?? ""} ${course.instructor?.username ?? ""}`.toLocaleLowerCase("vi");

    if (params.skill && course.category?.toLowerCase() !== params.skill.toLowerCase()) return false;
    if (params.language && params.language !== "all" && language !== params.language) return false;
    if (params.level && params.level !== "all" && level !== params.level) return false;
    if (params.type && params.type !== "all" && type !== params.type) return false;
    if (keyword && !searchable.includes(keyword)) return false;
    return true;
  });

  const activeTab = params.tab || "popular";
  if (activeTab === "popular") filteredCourses = filteredCourses.sort((a, b) => b._count.enrollments - a._count.enrollments);
  if (activeTab === "combo") filteredCourses = filteredCourses.filter((course) => getCourseType(course) === "Combo course");
  if (activeTab === "skill") filteredCourses = filteredCourses.filter((course) => getCourseType(course) === "Skill training");
  if (activeTab === "cert") filteredCourses = filteredCourses.filter((course) => getCourseType(course) === "Certification prep");

  if (params.sort === "price-asc") filteredCourses = filteredCourses.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
  if (params.sort === "price-desc") filteredCourses = filteredCourses.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
  if (params.sort === "name") filteredCourses = filteredCourses.sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <main className="min-h-screen bg-background">
      <Hero
        subtitle="Danh mục khóa học"
        title="Tìm khóa học ngoại ngữ phù hợp"
        description="Khám phá khóa học đơn, chương trình luyện kỹ năng, luyện thi chứng chỉ, gói từ vựng và đề thi thử."
        primaryAction={{ label: "Xem tất cả", href: "/courses" }}
      />

      <Section background="muted" padding="md">
        <CourseFilterPanel params={params} resultCount={filteredCourses.length} />
        <CardGrid cols={3} gap="md" className="mt-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} isEnrolled={enrolledIds.has(course.id)} />
          ))}
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
