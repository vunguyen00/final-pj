import Link from "next/link";

// Mock data for courses
const courses = [
  {
    id: "1",
    title: "Tiếng Anh Giao Tiếp Cơ Bản",
    description: "Học cách giao tiếp cơ bản trong các tình huống thường ngày. Phù hợp cho người mới bắt đầu.",
    thumbnail: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=300&fit=crop",
    instructor: { id: "1", name: "Nguyễn Văn A" },
    price: 299000,
    students: 1250,
    rating: 4.8,
    category: "Speaking",
    duration: "8 tuần",
    lessons: 24,
  },
  {
    id: "2",
    title: "IELTS Writing Band 7+",
    description: "Luyện viết IELTS với chiến lược và template hiệu quả. Hướng dẫn chi tiết từng phần.",
    thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop",
    instructor: { id: "2", name: "Trần Thị B" },
    price: 499000,
    students: 890,
    rating: 4.9,
    category: "Writing",
    duration: "12 tuần",
    lessons: 36,
  },
  {
    id: "3",
    title: "Reading Comprehension Nâng Cao",
    description: "Kỹ năng đọc hiểu và tốc độ đọc cho người học nâng cao. Luyện tập với 200+ bài đọc.",
    thumbnail: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop",
    instructor: { id: "3", name: "Lê Văn C" },
    price: 399000,
    students: 650,
    rating: 4.7,
    category: "Reading",
    duration: "10 tuần",
    lessons: 30,
  },
  {
    id: "4",
    title: "Listening & Dictation Master",
    description: "Luyện nghe và nghe chính tả từ cơ bản đến nâng cao. Cải thiện kỹ năng nghe nhanh chóng.",
    thumbnail: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=300&fit=crop",
    instructor: { id: "4", name: "Phạm Thị D" },
    price: 349000,
    students: 720,
    rating: 4.6,
    category: "Listening",
    duration: "8 tuần",
    lessons: 24,
  },
  {
    id: "5",
    title: "Business English Cho Người Đi Làm",
    description: "Tiếng Anh thương mại cho môi trường công sở. Giao tiếp chuyên nghiệp trong công việc.",
    thumbnail: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop",
    instructor: { id: "1", name: "Nguyễn Văn A" },
    price: 599000,
    students: 450,
    rating: 4.9,
    category: "Speaking",
    duration: "16 tuần",
    lessons: 48,
  },
  {
    id: "6",
    title: "TOEFL iBT Preparation",
    description: "Luyện thi TOEFL iBT với phương pháp hiện đại. Đạt điểm cao trong kỳ thi.",
    thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop",
    instructor: { id: "2", name: "Trần Thị B" },
    price: 699000,
    students: 380,
    rating: 4.8,
    category: "Writing",
    duration: "20 tuần",
    lessons: 60,
  },
];

const categories = ["Tất cả", "Speaking", "Writing", "Reading", "Listening"];

export default function CoursesPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Danh sách khóa học</h1>
          <p className="mt-2 text-slate-600">Khám phá các khóa học tiếng Anh chất lượng cao</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                cat === "Tất cả"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Course Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
                  {course.category}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600">
                  {course.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                  {course.description}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span>⏱ {course.duration}</span>
                  <span>•</span>
                  <span>📚 {course.lessons} bài</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-yellow-500">★</span>
                    <span className="text-sm font-medium text-slate-900">{course.rating}</span>
                    <span className="text-xs text-slate-500">({course.students})</span>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">
                    {course.price.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}