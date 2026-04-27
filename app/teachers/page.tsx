import Link from "next/link";

// Mock teachers data
const teachers = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    avatar: "NVA",
    title: "Thạc sĩ Ngôn ngữ học",
    bio: "10 năm kinh nghiệm giảng dạy tiếng Anh. Chuyên gia về Speaking và Giao tiếp.",
    specialties: ["Speaking", "Giao tiếp"],
    students: 5000,
    rating: 4.9,
    courses: 5,
  },
  {
    id: "2",
    name: "Trần Thị B",
    avatar: "TTB",
    title: "Giảng viên IELTS",
    bio: "12 năm kinh nghiệm luyện thi IELTS. Chuyên gia Writing và Speaking.",
    specialties: ["IELTS Writing", "IELTS Speaking"],
    students: 4200,
    rating: 4.8,
    courses: 4,
  },
  {
    id: "3",
    name: "Lê Văn C",
    avatar: "LVC",
    title: "Thạc sĩ Sư phạm Anh",
    bio: "Chuyên gia về Reading và Vocabulary. Phương pháp giảng dạy hiệu quả.",
    specialties: ["Reading", "Từ vựng"],
    students: 3800,
    rating: 4.7,
    courses: 3,
  },
  {
    id: "4",
    name: "Phạm Thị D",
    avatar: "PTD",
    title: "Giảng viên Listening",
    bio: "Chuyên gia về Listening và Pronunciation. Giúp học viên cải thiện kỹ năng nghe.",
    specialties: ["Listening", "Phát âm"],
    students: 2900,
    rating: 4.8,
    courses: 3,
  },
  {
    id: "5",
    name: "Hoàng Văn E",
    avatar: "HVE",
    title: "Giảng viên Business English",
    bio: "Chuyên gia tiếng Anh thương mại. Kinh nghiệm 8 năm đào tạo doanh nghiệp.",
    specialties: ["Business English", "Giao tiếp công sở"],
    students: 2100,
    rating: 4.9,
    courses: 2,
  },
  {
    id: "6",
    name: "Vũ Thị F",
    avatar: "VTF",
    title: "Giảng viên Grammar",
    bio: "Chuyên gia ngữ pháp tiếng Anh. Phương pháp giảng dạy dễ hiểu, sinh động.",
    specialties: ["Ngữ pháp", "Writing cơ bản"],
    students: 3500,
    rating: 4.6,
    courses: 4,
  },
];

export default function TeachersPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Đội ngũ giảng viên</h1>
          <p className="mt-2 text-slate-600">Gặp gỡ các giảng viên giàu kinh nghiệm của LearnHub</p>
        </div>

        {/* Teachers Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <Link
              key={teacher.id}
              href={`/teachers/${teacher.id}`}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xl font-bold text-white">
                  {teacher.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
                    {teacher.name}
                  </h3>
                  <p className="text-sm text-slate-500">{teacher.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {teacher.specialties.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <p className="mt-4 text-sm text-slate-600 line-clamp-2">
                {teacher.bio}
              </p>
              
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-slate-500">
                    <span className="text-yellow-500">★</span>
                    {teacher.rating}
                  </span>
                  <span className="text-slate-500">
                    {teacher.students.toLocaleString()} học viên
                  </span>
                </div>
                <span className="font-medium text-blue-600">
                  {teacher.courses} khóa học
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}