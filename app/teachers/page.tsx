import Link from "next/link";
import { Badge, BadgeGroup } from "@/components/base/badge";
import { CardGrid } from "@/components/base/grid";
import { Section, SectionHeader } from "@/components/base/section";

const teachers = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    avatar: "NVA",
    title: "Thạc sĩ Ngôn ngữ học",
    bio: "10 năm kinh nghiệm giảng dạy tiếng Anh. Chuyên gia về kỹ năng nói và giao tiếp.",
    specialties: ["Kỹ năng nói", "Giao tiếp"],
    students: 5000,
    rating: 4.9,
    courses: 5,
  },
  {
    id: "2",
    name: "Trần Thị B",
    avatar: "TTB",
    title: "Giảng viên IELTS",
    bio: "12 năm kinh nghiệm luyện thi IELTS. Chuyên gia kỹ năng viết và nói.",
    specialties: ["Viết IELTS", "Nói IELTS"],
    students: 4200,
    rating: 4.8,
    courses: 4,
  },
  {
    id: "3",
    name: "Lê Văn C",
    avatar: "LVC",
    title: "Thạc sĩ Sư phạm Anh",
    bio: "Chuyên gia về kỹ năng đọc và từ vựng. Phương pháp giảng dạy dễ hiểu, hiệu quả.",
    specialties: ["Kỹ năng đọc", "Từ vựng"],
    students: 3800,
    rating: 4.7,
    courses: 3,
  },
  {
    id: "4",
    name: "Phạm Thị D",
    avatar: "PTD",
    title: "Giảng viên kỹ năng nghe",
    bio: "Chuyên gia về kỹ năng nghe và phát âm.",
    specialties: ["Kỹ năng nghe", "Phát âm"],
    students: 2900,
    rating: 4.8,
    courses: 3,
  },
  {
    id: "5",
    name: "Hoàng Văn E",
    avatar: "HVE",
    title: "Giảng viên tiếng Anh thương mại",
    bio: "Có 8 năm kinh nghiệm đào tạo tiếng Anh cho doanh nghiệp.",
    specialties: ["Tiếng Anh thương mại", "Giao tiếp công sở"],
    students: 2100,
    rating: 4.9,
    courses: 2,
  },
  {
    id: "6",
    name: "Vũ Thị F",
    avatar: "VTF",
    title: "Giảng viên ngữ pháp",
    bio: "Chuyên gia ngữ pháp tiếng Anh với phương pháp giảng dạy có hệ thống, dễ áp dụng.",
    specialties: ["Ngữ pháp", "Viết cơ bản"],
    students: 3500,
    rating: 4.6,
    courses: 4,
  },
];

export default function TeachersPage() {
  return (
    <main className="min-h-screen bg-background">
      <Section background="muted" padding="md">
        <SectionHeader
          title="Đội ngũ giảng viên"
          subtitle="Gặp gỡ các giảng viên giàu kinh nghiệm của LearnHub."
        />

        <CardGrid cols={3} gap="md">
          {teachers.map((teacher) => (
            <Link
              key={teacher.id}
              href={`/teachers/${teacher.id}`}
              className="group block rounded-xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {teacher.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary">{teacher.name}</h3>
                  <p className="text-sm text-muted-foreground">{teacher.title}</p>
                  <BadgeGroup className="mt-2">
                    {teacher.specialties.map((spec) => (
                      <Badge key={spec} className="bg-secondary text-secondary-foreground">
                        {spec}
                      </Badge>
                    ))}
                  </BadgeGroup>
                </div>
              </div>

              <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{teacher.bio}</p>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{teacher.rating} điểm đánh giá</span>
                  <span>{teacher.students.toLocaleString("vi-VN")} học viên</span>
                </div>
                <span className="font-medium text-primary">{teacher.courses} khóa học</span>
              </div>
            </Link>
          ))}
        </CardGrid>
      </Section>
    </main>
  );
}
