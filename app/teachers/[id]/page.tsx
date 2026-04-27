import Link from "next/link";
import { notFound } from "next/navigation";

// Mock teachers data
const teachersData: Record<string, {
  id: string;
  name: string;
  avatar: string;
  title: string;
  bio: string;
  longBio: string;
  specialties: string[];
  students: number;
  rating: number;
  courses: { id: string; title: string; students: number; rating: number }[];
  social: { email: string; linkedin?: string };
}> = {
  "1": {
    id: "1",
    name: "Nguyễn Văn A",
    avatar: "NVA",
    title: "Thạc sĩ Ngôn ngữ học",
    bio: "10 năm kinh nghiệm giảng dạy tiếng Anh. Chuyên gia về Speaking và Giao tiếp.",
    longBio: "Thầy Nguyễn Văn A là một trong những giảng viên tiếng Anh hàng đầu tại Việt Nam với hơn 10 năm kinh nghiệm giảng dạy. Thầy tốt nghiệp Thạc sĩ Ngôn ngữ học tại Đại học Quốc gia Hà Nội và đã hoàn thành chương trình TESOL tại Úc.\n\nTrong suốt sự nghiệp, thầy đã đào tạo hơn 5000 học viên, trong đó nhiều người đã đạt được mục tiêu tiếng Anh của mình với các chứng chỉ quốc tế như IELTS, TOEIC, TOEFL. Phương pháp giảng dạy của thầy tập trung vào việc tạo môi trường học tập tự nhiên và thực tế, giúp học viên có thể áp dụng ngay những gì học được vào giao tiếp hàng ngày.",
    specialties: ["Speaking", "Giao tiếp", "Phát âm"],
    students: 5000,
    rating: 4.9,
    courses: [
      { id: "1", title: "Tiếng Anh Giao Tiếp Cơ Bản", students: 1250, rating: 4.8 },
      { id: "5", title: "Business English Cho Người Đi Làm", students: 450, rating: 4.9 },
    ],
    social: { email: "nguyenvana@learnhub.com", linkedin: "linkedin.com/in/nguyenvana" }
  },
  "2": {
    id: "2",
    name: "Trần Thị B",
    avatar: "TTB",
    title: "Giảng viên IELTS",
    bio: "12 năm kinh nghiệm luyện thi IELTS. Chuyên gia Writing và Speaking.",
    longBio: "Cô Trần Thị B là chuyên gia IELTS hàng đầu với 12 năm kinh nghiệm luyện thi. Cô đã giúp hàng trăm học viên đạt điểm Band 7+ trong kỳ thi IELTS. Với phương pháp giảng dạy khoa học và template được kiểm chứng, cô mang đến cho học viên những công cụ hiệu quả nhất để chinh phục kỳ thi IELTS.",
    specialties: ["IELTS Writing", "IELTS Speaking"],
    students: 4200,
    rating: 4.8,
    courses: [
      { id: "2", title: "IELTS Writing Band 7+", students: 890, rating: 4.9 },
      { id: "6", title: "TOEFL iBT Preparation", students: 380, rating: 4.8 },
    ],
    social: { email: "tranthib@learnhub.com" }
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
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Profile Card */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-shrink-0">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-4xl font-bold text-white">
                {teacher.avatar}
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">{teacher.name}</h1>
              <p className="text-lg text-slate-600">{teacher.title}</p>
              
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm">
                  <span className="text-yellow-500">★</span>
                  <span className="font-medium">{teacher.rating}</span>
                  <span className="text-slate-500">đánh giá</span>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm">
                  <span className="font-medium">{teacher.students.toLocaleString()}</span>
                  <span className="text-slate-500"> học viên</span>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm">
                  <span className="font-medium">{teacher.courses.length}</span>
                  <span className="text-slate-500"> khóa học</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {teacher.specialties.map((spec) => (
                  <span
                    key={spec}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* About */}
            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Giới thiệu</h2>
              <div className="mt-4 whitespace-pre-line text-slate-600">
                {teacher.longBio}
              </div>
            </section>

            {/* Courses */}
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Khóa học của giảng viên</h2>
              <div className="mt-4 space-y-4">
                {teacher.courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <h3 className="font-medium text-slate-900">{course.title}</h3>
                      <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                        <span>{course.students} học viên</span>
                        <span className="text-yellow-500">★ {course.rating}</span>
                      </div>
                    </div>
                    <span className="text-blue-600">Xem →</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div>
            <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">Liên hệ</h3>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-400">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {teacher.social.email}
                </div>
                {teacher.social.linkedin && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-400">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect x="2" y="9" width="4" height="12" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                    {teacher.social.linkedin}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}