import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, BadgeGroup } from "@/components/base/badge";
import { FeatureList, Stats } from "@/components/base/content";
import { CardGrid, GridCard } from "@/components/base/grid";
import { Hero } from "@/components/base/hero";
import { Section, SectionHeader } from "@/components/base/section";
import {
  LANGUAGES,
  getCourseLanguage,
  getCourseType,
  getLanguageLabel,
  getProductTypeLabel,
  priceLabel,
} from "@/app/components/learningMarketplace";

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

export default async function HomePage() {
  const courses = await getHomeCourses();
  const featured = courses.slice(0, 4);

  return (
    <main className="min-h-screen bg-background">
      <Hero
        subtitle="Nền tảng học ngoại ngữ đa ngôn ngữ"
        title="Xây dựng lộ trình ngoại ngữ cùng FinnCenter"
        description="Khóa học, lộ trình combo, luyện kỹ năng, gói từ vựng, đề thi thử và chương trình luyện thi chứng chỉ cho tiếng Anh, Trung, Nhật và Hàn."
        primaryAction={{ label: "Khám phá khóa học", href: "/courses" }}
        secondaryAction={{ label: "Làm bài kiểm tra đầu vào", href: "/student/tests" }}
      />

      <Section padding="lg">
        <SectionHeader
          title="Khóa học nổi bật"
          subtitle="Những lộ trình được nhiều học viên lựa chọn."
        />
        <CardGrid cols={4} gap="md">
          {featured.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="aspect-video bg-muted">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">{getLanguageLabel(getCourseLanguage(course))}</div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <BadgeGroup>
                  <Badge>{getLanguageLabel(getCourseLanguage(course))}</Badge>
                  <Badge className="bg-muted text-muted-foreground">{getProductTypeLabel(getCourseType(course))}</Badge>
                </BadgeGroup>
                <h3 className="line-clamp-2 text-lg font-semibold text-foreground">{course.name}</h3>
                <p className="text-sm text-muted-foreground">{course.instructor?.username || "Giảng viên"} - {course._count.enrollments} học viên</p>
                <p className="text-base font-semibold text-primary">{priceLabel(course.price)}</p>
              </div>
            </Link>
          ))}
        </CardGrid>
      </Section>

      <Section background="muted" padding="md">
        <SectionHeader title="Vì sao học viên chọn FinnCenter?" centered />
        <FeatureList
          items={[
            {
              title: "Học tập thích ứng",
              description: "Bài kiểm tra đầu vào giúp học viên lựa chọn đúng trình độ.",
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
          stats={[
            { label: "Học viên đang học", value: "50K+", hint: "Trên mọi lộ trình ngôn ngữ" },
            { label: "Khóa học đang mở", value: `${courses.length}+`, hint: "Cập nhật hằng tuần" },
            { label: "Giảng viên nổi bật", value: String(teachers.length), hint: "Giảng viên giàu kinh nghiệm" },
            { label: "Ngôn ngữ", value: String(LANGUAGES.length), hint: "Anh, Trung, Nhật, Hàn" },
          ]}
        />
      </Section>

      <Section background="muted" padding="md">
        <SectionHeader title="Giảng viên nổi bật" subtitle="Đội ngũ giàu kinh nghiệm, giảng dạy thực tế và bám sát mục tiêu." />
        <CardGrid cols={4} gap="md">
          {teachers.map((teacher) => (
            <GridCard
              key={teacher}
              title={teacher}
              description="Giảng viên ngoại ngữ"
              badge="Cố vấn"
              footer={<Link href="/teachers" className="text-sm font-semibold text-primary">Xem hồ sơ</Link>}
            />
          ))}
        </CardGrid>
      </Section>
    </main>
  );
}
