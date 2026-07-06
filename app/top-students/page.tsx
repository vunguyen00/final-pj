import Link from "next/link";
import { CardGrid } from "@/components/base/grid";
import { Section, SectionHeader } from "@/components/base/section";

const topStudents = [
  { rank: 1, id: "1", name: "Nguyễn Minh Hoàng", avatar: "NH", points: 9850, streak: 45, courses: 12, certificates: 10 },
  { rank: 2, id: "2", name: "Trần Lan Anh", avatar: "TA", points: 9200, streak: 38, courses: 10, certificates: 8 },
  { rank: 3, id: "3", name: "Lê Đức Phong", avatar: "LP", points: 8900, streak: 32, courses: 9, certificates: 7 },
  { rank: 4, id: "4", name: "Vũ Thảo My", avatar: "VM", points: 8650, streak: 28, courses: 8, certificates: 6 },
  { rank: 5, id: "5", name: "Hoàng Gia Huy", avatar: "HG", points: 8400, streak: 25, courses: 7, certificates: 5 },
  { rank: 6, id: "6", name: "Đặng Minh Quân", avatar: "DMQ", points: 8100, streak: 22, courses: 7, certificates: 5 },
  { rank: 7, id: "7", name: "Phạm Ngọc Linh", avatar: "PNL", points: 7800, streak: 20, courses: 6, certificates: 4 },
  { rank: 8, id: "8", name: "Ngô Thị Hương", avatar: "NTH", points: 7500, streak: 18, courses: 6, certificates: 4 },
  { rank: 9, id: "9", name: "Bùi Đình Minh", avatar: "BDM", points: 7200, streak: 15, courses: 5, certificates: 3 },
  { rank: 10, id: "10", name: "Lý Thị Mai", avatar: "LTM", points: 6900, streak: 12, courses: 5, certificates: 3 },
];

export default function TopStudentsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Section background="muted" padding="md">
        <SectionHeader title="Học viên xuất sắc" subtitle="Bảng xếp hạng học viên có thành tích cao nhất tại FinnCenter." />

        <CardGrid cols={3} gap="md" className="mb-8">
          {topStudents.slice(0, 3).map((student) => (
            <article key={student.id} className="rounded-xl border border-border bg-card p-5 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
                {student.avatar}
              </div>
              <p className="mt-4 text-lg font-semibold text-foreground">#{student.rank} {student.name}</p>
              <p className="text-sm text-muted-foreground">{student.points.toLocaleString()} điểm</p>
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
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Streak</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Khóa học</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chứng chỉ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topStudents.map((student) => (
                <tr key={student.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">#{student.rank}</td>
                  <td className="px-4 py-3">
                    <Link href={`/students/${student.id}`} className="flex items-center gap-3 hover:text-primary">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {student.avatar}
                      </div>
                      <span className="font-medium text-foreground">{student.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{student.points.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">{student.streak} ngày</td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">{student.courses}</td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">{student.certificates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}
