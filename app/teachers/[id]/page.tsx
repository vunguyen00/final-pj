import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BadgeGroup } from "@/components/base/badge";
import { Section, SectionHeader } from "@/components/base/section";

const teachersData: Record<
  string,
  {
    id: string;
    name: string;
    avatar: string;
    title: string;
    longBio: string;
    specialties: string[];
    students: number;
    rating: number;
    courses: { id: string; title: string; students: number; rating: number }[];
    social: { email: string; linkedin?: string };
  }
> = {
  "1": {
    id: "1",
    name: "Nguyen Van A",
    avatar: "NVA",
    title: "Thac si Ngon ngu hoc",
    longBio:
      "Thay Nguyen Van A la mot trong nhung giang vien tieng Anh co kinh nghiem da day hon 5000 hoc vien. Phuong phap giang day tap trung vao giao tiep tu nhien va ap dung thuc te.",
    specialties: ["Speaking", "Giao tiep", "Phat am"],
    students: 5000,
    rating: 4.9,
    courses: [
      { id: "1", title: "Tieng Anh Giao tiep co ban", students: 1250, rating: 4.8 },
      { id: "5", title: "Business English cho nguoi di lam", students: 450, rating: 4.9 },
    ],
    social: { email: "nguyenvana@learnhub.com", linkedin: "linkedin.com/in/nguyenvana" },
  },
  "2": {
    id: "2",
    name: "Tran Thi B",
    avatar: "TTB",
    title: "Giang vien IELTS",
    longBio:
      "Co Tran Thi B co 12 nam kinh nghiem luyen thi IELTS va da dong hanh cung hang nghin hoc vien trong muc tieu Band 7+.",
    specialties: ["IELTS Writing", "IELTS Speaking"],
    students: 4200,
    rating: 4.8,
    courses: [
      { id: "2", title: "IELTS Writing Band 7+", students: 890, rating: 4.9 },
      { id: "6", title: "TOEFL iBT Preparation", students: 380, rating: 4.8 },
    ],
    social: { email: "tranthib@learnhub.com" },
  },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeacherDetailPage({ params }: Props) {
  const { id } = await params;
  const teacher = teachersData[id];

  if (!teacher) {
    notFound();
  }

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
                <span>{teacher.rating} rating</span>
                <span>{teacher.students.toLocaleString()} hoc vien</span>
                <span>{teacher.courses.length} khoa hoc</span>
              </div>
              <BadgeGroup className="mt-3">
                {teacher.specialties.map((spec) => (
                  <Badge key={spec}>{spec}</Badge>
                ))}
              </BadgeGroup>
            </div>
          </div>
        </div>
      </Section>

      <Section background="muted" padding="md">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <article className="rounded-xl border border-border bg-card p-6">
              <SectionHeader title="Gioi thieu" className="mb-3" />
              <p className="leading-relaxed text-muted-foreground">{teacher.longBio}</p>
            </article>

            <article className="rounded-xl border border-border bg-card p-6">
              <SectionHeader title="Khoa hoc cua giang vien" className="mb-3" />
              <div className="space-y-3">
                {teacher.courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted"
                  >
                    <div>
                      <h3 className="font-medium text-foreground">{course.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {course.students} hoc vien - {course.rating} rating
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary">Xem</span>
                  </Link>
                ))}
              </div>
            </article>
          </div>

          <aside className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">Lien he</h3>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>{teacher.social.email}</p>
              {teacher.social.linkedin ? <p>{teacher.social.linkedin}</p> : null}
            </div>
          </aside>
        </div>
      </Section>
    </main>
  );
}
