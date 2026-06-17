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
    name: "Nguyễn Văn A",
    avatar: "NVA",
    title: "Thạc sĩ Ngôn ngữ học",
    longBio:
      "Thầy Nguyễn Văn A là một trong những giảng viên tiếng Anh giàu kinh nghiệm, đã giảng dạy hơn 5.000 học viên. Phương pháp giảng dạy tập trung vào giao tiếp tự nhiên và ứng dụng thực tế.",
    specialties: ["Kỹ năng nói", "Giao tiếp", "Phát âm"],
    students: 5000,
    rating: 4.9,
    courses: [
      { id: "1", title: "Tiếng Anh giao tiếp cơ bản", students: 1250, rating: 4.8 },
      { id: "5", title: "Tiếng Anh thương mại cho người đi làm", students: 450, rating: 4.9 },
    ],
    social: { email: "nguyenvana@finncenter.name.vn", linkedin: "linkedin.com/in/nguyenvana" },
  },
  "2": {
    id: "2",
    name: "Trần Thị B",
    avatar: "TTB",
    title: "Giảng viên IELTS",
    longBio:
      "Cô Trần Thị B có 12 năm kinh nghiệm luyện thi IELTS và đã đồng hành cùng hàng nghìn học viên chinh phục mục tiêu Band 7+.",
    specialties: ["Viết IELTS", "Nói IELTS"],
    students: 4200,
    rating: 4.8,
    courses: [
      { id: "2", title: "IELTS Writing Band 7+", students: 890, rating: 4.9 },
      { id: "6", title: "Luyện thi TOEFL iBT", students: 380, rating: 4.8 },
    ],
    social: { email: "tranthib@finncenter.name.vn" },
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
                <span>{teacher.rating} điểm đánh giá</span>
                <span>{teacher.students.toLocaleString("vi-VN")} học viên</span>
                <span>{teacher.courses.length} khóa học</span>
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
              <SectionHeader title="Giới thiệu" className="mb-3" />
              <p className="leading-relaxed text-muted-foreground">{teacher.longBio}</p>
            </article>

            <article className="rounded-xl border border-border bg-card p-6">
              <SectionHeader title="Khóa học của giảng viên" className="mb-3" />
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
                        {course.students.toLocaleString("vi-VN")} học viên - {course.rating} điểm đánh giá
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary">Xem</span>
                  </Link>
                ))}
              </div>
            </article>
          </div>

          <aside className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">Liên hệ</h3>
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
