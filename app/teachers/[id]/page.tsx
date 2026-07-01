import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BadgeGroup } from "@/components/base/badge";
import { Section, SectionHeader } from "@/components/base/section";
import { formatCount, getPublicTeacherDetail } from "@/lib/public-teachers";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeacherDetailPage({ params }: Props) {
  const { id } = await params;
  const teacher = await getPublicTeacherDetail(id);

  if (!teacher) notFound();

  return (
    <main className="min-h-screen bg-background">
      <Section padding="md">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary">
              {teacher.avatar}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-foreground">{teacher.name}</h1>
              <p className="text-muted-foreground">{teacher.title}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{formatCount(teacher.studentsCount)} lượt đăng ký</span>
                <span>{formatCount(teacher.coursesCount)} khóa học hiện tại</span>
              </div>
              {teacher.badges.length > 0 ? (
                <BadgeGroup className="mt-3">
                  {teacher.badges.map((badge) => (
                    <Badge key={badge}>{badge}</Badge>
                  ))}
                </BadgeGroup>
              ) : null}
            </div>
          </div>
        </div>
      </Section>

      <Section background="muted" padding="md">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <article className="rounded-xl border border-border bg-card p-6">
              <SectionHeader title="Hồ sơ giảng viên" className="mb-3" />
              <p className="leading-relaxed text-muted-foreground">{teacher.summary}</p>
            </article>

            <article className="rounded-xl border border-border bg-card p-6">
              <SectionHeader title="Khóa học nổi bật" className="mb-3" />
              <div className="space-y-3">
                {teacher.topCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="grid gap-4 rounded-lg border border-border p-4 transition hover:bg-muted sm:grid-cols-[120px_1fr]"
                  >
                    <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-semibold text-muted-foreground">
                          {course.language || "FinnCenter"}
                        </div>
                      )}
                    </div>
                    <div>
                      <BadgeGroup>
                        {course.language ? <Badge>{course.language}</Badge> : null}
                        {course.category ? <Badge className="bg-secondary text-secondary-foreground">{course.category}</Badge> : null}
                      </BadgeGroup>
                      <h3 className="mt-2 font-medium text-foreground">{course.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatCount(course.studentsCount)} lượt đăng ký - {course.averageRating > 0 ? course.averageRating.toFixed(1) : "Chưa có"} sao ({formatCount(course.reviewsCount)} đánh giá)
                      </p>
                    </div>
                  </Link>
                ))}
                {teacher.topCourses.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Giảng viên chưa có khóa học đang mở.
                  </p>
                ) : null}
              </div>
            </article>
          </div>

          <aside className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">Thống kê</h3>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Email: {teacher.email}</p>
              <p>Tổng lượt đăng ký: {formatCount(teacher.studentsCount)}</p>
              <p>Khóa học hiện tại: {formatCount(teacher.coursesCount)}</p>
            </div>
          </aside>
        </div>
      </Section>
    </main>
  );
}
