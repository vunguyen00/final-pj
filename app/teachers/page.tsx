import { Badge, BadgeGroup } from "@/components/base/badge";
import { CardGrid } from "@/components/base/grid";
import { Section, SectionHeader } from "@/components/base/section";
import { formatCount, getPublicTeachers } from "@/lib/public-teachers";

export default async function TeachersPage() {
  const teachers = await getPublicTeachers();

  return (
    <main className="min-h-screen bg-background">
      <Section background="muted" padding="md">
        <SectionHeader
          title="Đội ngũ giảng viên"
          subtitle="Gặp gỡ các giảng viên hiện có trong hệ thống FinnCenter."
        />

        {teachers.length > 0 ? (
          <CardGrid cols={3} gap="md">
            {teachers.map((teacher) => (
              <article
                key={teacher.id}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {teacher.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground">{teacher.name}</h3>
                    <p className="text-sm text-muted-foreground">{teacher.title}</p>
                    {teacher.badges.length > 0 ? (
                      <BadgeGroup className="mt-2">
                        {teacher.badges.map((badge) => (
                          <Badge key={badge} className="bg-secondary text-secondary-foreground">
                            {badge}
                          </Badge>
                        ))}
                      </BadgeGroup>
                    ) : null}
                  </div>
                </div>

                <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{teacher.summary}</p>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{formatCount(teacher.studentsCount)} học viên</span>
                    <span>{formatCount(teacher.coursesCount)} khóa học</span>
                  </div>
                  <span className="font-medium text-primary">Giảng viên</span>
                </div>
              </article>
            ))}
          </CardGrid>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Chưa có giảng viên trong hệ thống.
          </div>
        )}
      </Section>
    </main>
  );
}
