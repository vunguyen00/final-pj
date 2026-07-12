import { CardGrid } from "@/components/base/grid";
import { Section, SectionHeader } from "@/components/base/section";
import { prisma } from "@/lib/prisma";

type RankedStudent = {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  score: number;
  passedTests: number;
  courses: number;
  aiUses: number;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

async function getTopStudents(): Promise<RankedStudent[]> {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", isBanned: false, accountStatus: "ACTIVE" },
    select: {
      id: true,
      username: true,
      enrollments: { select: { id: true } },
      testAttempts: {
        where: { isPassed: true },
        select: { id: true },
      },
      aiAssessments: { select: { id: true } },
      learningActivities: { select: { id: true } },
    },
    take: 100,
  });

  return students
    .reduce<Omit<RankedStudent, "rank">[]>((items, student) => {
      const passedTests = student.testAttempts.length;
      const courses = student.enrollments.length;
      const aiUses = student.aiAssessments.length;
      const activities = student.learningActivities.length;
      const score = passedTests * 100 + courses * 40 + aiUses * 10 + activities * 5;
      if (score <= 0) return items;
      items.push({
        id: student.id,
        name: student.username,
        avatar: initials(student.username) || "HV",
        score,
        passedTests,
        courses,
        aiUses,
      });
      return items;
    }, [])
    .sort((a, b) => b.score - a.score || b.passedTests - a.passedTests || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((student, index) => ({ ...student, rank: index + 1 }));
}

export default async function TopStudentsPage() {
  const topStudents = await getTopStudents();

  return (
    <main className="min-h-screen bg-background">
      <Section background="muted" padding="md">
        <SectionHeader title="Học viên xuất sắc" subtitle="Bảng xếp hạng dựa trên tiến độ học, bài test đã đạt và hoạt động luyện tập AI." />

        {topStudents.length > 0 ? (
          <>
            <CardGrid cols={3} gap="md" className="mb-8">
              {topStudents.slice(0, 3).map((student) => (
                <article key={student.id} className="rounded-xl border border-border bg-card p-5 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
                    {student.avatar}
                  </div>
                  <p className="mt-4 text-lg font-semibold text-foreground">#{student.rank} {student.name}</p>
                  <p className="text-sm text-muted-foreground">{student.score.toLocaleString("vi-VN")} điểm hoạt động</p>
                </article>
              ))}
            </CardGrid>

            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hạng</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Học viên</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Điểm</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bài đạt</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Khóa học</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lượt AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">#{student.rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                            {student.avatar}
                          </div>
                          <span className="font-medium text-foreground">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{student.score.toLocaleString("vi-VN")}</td>
                      <td className="px-4 py-3 text-center text-sm text-muted-foreground">{student.passedTests}</td>
                      <td className="px-4 py-3 text-center text-sm text-muted-foreground">{student.courses}</td>
                      <td className="px-4 py-3 text-center text-sm text-muted-foreground">{student.aiUses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Chưa có đủ dữ liệu hoạt động để xếp hạng học viên.
          </div>
        )}
      </Section>
    </main>
  );
}
