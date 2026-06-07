import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, BadgeGroup } from "@/components/base/badge";
import { FeatureList, Stats } from "@/components/base/content";
import { CardGrid, GridCard } from "@/components/base/grid";
import { Hero } from "@/components/base/hero";
import { Section, SectionHeader } from "@/components/base/section";
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

export default async function HomePage() {
  const courses = await getHomeCourses();
  const featured = courses.slice(0, 4);

  return (
    <main className="min-h-screen bg-background">
      <Hero
        subtitle="Multi-language marketplace and LMS"
        title="Build your language path with LearnHub"
        description="Courses, combo paths, skill training, vocabulary packs, mock tests, and certification prep for English, Chinese, Japanese, and Korean."
        primaryAction={{ label: "Explore courses", href: "/courses" }}
        secondaryAction={{ label: "Take placement test", href: "/student/tests" }}
      />

      <Section padding="lg">
        <SectionHeader
          title="Featured courses"
          subtitle="Popular learning paths across language goals."
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
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">{getCourseLanguage(course)}</div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <BadgeGroup>
                  <Badge>{getCourseLanguage(course)}</Badge>
                  <Badge className="bg-muted text-muted-foreground">{getCourseType(course)}</Badge>
                </BadgeGroup>
                <h3 className="line-clamp-2 text-lg font-semibold text-foreground">{course.name}</h3>
                <p className="text-sm text-muted-foreground">{course.instructor?.username || "Teacher"} - {course._count.enrollments} learners</p>
                <p className="text-base font-semibold text-primary">{priceLabel(course.price)}</p>
              </div>
            </Link>
          ))}
        </CardGrid>
      </Section>

      <Section background="muted" padding="md">
        <SectionHeader title="Why learners choose LearnHub" centered />
        <FeatureList
          items={[
            {
              title: "Adaptive learning",
              description: "Placement tests and diagnostics connect learners to the right level.",
            },
            {
              title: "Marketplace choice",
              description: "Single courses, combos, certification prep, vocabulary, and mock tests in one catalog.",
            },
            {
              title: "LMS tracking",
              description: "Progress, schedules, course content, and review queues stay connected.",
            },
          ]}
        />
      </Section>

      <Section padding="md">
        <Stats
          stats={[
            { label: "Active students", value: "50K+", hint: "Across all language tracks" },
            { label: "Live courses", value: `${courses.length}+`, hint: "Updated weekly" },
            { label: "Top teachers", value: String(teachers.length), hint: "Industry mentors" },
            { label: "Languages", value: String(LANGUAGES.length), hint: "English, Chinese, Japanese, Korean" },
          ]}
        />
      </Section>

      <Section background="muted" padding="md">
        <SectionHeader title="Top teachers" subtitle="Experienced instructors leading practical, goal-based learning." />
        <CardGrid cols={4} gap="md">
          {teachers.map((teacher) => (
            <GridCard
              key={teacher}
              title={teacher}
              description="Language coach"
              badge="Mentor"
              footer={<Link href="/teachers" className="text-sm font-semibold text-primary">View profile</Link>}
            />
          ))}
        </CardGrid>
      </Section>
    </main>
  );
}
