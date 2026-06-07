import Link from "next/link";
import { Badge, BadgeGroup } from "@/components/base/badge";
import { CardGrid } from "@/components/base/grid";
import { Section, SectionHeader } from "@/components/base/section";

const teachers = [
  {
    id: "1",
    name: "Nguyen Van A",
    avatar: "NVA",
    title: "Thac si Ngon ngu hoc",
    bio: "10 nam kinh nghiem giang day tieng Anh. Chuyen gia ve Speaking va Giao tiep.",
    specialties: ["Speaking", "Giao tiep"],
    students: 5000,
    rating: 4.9,
    courses: 5,
  },
  {
    id: "2",
    name: "Tran Thi B",
    avatar: "TTB",
    title: "Giang vien IELTS",
    bio: "12 nam kinh nghiem luyen thi IELTS. Chuyen gia Writing va Speaking.",
    specialties: ["IELTS Writing", "IELTS Speaking"],
    students: 4200,
    rating: 4.8,
    courses: 4,
  },
  {
    id: "3",
    name: "Le Van C",
    avatar: "LVC",
    title: "Thac si Su pham Anh",
    bio: "Chuyen gia ve Reading va Vocabulary. Phuong phap giang day de hieu, hieu qua.",
    specialties: ["Reading", "Tu vung"],
    students: 3800,
    rating: 4.7,
    courses: 3,
  },
  {
    id: "4",
    name: "Pham Thi D",
    avatar: "PTD",
    title: "Giang vien Listening",
    bio: "Chuyen gia ve Listening va Pronunciation.",
    specialties: ["Listening", "Phat am"],
    students: 2900,
    rating: 4.8,
    courses: 3,
  },
  {
    id: "5",
    name: "Hoang Van E",
    avatar: "HVE",
    title: "Giang vien Business English",
    bio: "Kinh nghiem 8 nam dao tao doanh nghiep.",
    specialties: ["Business English", "Cong so"],
    students: 2100,
    rating: 4.9,
    courses: 2,
  },
  {
    id: "6",
    name: "Vu Thi F",
    avatar: "VTF",
    title: "Giang vien Grammar",
    bio: "Chuyen gia ngu phap tieng Anh voi cach day he thong, de ap dung.",
    specialties: ["Ngu phap", "Writing co ban"],
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
          title="Doi ngu giang vien"
          subtitle="Gap go cac giang vien giau kinh nghiem cua LearnHub."
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
                  <span>{teacher.rating} rating</span>
                  <span>{teacher.students.toLocaleString()} hoc vien</span>
                </div>
                <span className="font-medium text-primary">{teacher.courses} khoa hoc</span>
              </div>
            </Link>
          ))}
        </CardGrid>
      </Section>
    </main>
  );
}
