import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FeatureList, Stats } from "@/components/base/content";
import { CardGrid, GridCard } from "@/components/base/grid";
import { Hero } from "@/components/base/hero";
import { Section, SectionHeader } from "@/components/base/section";
import { CourseCard } from "@/components/base/course-card";
import { formatCount, getPublicTeachers } from "@/lib/public-teachers";

async function getHomeCourses() {
  try {
    return await prisma.course.findMany({
      where: {
        status: "ACTIVE",
        instructor: { is: { isBanned: false, accountStatus: "ACTIVE" } },
      },
      include: {
        instructor: { select: { username: true } },
        language: { select: { name: true, code: true } },
        modules: { select: { _count: { select: { lessons: true } } } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
  } catch {
    return [];
  }
}

async function getHomeStats() {
  try {
    const [courses, languages] = await Promise.all([
      prisma.course.count({ where: { status: "ACTIVE" } }),
      prisma.learningLanguage.count({ where: { isActive: true } }),
    ]);

    return { courses, languages };
  } catch {
    return { courses: 0, languages: 0 };
  }
}

export default async function HomePage() {
  const [rawCourses, stats, teachers] = await Promise.all([getHomeCourses(), getHomeStats(), getPublicTeachers()]);
  const courses = rawCourses.map(({ modules, ...course }) => ({
    ...course,
    lessons: modules.reduce((total, module) => total + module._count.lessons, 0),
  }));
  const featured = courses.slice(0, 4);
  const featuredTeachers = teachers.slice(0, 4);

  return (
    <main className="min-h-dvh bg-background">
      <Hero
        subtitle="Nền tảng học ngoại ngữ đa ngôn ngữ"
        title="Đồng hành chinh phục ngoại ngữ cùng FinnCenter"
        description="Khóa học, lộ trình combo, luyện kỹ năng, gói từ vựng, đề thi thử và chương trình luyện thi chứng chỉ cho tiếng Anh, Trung, Nhật và Hàn."
        primaryAction={{ label: "Khám phá khóa học", href: "/courses" }}
        secondaryAction={{ label: "Luyện tập", href: "/student/tests" }}
      />

      <Section padding="md">
        <SectionHeader
          title="Khóa học nổi bật"
          subtitle="Những lộ trình được nhiều học viên lựa chọn."
        />
        <CardGrid cols={4} gap="md">
          {featured.map((course) => <CourseCard key={course.id} course={course} compact />)}
        </CardGrid>
      </Section>

      <Section background="muted" padding="md">
        <SectionHeader title="Vì sao học viên chọn FinnCenter?" centered />
        <FeatureList
          items={[
            {
              title: "Học tập thích ứng",
              description: "Bài test thực hành giúp học viên tự đánh giá kiến thức và theo dõi kết quả theo từng lần làm.",
            },
            {
              title: "Nhiều lựa chọn học tập",
              description: "Khóa học đơn, combo, luyện thi chứng chỉ, từ vựng và đề thi thử trong cùng một danh mục.",
            },
            {
              title: "Theo dõi tiến độ",
              description: "Tiến độ, lịch học, nội dung khóa học và lịch ôn tập được quản lý đồng bộ.",
            },
          ]}
        />
      </Section>

      <Section padding="md">
        <Stats
          className="lg:!grid-cols-2"
          stats={[
            { label: "Khóa học đang mở", value: formatCount(stats.courses), hint: "Khóa học đang hoạt động" },
            { label: "Ngôn ngữ", value: formatCount(stats.languages), hint: "Ngôn ngữ đang được mở" },
          ]}
        />
      </Section>

      <Section background="muted" padding="md">
        <SectionHeader title="Giảng viên nổi bật" subtitle="Đội ngũ giàu kinh nghiệm, giảng dạy thực tế và bám sát mục tiêu." />
        {featuredTeachers.length > 0 ? (
          <CardGrid cols={4} gap="md">
            {featuredTeachers.map((teacher) => (
              <GridCard
                key={teacher.id}
                title={teacher.name}
                description={teacher.summary}
                icon={<span className="text-sm font-semibold text-primary">{teacher.avatar}</span>}
                badge={teacher.badges[0] ?? "Giảng viên"}
                footer={<Link href="/teachers" className="text-sm font-semibold text-primary">Xem hồ sơ</Link>}
              />
            ))}
          </CardGrid>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Chưa có giảng viên trong hệ thống.
          </div>
        )}
      </Section>
    </main>
  );
}
